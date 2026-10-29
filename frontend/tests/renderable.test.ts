import { it, expect } from "vitest";
import { assertRenderable } from "../lib/renderable";
import type { RobotSpec } from "../lib/types";
const robot = {
  components: [
    {
      id: "base",
      shape: "box",
      size: [1, 1, 1],
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      depends_on: [],
    },
  ],
  joints: [],
} as unknown as RobotSpec;
it("accepts generic primitive assemblies without selecting a robot preset", () =>
  expect(() => assertRenderable(robot)).not.toThrow());
it("rejects unsupported meshes, nonfinite geometry, cycles and invalid joints before display", () => {
  for (const r of [
    { ...robot, components: [{ ...robot.components[0], shape: "mesh" }] },
    {
      ...robot,
      components: [{ ...robot.components[0], position: [NaN, 0, 0] }],
    },
    {
      ...robot,
      components: [{ ...robot.components[0], depends_on: ["base"] }],
    },
    { ...robot, joints: [{ component_id: "missing" }] },
  ])
    expect(() => assertRenderable(r as RobotSpec)).toThrow();
});
