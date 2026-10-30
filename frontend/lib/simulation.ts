import { create } from "zustand";
import { api, formatError } from "./api";
import { useLab } from "./store";
import { validateRun } from "./playback";
import type { SimulationRun } from "./types";

type Log = { at: number; level: "info" | "error"; message: string };
export const useSimulation = create<{
  status: "idle" | "running" | "succeeded" | "failed";
  duration: number;
  error: string;
  logs: Log[];
  setDuration: (n: number) => void;
  log: (message: string, level?: Log["level"]) => void;
}>((set) => ({
  status: "idle",
  duration: 6,
  error: "",
  logs: [],
  setDuration: (duration) => set({ duration }),
  log: (message, level = "info") =>
    set((s) => ({
      logs: [...s.logs.slice(-39), { at: Date.now(), level, message }],
    })),
}));

export function revealSimulationViewport() {
  if (window.innerWidth <= 900)
    document.querySelector<HTMLElement>(".scene-container")?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
}

/** One explicit solve at a time. Playback/replay never call this function. */
export async function executeExperiment() {
  if (useSimulation.getState().status === "running") return;
  const submitted = useLab.getState();
  if (!submitted.robot) return;
  const sim = useSimulation.getState();
  useSimulation.setState({ status: "running", error: "" });
  submitted.set({
    playing: false,
    section: "simulate",
    inspectionOffsets: {},
    transformMode: "off",
  });
  sim.log(
    `POST /api/simulate · ${sim.duration} simulated seconds · requesting backend CPU solve.`,
  );
  try {
    const result = await api<SimulationRun>("simulate", {
      robot: submitted.robot,
      task: submitted.task,
      hardware_id: submitted.hardwareId,
      duration_s: sim.duration,
      wheel_speed_rad_s: submitted.driveSpeed,
    });
    validateRun(result, submitted.robot.id);
    if (useLab.getState().robot !== submitted.robot)
      throw Error(
        "The design changed during execution. Result was not attached to the current robot.",
      );
    useLab.getState().set({
      runs: [...useLab.getState().runs.slice(-19), result],
      playhead: 0,
      playing: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
    useSimulation.setState({ status: "succeeded" });
    revealSimulationViewport();
    sim.log(
      `${result.engine} completed ${result.metrics.steps} steps in ${(result.metrics.wall_seconds * 1000).toFixed(1)} ms of solver time. ${result.frames.length} measured states received.`,
    );
    sim.log(
      "Playback uses recorded solver states. Assigned missions and GPU hardware were not benchmarked.",
    );
    return result;
  } catch (e) {
    const error = formatError(e);
    useSimulation.setState({ status: "failed", error });
    sim.log(error, "error");
    throw e;
  }
}
