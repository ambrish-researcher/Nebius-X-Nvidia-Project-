import { describe, it, expect } from "vitest";
import { ROBOTS, resolveRobot, taskPose, asRobotSpec } from "../lib/arise";
describe("three robot contract", () => {
  it.each([
    ["humanoid robot", "humanoid"],
    ["build a human-like machine", "humanoid"],
    ["a quadcopter drone", "drone"],
    ["NVIDIA Microduck", "microduck"],
    ["micro duck", "microduck"],
  ])("resolves %s", (prompt, kind) => expect(resolveRobot(prompt)).toBe(kind));
  it.each([
    "rover",
    "robotic arm",
    "a drone and humanoid",
    "something new",
    "submarine drone",
  ])("rejects unsupported or ambiguous %s", (prompt) =>
    expect(resolveRobot(prompt)).toBeNull(),
  );
  it("provides exactly three templates and unique valid component IDs", () => {
    expect(Object.keys(ROBOTS)).toHaveLength(3);
    for (const kind of Object.keys(ROBOTS) as (keyof typeof ROBOTS)[]) {
      const spec = asRobotSpec(kind);
      expect(new Set(spec.components.map((p) => p.id)).size).toBe(
        spec.components.length,
      );
      for (const p of spec.components) {
        expect(p.id).toMatch(/^[a-z][a-z0-9_-]{0,47}$/);
        expect(p.size.every((x) => x > 0)).toBe(true);
      }
      expect(spec.provenance).toBe("reference");
    }
  });
});
describe("kinematic demonstrations", () => {
  it("raises the shoulder through a bounded target", () => {
    expect(taskPose("humanoid", "Raise arm", 0).arm).toBeCloseTo(0);
    expect(taskPose("humanoid", "Raise arm", 3).arm).toBeCloseTo(-1.6);
    expect(taskPose("humanoid", "Raise arm", 10).arm).toBeCloseTo(-1.6);
  });
  it("waves and returns to rest", () => {
    expect(taskPose("humanoid", "Wave", 1).arm).not.toBe(0);
    expect(taskPose("humanoid", "Wave", 3).arm).toBeCloseTo(0);
  });
  it("takes off, hovers and lands", () => {
    expect(taskPose("drone", "Take off", 0).lift).toBe(0);
    expect(taskPose("drone", "Take off", 3).lift).toBe(1);
    expect(taskPose("drone", "Hover", 1).lift).toBeGreaterThan(0.95);
    expect(taskPose("drone", "Land", 3).lift).toBe(0);
  });
  it("articulates Microduck without claiming a walking policy", () => {
    expect(taskPose("microduck", "Nod", 0.75).nod).toBeCloseTo(0.25);
    expect(taskPose("microduck", "Leg articulation", 0.75).leg).toBeCloseTo(
      0.35,
    );
    expect(taskPose("microduck", "Turn head", 0.75).head).toBeCloseTo(0.6);
  });
});
