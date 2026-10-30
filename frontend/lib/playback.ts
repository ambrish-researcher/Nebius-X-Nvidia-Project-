import type { SimulationRun } from "./types";

/** Select a measured sample by its timestamp, independent of render rate. */
export function frameAtTime(frames: SimulationRun["frames"], time: number) {
  let lo = 0,
    hi = frames.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (frames[mid].t <= time) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function validateRun(run: SimulationRun, robotId: string) {
  if (
    run.robot_id !== robotId ||
    !run.frames?.length ||
    run.frames.length > 1000
  )
    throw Error("The solver returned no usable states for this robot.");
  let previous = -1;
  for (const f of run.frames) {
    if (
      !Number.isFinite(f.t) ||
      f.t < 0 ||
      f.t <= previous ||
      f.position?.length !== 3 ||
      f.quaternion?.length !== 4 ||
      [...f.position, ...f.quaternion, ...f.joints].some(
        (n) => !Number.isFinite(n),
      ) ||
      Math.abs(Math.hypot(...f.quaternion) - 1) > 0.01
    )
      throw Error(
        "The solver returned invalid time-series states. Playback was not started.",
      );
    previous = f.t;
  }
  if (
    !Number.isFinite(run.metrics.simulated_seconds) ||
    Math.abs(previous - run.metrics.simulated_seconds) > 0.01
  )
    throw Error(
      "Recorded states do not cover the reported simulation duration.",
    );
}
