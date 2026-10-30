"use client";
import { useEffect } from "react";
import { useLab } from "../lib/store";
import { frameAtTime } from "../lib/playback";

/** DOM clock: works without WebGL and never starts another physics request. */
export function PlaybackClock() {
  const playing = useLab((s) => s.playing);
  const speed = useLab((s) => s.speed);
  const run = useLab((s) => s.runs.at(-1));
  useEffect(() => {
    if (!playing || !run?.frames.length) return;
    const start = performance.now();
    const initial = run.frames[useLab.getState().playhead]?.t ?? 0;
    const final = run.frames.at(-1)!.t;
    let handle = 0;
    const tick = (now: number) => {
      const state = useLab.getState();
      if (!state.playing || state.section !== "simulate") return;
      const time = Math.min(final, initial + ((now - start) * speed) / 1000);
      const playhead = frameAtTime(run.frames, time);
      if (playhead !== state.playhead || time >= final)
        state.set({ playhead, playing: time < final });
      if (time < final) handle = requestAnimationFrame(tick);
    };
    const hide = () => {
      if (document.hidden) useLab.getState().set({ playing: false });
    };
    document.addEventListener("visibilitychange", hide);
    handle = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(handle);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [playing, speed, run]);
  return null;
}
