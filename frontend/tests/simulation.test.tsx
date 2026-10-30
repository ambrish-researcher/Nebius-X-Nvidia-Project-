import { act, cleanup, render } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import recording from "../../e2e/fixtures/generated/rover.json";
import { useLab } from "../lib/store";
import { useSimulation, executeExperiment } from "../lib/simulation";
import { frameAtTime, validateRun } from "../lib/playback";
import { renderingAcceleration } from "../lib/renderer";
import { PlaybackClock } from "../components/playback-clock";
import { api } from "../lib/api";
import type { RobotSpec, SimulationRun } from "../lib/types";
vi.mock("../lib/api", () => ({
  api: vi.fn(),
  formatError: (e: Error) => e.message,
}));

const robot = recording.response.robot as unknown as RobotSpec;
function measuredRun(): SimulationRun {
  return {
    id: "solver-run",
    robot_id: robot.id,
    engine: "MuJoCo test",
    experiment: "flat-floor-drive",
    hardware_id: "cpu",
    hardware_benchmarked: false,
    task_completed: null,
    outcome: "completed",
    limitations: [],
    metrics: {
      simulated_seconds: 1,
      wall_seconds: 0.02,
      displacement_m: 1,
      max_contact_count: 4,
      max_tilt_rad: 0,
      steps: 500,
    },
    frames: [0, 0.04, 0.5, 1].map((t) => ({
      t,
      position: [t, 0.03, 0],
      quaternion: [1, 0, 0, 0],
      joints: [t],
      velocity: [1, 0, 0],
      controller_output: [1],
      contacts: 4,
    })),
  };
}
beforeEach(() => {
  vi.mocked(api).mockReset();
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  useLab.getState().setRobot(robot, []);
  useLab.getState().set({ entered: true, section: "simulate", speed: 1 });
  useSimulation.setState({ status: "idle", duration: 6, error: "", logs: [] });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("selects recorded timestamps across irregular samples and clamps boundaries", () => {
  const frames = measuredRun().frames;
  expect(frameAtTime(frames, -1)).toBe(0);
  expect(frameAtTime(frames, 0.49)).toBe(1);
  expect(frameAtTime(frames, 0.75)).toBe(2);
  expect(frameAtTime(frames, 10)).toBe(3);
});
it("rejects wrong robot, non-monotonic time, and corrupt pose data", () => {
  expect(() => validateRun(measuredRun(), "other-robot")).toThrow();
  const nonmonotonic = measuredRun();
  nonmonotonic.frames[1].t = 0;
  expect(() => validateRun(nonmonotonic, robot.id)).toThrow();
  const corrupt = measuredRun();
  corrupt.frames[1].quaternion = [0, 0, 0, 0];
  expect(() => validateRun(corrupt, robot.id)).toThrow();
});
it("advances playback by elapsed time without a WebGL canvas and stops at completion", () => {
  let now = 0,
    next = 0;
  const callbacks = new Map<number, FrameRequestCallback>();
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callbacks.set(++next, callback);
    return next;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => callbacks.delete(id));
  useLab.getState().set({ runs: [measuredRun()], playing: true });
  render(<PlaybackClock />);
  const advance = (time: number) =>
    act(() => {
      now = time;
      const batch = [...callbacks.values()];
      callbacks.clear();
      batch.forEach((fn) => fn(time));
    });
  advance(750);
  expect(useLab.getState().playhead).toBe(2);
  advance(1500);
  expect(useLab.getState().playhead).toBe(3);
  expect(useLab.getState().playing).toBe(false);
  expect(api).not.toHaveBeenCalled();
});
it("prevents duplicate concurrent solver requests and clears inspection-only offsets", async () => {
  let finish!: (r: SimulationRun) => void;
  vi.mocked(api).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve as typeof finish;
      }),
  );
  useLab
    .getState()
    .set({
      transformMode: "translate",
      inspectionOffsets: { chassis: [1, 0, 0] },
    });
  const first = executeExperiment();
  await executeExperiment();
  expect(api).toHaveBeenCalledTimes(1);
  finish(measuredRun());
  await first;
  expect(useLab.getState().runs).toHaveLength(1);
  expect(useLab.getState().inspectionOffsets).toEqual({});
  expect(useLab.getState().playing).toBe(false);
  expect(useSimulation.getState().status).toBe("succeeded");
});
it("retains prior evidence when a solver request fails", async () => {
  useLab.getState().set({ runs: [measuredRun()] });
  vi.mocked(api).mockRejectedValueOnce(Error("Unsupported wheel geometry"));
  await expect(executeExperiment()).rejects.toThrow(
    "Unsupported wheel geometry",
  );
  expect(useLab.getState().runs).toHaveLength(1);
  expect(useSimulation.getState().status).toBe("failed");
  expect(useSimulation.getState().logs.at(-1)?.level).toBe("error");
});
it("does not attach returned states to a design changed during execution", async () => {
  vi.mocked(api).mockImplementationOnce(async () => {
    useLab.getState().setRobot({ ...robot, id: "different" }, []);
    return measuredRun();
  });
  await expect(executeExperiment()).rejects.toThrow("design changed");
  expect(useLab.getState().runs).toHaveLength(0);
});
it("reports software and hidden renderer information without claiming CUDA acceleration", () => {
  expect(renderingAcceleration("ANGLE Google SwiftShader")).toContain(
    "Software",
  );
  expect(renderingAcceleration("Not disclosed")).toContain("not disclosed");
  expect(renderingAcceleration("NVIDIA GeForce RTX")).toContain(
    "not benchmarked",
  );
});
