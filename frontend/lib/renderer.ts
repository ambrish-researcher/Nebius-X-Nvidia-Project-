import { create } from "zustand";

export function renderingAcceleration(renderer: string) {
  if (
    /swiftshader|llvmpipe|softpipe|software|microsoft basic render/i.test(
      renderer,
    )
  )
    return "Software renderer reported";
  if (/nvidia|geforce|radeon|intel|apple|adreno|mali/i.test(renderer))
    return "Hardware renderer reported; acceleration not benchmarked";
  return "Acceleration not disclosed or independently verified";
}
export const useRenderer = create<{
  status: "checking" | "available" | "unavailable" | "lost" | "error";
  renderer: string;
  vendor: string;
  version: string;
  fps: number | null;
  demand: boolean;
  calls: number;
  triangles: number;
}>()(() => ({
  status: "checking",
  renderer: "Not disclosed",
  vendor: "Not disclosed",
  version: "Unknown",
  fps: null,
  demand: false,
  calls: 0,
  triangles: 0,
}));
