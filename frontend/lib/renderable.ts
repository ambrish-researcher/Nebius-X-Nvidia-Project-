import type { RobotSpec } from "./types";
/** Defensive client boundary in addition to authoritative backend validation. */
export function assertRenderable(robot: RobotSpec) {
  if (
    !robot ||
    !Array.isArray(robot.components) ||
    !robot.components.length ||
    robot.components.length > 64
  )
    throw Error("Unsupported robot assembly. No generated robot was rendered.");
  const ids = new Set(robot.components.map((c) => c.id));
  if (ids.size !== robot.components.length)
    throw Error("Duplicate component IDs.");
  const resolved = new Set<string>();
  for (const c of robot.components) {
    if (
      !["box", "sphere", "cylinder"].includes(c.shape) ||
      [c.size, c.position, c.rotation].some(
        (v) =>
          !Array.isArray(v) ||
          v.length !== 3 ||
          v.some((n) => !Number.isFinite(n)),
      ) ||
      c.size.some((n) => n <= 0 || n > 10) ||
      c.position.some((n) => Math.abs(n) > 15) ||
      !c.depends_on.every((id) => ids.has(id))
    )
      throw Error(
        "Unsupported geometry or relationship. No generated assembly was rendered.",
      );
  }
  while (resolved.size < ids.size) {
    const ready = robot.components.filter(
      (c) =>
        !resolved.has(c.id) && c.depends_on.every((id) => resolved.has(id)),
    );
    if (!ready.length) throw Error("Cyclic component relationships.");
    ready.forEach((c) => resolved.add(c.id));
  }
  if (robot.joints.some((j) => !ids.has(j.component_id)))
    throw Error("Unsupported joint relationship.");
}
