import { describe, it, expect, vi, afterEach } from "vitest";
import {
  useCinema,
  spherePose,
  introCameraPose,
  componentPose,
} from "../lib/cinema";
import { useLab } from "../lib/store";
import { api } from "../lib/api";
import { visualFixture } from "../lib/visual-fixtures";
import { hardwareFamilies } from "../lib/hardware-atlas";
import type { RobotSpec } from "../lib/types";
const robot = {
  id: "fixture",
  name: "Tiny teaching robot",
  purpose: "Learn",
  classification: "conceptual",
  components: [
    {
      id: "base",
      name: "Root frame",
      kind: "structure",
      depends_on: [],
      function: "Supports the system.",
      selection_reason: "Rigid mounting reference.",
    },
    {
      id: "camera",
      name: "Camera",
      kind: "sensor",
      depends_on: ["base"],
      function: "Observes images.",
      selection_reason: "Perception input.",
    },
  ],
  intended_tasks: ["Observe"],
  unsupported_assumptions: ["No camera inference benchmark."],
} as RobotSpec;
afterEach(() => {
  vi.unstubAllGlobals();
  useLab.getState().set({ visualPreview: false });
});
describe("deterministic cinematic timeline", () => {
  it("holds the sphere before throwing it towards the camera", () => {
    expect(spherePose("intro", 0)).toEqual(spherePose("intro", 3));
    expect(spherePose("intro", 6)[2]).toBeGreaterThan(6);
    expect(spherePose("intro", 6)[0]).toBe(0);
  });
  it("tracks the throw close to the actual camera path in both aspect ratios", () => {
    for (const portrait of [false, true]) {
      const distances = Array.from({ length: 281 }, (_, i) => {
        const t = 3.2 + i / 100,
          eye = introCameraPose(t, portrait),
          orb = spherePose("intro", t);
        return Math.hypot(...orb.map((n, j) => n - eye[j]));
      });
      expect(Math.min(...distances)).toBeLessThan(0.22);
    }
  });
  it("seeks, pauses, and samples identical assembly poses without accumulated drift", () => {
    useCinema.getState().start("transform", 5);
    useCinema.getState().seek(3);
    expect(useCinema.getState().paused).toBe(true);
    const a = componentPose([0.1, 0.2, 0.3], 2, 3, 7);
    useCinema.getState().seek(1);
    useCinema.getState().seek(3);
    expect(
      componentPose([0.1, 0.2, 0.3], 2, useCinema.getState().time, 7),
    ).toEqual(a);
  });
  it("allocates enough time for deep dependency graphs to assemble", () => {
    useCinema.getState().start("transform", 64);
    const duration = useCinema.getState().duration;
    expect(duration).toBeGreaterThan(9);
    expect(componentPose([1, 2, 3], 63, duration, 63).progress).toBeCloseTo(1);
    expect(componentPose([1, 2, 3], 63, duration, 63).position).toEqual([
      1, 2, 3,
    ]);
    useCinema.getState().seek(999);
    expect(useCinema.getState().time).toBe(duration);
  });
});
describe("labeled, cost-free visual fixtures", () => {
  it("grounds quiz choices and flashcards in actual components", () => {
    const q = visualFixture({ workflow: "quiz", robot, prompt: "Study" })
      .data as {
      questions: {
        choices: string[];
        correct_index: number;
        explanation: string;
      }[];
    };
    expect(q.questions[0].choices).toHaveLength(4);
    expect(q.questions[0].choices[q.questions[0].correct_index]).toBe("Camera");
    expect(q.questions[0].explanation).toContain("Observes images.");
    const cards = visualFixture({
      workflow: "flashcards",
      robot,
      prompt: "Study",
    }).data as { cards: { front: string; back: string }[] };
    expect(cards.cards[0].front).toBe("Root frame");
  });
  it("never invokes fetch or labels a fixture as a model response", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    useLab.getState().set({ visualPreview: true });
    const res = await api<{ fixture: boolean; model: string }>("ai", {
      workflow: "tutor",
      robot,
      prompt: "Explain",
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(res.fixture).toBe(true);
    expect(res.model).toBe("visual-fixture");
  });
  it("reads actual experiment metrics without inventing task completion", () => {
    const result = visualFixture({
      workflow: "analysis",
      robot,
      prompt: JSON.stringify({
        experiment: {
          metrics: { displacement_m: 0.25, simulated_seconds: 2 },
          limitations: ["No arbitrary task solver"],
        },
      }),
    });
    expect((result.data as { answer: string }).answer).toContain("0.250 m");
    expect((result.data as { answer: string }).answer).toContain(
      "not proof of task completion",
    );
  });
  it("distinguishes rack-scale architecture from a consumer GPU", () => {
    expect(hardwareFamilies.find((h) => h.id === "rubin")?.tradeoff).toContain(
      "not a standalone consumer GPU",
    );
    expect(hardwareFamilies.find((h) => h.id === "jetson")?.kind).toBe(
      "Edge module",
    );
  });
  it("tracks real inspection actions and persists supported controller inputs", () => {
    useLab.getState().setRobot(robot, []);
    useLab.getState().inspect("camera");
    useLab.getState().inspect("camera");
    useLab.getState().set({ driveSpeed: 2 });
    expect(useLab.getState().inspected).toEqual(["camera"]);
    expect(useLab.getState().project()?.inspected_components).toEqual([
      "camera",
    ]);
    expect(
      useLab.getState().project()?.controller_settings?.wheel_speed_rad_s,
    ).toBe(2);
  });
});
