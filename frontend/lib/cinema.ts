import { create } from "zustand";
export type CinemaPhase = "intro" | "prompt" | "transform" | "reveal";
export const durations: Record<CinemaPhase, number> = {
  intro: 6,
  prompt: 0,
  transform: 9,
  reveal: 2,
};
export const useCinema = create<{
  phase: CinemaPhase;
  time: number;
  duration: number;
  paused: boolean;
  rate: number;
  start: (phase: CinemaPhase, levels?: number) => void;
  seek: (time: number) => void;
  set: (
    patch: Partial<{
      phase: CinemaPhase;
      time: number;
      paused: boolean;
      rate: number;
    }>,
  ) => void;
}>((set) => ({
  phase: "intro",
  time: 0,
  duration: 6,
  paused: false,
  rate: 1,
  start: (phase, levels = 1) =>
    set({
      phase,
      time: 0,
      duration:
        phase === "transform"
          ? Math.max(9, 5.2 + Math.max(0, levels - 1) * 0.6)
          : durations[phase],
      paused: false,
    }),
  seek: (time) =>
    set((s) => ({
      time: Math.max(0, Math.min(s.duration, time)),
      paused: true,
    })),
  set,
}));
export const ease = (n: number) => {
  const t = Math.max(0, Math.min(1, n));
  return t * t * (3 - 2 * t);
};
export function spherePose(
  phase: CinemaPhase,
  time: number,
): [number, number, number] {
  if (phase === "intro") {
    const p = ease((time - 3.2) / 2.8);
    return [1.3 * (1 - p), 0.85 + 0.35 * Math.sin(p * Math.PI), 0.5 + 5.7 * p];
  }
  if (phase === "transform") {
    const p = ease(time / 1.8);
    return [Math.sin(p * Math.PI) * 0.35, 0.7, -2 + 2 * p];
  }
  return [0, 0.5, -2];
}
export function introCameraPose(
  time: number,
  portrait: boolean,
): [number, number, number] {
  if (portrait) {
    const flight = ease((time - 3.2) / 2.8);
    return [1.6 * (1 - flight), 2.5 - 1.6 * flight, 10 - 4.5 * flight];
  }
  const tracking = ease(time / 6);
  return [2.8 * (1 - tracking), 1.2 - 0.35 * tracking, 6.5 - tracking];
}
export function componentPose(
  position: [number, number, number],
  order: number,
  time: number,
  seed: number,
) {
  const emergence = ease((time - 1.5) / 1.1),
    progress = ease((time - 3.1 - order * 0.6) / 1.7),
    spread = 1 - progress;
  const angle = seed * 2.39996 + time * 0.7 * spread;
  return {
    progress,
    scale: emergence,
    position: [
      position[0] * progress + Math.cos(angle) * spread * emergence * 2.1,
      position[1] * progress +
        (0.7 + Math.sin(angle) * emergence * 0.8) * spread,
      position[2] * progress + Math.sin(angle) * spread * emergence * 2.1,
    ] as [number, number, number],
    spin: spread * Math.PI * 2,
  };
}
