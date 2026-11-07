"use client";
import { useEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  CONSTRUCTION,
  type ConstructionStage,
} from "../lib/simulation-construction";
import type { ExperienceId } from "../lib/simulation-lessons";

// Adapt only from sustained render samples. Keep a sharp floor, a 2x ceiling,
// and no per-frame React state. Dataset values are local review instrumentation.
export function RenderQuality({
  kind,
  building,
  stageIndex,
  time,
  reduced,
  playing,
}: {
  kind: ExperienceId;
  building: boolean;
  stageIndex: number;
  time: RefObject<number>;
  reduced: boolean;
  playing: boolean;
}) {
  const { gl, setDpr, scene } = useThree();
  const shadowTime = useRef(-1);
  const sample = useRef({ start: 0, frames: 0, slow: 0, fast: 0, warmup: 2 });
  const stageStart = CONSTRUCTION[kind]
    .slice(0, stageIndex)
    .reduce((sum, s: ConstructionStage) => sum + s.seconds, 0);
  useEffect(() => {
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      if (materials.some((m) => m instanceof THREE.MeshStandardMaterial)) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    gl.shadowMap.needsUpdate = true;
    shadowTime.current = -1;
  }, [scene, gl, stageIndex]);
  useFrame((_, delta) => {
    const now = performance.now();
    const wallTime = now / 1000;
    const moving = playing && kind === "microduck" && !building && !reduced;
    gl.shadowMap.autoUpdate = false;
    if (
      (moving || (playing && building && time.current - stageStart < 1.6)) &&
      wallTime - shadowTime.current > 1 / 18
    ) {
      gl.shadowMap.needsUpdate = true;
      shadowTime.current = wallTime;
    }
    const s = sample.current;
    if (document.hidden || !playing || reduced) {
      s.start = 0;
      s.frames = 0;
      return;
    }
    if (s.warmup > 0) {
      s.warmup -= delta;
      s.start = 0;
      s.frames = 0;
      return;
    }
    if (!s.start) s.start = now;
    s.frames++;
    if (now - s.start < 2200) return;
    const fps = (s.frames * 1000) / (now - s.start),
      dpr = gl.getPixelRatio();
    s.slow = fps < 42 ? s.slow + 1 : 0;
    s.fast = fps > 57 ? s.fast + 1 : 0;
    if (s.slow >= 2 && dpr > 1.5) {
      setDpr(Math.max(1.5, dpr - 0.25));
      s.slow = 0;
    } else if (s.fast >= 3 && dpr < 2) {
      setDpr(Math.min(2, dpr + 0.25));
      s.fast = 0;
    }
    gl.domElement.dataset.renderFps = fps.toFixed(1);
    gl.domElement.dataset.drawCalls = String(gl.info.render.calls);
    gl.domElement.dataset.triangles = String(gl.info.render.triangles);
    gl.domElement.dataset.geometries = String(gl.info.memory.geometries);
    gl.domElement.dataset.pixelRatio = String(gl.getPixelRatio());
    s.start = now;
    s.frames = 0;
  });
  return null;
}
