"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import * as THREE from "three";

type Resources = {
  geometry: Map<string, THREE.BufferGeometry>;
  material: Map<string, THREE.MeshStandardMaterial>;
};
const Assets = createContext<Resources>(null!);
export function SceneResources({ children }: { children: ReactNode }) {
  const assets = useMemo<Resources>(
    () => ({ geometry: new Map(), material: new Map() }),
    [],
  );
  useEffect(
    () => () => {
      assets.geometry.forEach((g) => g.dispose());
      assets.material.forEach((m) => m.dispose());
      assets.geometry.clear();
      assets.material.clear();
    },
    [assets],
  );
  return <Assets.Provider value={assets}>{children}</Assets.Provider>;
}
export function useGeometry(key: string, create: () => THREE.BufferGeometry) {
  const assets = useContext(Assets);
  if (!assets.geometry.has(key)) assets.geometry.set(key, create());
  return assets.geometry.get(key)!;
}
export function useMaterial(
  key: string,
  create: () => THREE.MeshStandardMaterial,
) {
  const assets = useContext(Assets);
  if (!assets.material.has(key)) assets.material.set(key, create());
  return assets.material.get(key)!;
}
export type Finish =
  "metal" | "polymer" | "board" | "rubber" | "silicon" | "lens";
export const FINISH: Record<Finish, [number, number]> = {
  metal: [0.82, 0.28],
  polymer: [0.08, 0.42],
  board: [0.22, 0.55],
  rubber: [0.02, 0.86],
  silicon: [0.65, 0.2],
  lens: [0.6, 0.09],
};
