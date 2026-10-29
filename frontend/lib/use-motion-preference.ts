"use client";
import { useSyncExternalStore } from "react";
const query = "(prefers-reduced-motion: reduce)";
const subscribe = (fn: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener("change", fn);
  return () => media.removeEventListener("change", fn);
};
export function useMotionPreference() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
