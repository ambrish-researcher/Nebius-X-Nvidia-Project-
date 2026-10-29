"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox, Line } from "@react-three/drei";
import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useCinema, spherePose, introCameraPose, ease } from "../lib/cinema";
import { useLab } from "../lib/store";

function Guide() {
  const root = useRef<THREE.Group>(null),
    hand = useRef<THREE.Group>(null);
  useFrame(() => {
    const { phase, time } = useCinema.getState();
    if (root.current) {
      root.current.visible = phase === "intro";
      root.current.rotation.y = -0.12 + ease((time - 2) / 2) * 0.2;
    }
    if (hand.current)
      hand.current.rotation.x = -0.3 - ease((time - 2.2) / 1.1) * 0.65;
  });
  const armor = (
    <meshStandardMaterial color="#d8d9df" metalness={0.85} roughness={0.25} />
  );
  const joint = (
    <meshStandardMaterial color="#16171d" metalness={0.7} roughness={0.4} />
  );
  return (
    <group ref={root} position={[1.1, 0, 0]}>
      <RoundedBox
        args={[0.83, 0.83, 0.44]}
        radius={0.12}
        position={[0, 1.6, 0]}
        castShadow
      >
        {armor}
      </RoundedBox>
      <mesh position={[0, 1.62, 0.247]}>
        <boxGeometry args={[0.65, 0.24, 0.03]} />
        <meshPhysicalMaterial
          color="#11131e"
          metalness={1}
          roughness={0.12}
          clearcoat={1}
        />
      </mesh>
      <mesh position={[0, 1.64, 0.27]}>
        <boxGeometry args={[0.46, 0.018, 0.015]} />
        <meshBasicMaterial color="#dcd4ff" />
      </mesh>
      <mesh position={[0, 1.09, 0]}>
        <cylinderGeometry args={[0.13, 0.17, 0.22, 20]} />
        {joint}
      </mesh>
      <RoundedBox
        args={[1.02, 0.87, 0.5]}
        radius={0.12}
        position={[0, 0.61, 0]}
        castShadow
      >
        {armor}
      </RoundedBox>
      <mesh position={[0, 0.67, 0.27]}>
        <circleGeometry args={[0.16, 40]} />
        <meshStandardMaterial
          color="#0b0b12"
          metalness={0.9}
          roughness={0.12}
        />
      </mesh>
      <mesh position={[0, 0.67, 0.28]}>
        <torusGeometry args={[0.105, 0.009, 8, 40]} />
        <meshBasicMaterial color="#ba9dff" />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <GuideArm side={side} />
          <RoundedBox
            args={[0.31, 0.54, 0.35]}
            radius={0.07}
            position={[side * 0.26, -0.12, 0]}
          >
            {armor}
          </RoundedBox>
        </group>
      ))}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.62, 0.2, 0.32]} />
        {joint}
      </mesh>
    </group>
  );
}
function GuideArm({ side }: { side: number }) {
  const forearm = useRef<THREE.Mesh>(null),
    palm = useRef<THREE.Group>(null);
  const elbow = useMemo(
    () => new THREE.Vector3(side * 0.7, 0.35, 0.08),
    [side],
  );
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  useFrame(() => {
    const state = useCinema.getState(),
      p = ease((state.time - 3.1) / 1.25);
    const hand = new THREE.Vector3(
      side * 0.22 + 0.2,
      0.69 + p * 0.55,
      0.49 + p * 0.15,
    );
    if (palm.current) palm.current.position.copy(hand);
    if (forearm.current) {
      const delta = hand.clone().sub(elbow);
      forearm.current.position.copy(elbow).add(hand).multiplyScalar(0.5);
      forearm.current.scale.y = delta.length();
      forearm.current.quaternion.setFromUnitVectors(up, delta.normalize());
    }
  });
  return (
    <>
      <mesh position={[side * 0.6, 0.9, 0]}>
        <sphereGeometry args={[0.19, 20, 14]} />
        <meshStandardMaterial
          color="#15141e"
          metalness={0.75}
          roughness={0.3}
        />
      </mesh>
      <RoundedBox
        args={[0.26, 0.56, 0.28]}
        radius={0.06}
        position={[side * 0.65, 0.63, 0.04]}
        rotation={[0.1, 0, side * 0.15]}
      >
        <meshStandardMaterial
          color="#bec0cd"
          metalness={0.85}
          roughness={0.27}
        />
      </RoundedBox>
      <mesh position={[side * 0.7, 0.35, 0.08]}>
        <sphereGeometry args={[0.13, 16, 12]} />
        <meshStandardMaterial
          color="#16151d"
          metalness={0.8}
          roughness={0.35}
        />
      </mesh>
      <mesh ref={forearm}>
        <cylinderGeometry args={[0.095, 0.12, 1, 16]} />
        <meshStandardMaterial
          color="#d4d3df"
          metalness={0.85}
          roughness={0.24}
        />
      </mesh>
      <group ref={palm}>
        <RoundedBox args={[0.21, 0.13, 0.2]} radius={0.04}>
          <meshStandardMaterial
            color="#24212c"
            metalness={0.85}
            roughness={0.2}
          />
        </RoundedBox>
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            position={[(i - 1.5) * 0.05, 0.08, 0.07]}
            rotation={[0.5, 0, 0]}
          >
            <capsuleGeometry args={[0.021, 0.12, 4, 8]} />
            <meshStandardMaterial
              color="#d4d3df"
              metalness={0.85}
              roughness={0.24}
            />
          </mesh>
        ))}
      </group>
    </>
  );
}

export function CinematicWorld() {
  const orb = useRef<THREE.Group>(null),
    tunnel = useRef<THREE.Group>(null),
    ring = useRef<THREE.Mesh>(null);
  const entered = useLab((s) => s.entered),
    phase = useCinema((s) => s.phase);
  const { camera, size, invalidate } = useThree();
  // Scrubbing redraws paused reduced-motion scenes without running an idle loop.
  useEffect(() => useCinema.subscribe(() => invalidate()), [invalidate]);
  const clock = useRef(0);
  const stars = useMemo(
    () =>
      Float32Array.from(
        Array.from({ length: 90 }, (_, i) => [
          Math.sin(i * 127.1) * 8,
          Math.cos(i * 17.7) * 4,
          -3 - (i % 30) * 0.7,
        ]).flat(),
      ),
    [],
  );
  useFrame((_, dt) => {
    const lab = useLab.getState(),
      state = useCinema.getState();
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!lab.entered && !state.paused && state.duration) {
      clock.current += dt * state.rate;
      if (clock.current > 0.06) {
        state.set({
          time: Math.min(state.duration, state.time + clock.current),
        });
        clock.current = 0;
      }
    }
    const current = useCinema.getState();
    if (
      !lab.entered &&
      !current.paused &&
      current.time >= current.duration &&
      current.duration
    ) {
      if (current.phase === "intro") current.start("prompt");
      else if (current.phase === "transform") current.start("reveal");
      else if (current.phase === "reveal") {
        lab.set({ entered: true, section: "design" });
        current.start("prompt");
      }
    }
    if (orb.current) {
      const p = lab.entered
        ? ([-0.85, 1.55, -0.25] as [number, number, number])
        : spherePose(current.phase, current.time);
      orb.current.position.set(...p);
      orb.current.visible = current.phase !== "reveal";
      orb.current.scale.setScalar(
        lab.entered
          ? 0.3
          : current.phase === "transform"
            ? 1 - ease((current.time - 1.6) / 1.1)
            : 1,
      );
      orb.current.rotation.y += reduced ? 0 : dt * 0.2;
    }
    if (ring.current) ring.current.rotation.z += reduced ? 0 : dt * 0.25;
    if (tunnel.current) {
      tunnel.current.visible =
        !lab.entered &&
        (current.phase === "prompt" || current.phase === "transform");
      tunnel.current.rotation.z = reduced
        ? 0
        : Math.sin(current.time * 0.15) * 0.08;
    }
    if (!lab.entered) {
      let p = new THREE.Vector3(3.6, 1.5, 6.8),
        target = new THREE.Vector3(0.1, 0.45, 0);
      if (current.phase === "intro") {
        p.set(...introCameraPose(current.time, size.width < 700));
        if (size.width < 700) {
          const flight = ease((current.time - 3.2) / 2.8);
          target.set(0.8 * (1 - flight), 1.5 - 0.65 * flight, 0);
        } else {
          target.set(0.1, 0.5, 0);
        }
      }
      if (current.phase === "prompt") {
        p.set(0.1, 0.5, 6.7);
        target.set(0, 0.4, -8);
      }
      if (current.phase === "transform") {
        const f = ease(current.time / 2.8);
        p.set(1.9 * f, 1.3, 6.7 - f * 2);
        target.set(0, 0.4, -(1 - f) * 6);
        if (size.width < 700) {
          p.set(3.6, 2.5, 10.5);
          target.set(0, 0.8, 0);
        }
      }
      if (reduced) camera.position.copy(p);
      else camera.position.lerp(p, Math.min(1, dt * 2));
      camera.lookAt(target);
    }
  });
  return (
    <>
      {!entered && phase === "intro" && <Guide />}
      <group ref={orb}>
        <mesh>
          <sphereGeometry args={[0.22, 32, 24]} />
          <meshStandardMaterial
            color="#fff7ff"
            emissive="#dbc6ff"
            emissiveIntensity={2}
            metalness={0.1}
            roughness={0.15}
          />
        </mesh>
        <mesh ref={ring} rotation={[0.7, 0.4, 0]}>
          <torusGeometry args={[0.34, 0.006, 6, 60]} />
          <meshBasicMaterial color="#bca7ff" />
        </mesh>
        <pointLight color="#d0b1ff" intensity={3} distance={4} />
      </group>
      <group ref={tunnel} position={[0, 0.45, 0]}>
        {Array.from({ length: 15 }, (_, i) => (
          <mesh
            key={i}
            position={[0, 0, -3 - i * 1.5]}
            rotation={[0, 0, Math.PI / 4 + (i % 3) * 0.12]}
          >
            <torusGeometry args={[2.65, 0.025, 4, 4]} />
            <meshStandardMaterial
              color={i % 3 === 0 ? "#a7a6b7" : "#2b283b"}
              emissive={i % 4 === 0 ? "#b262ed" : "#343043"}
              emissiveIntensity={i % 4 === 0 ? 0.5 : 0.1}
              metalness={1}
              roughness={0.17}
            />
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <Line
            key={side}
            points={[
              [side * 1.8, -1.7, 0],
              [side * 1.8, -1.7, -30],
            ]}
            color={side === 1 ? "#8a80ff" : "#df7ba9"}
            lineWidth={1}
          />
        ))}
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[stars, 3]} />
          </bufferGeometry>
          <pointsMaterial
            color="#c8b9e5"
            size={0.018}
            transparent
            opacity={0.45}
            sizeAttenuation
          />
        </points>
      </group>
    </>
  );
}
export function ComputeSculpture() {
  const section = useLab((s) => s.section),
    entered = useLab((s) => s.entered),
    family = useLab((s) => s.atlasFamily);
  const marker = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (
      marker.current &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const t = (clock.elapsedTime * 0.25) % 1;
      marker.current.position.set(
        t < 0.4
          ? -0.5 + (t / 0.4) * 0.5
          : t < 0.6
            ? 0
            : ((t - 0.6) / 0.4) * 0.5,
        0.13,
        t < 0.4 ? 0.1 : t < 0.6 ? 0.1 - ((t - 0.4) / 0.2) * 0.3 : -0.2,
      );
    }
  });
  if (!entered || section !== "compute") return null;
  if (family === "rubin" || family === "blackwell")
    return (
      <group position={[-1.35, 0.7, -0.65]}>
        <RoundedBox args={[0.65, 1.45, 0.58]} radius={0.025}>
          <meshStandardMaterial
            color="#1a1b23"
            metalness={0.8}
            roughness={0.25}
          />
        </RoundedBox>
        {Array.from({ length: 5 }, (_, i) => (
          <group key={i} position={[0, (i - 2) * 0.25, 0.32]}>
            <mesh>
              <boxGeometry args={[0.52, 0.14, 0.04]} />
              <meshStandardMaterial
                color="#3e4247"
                metalness={0.8}
                roughness={0.35}
              />
            </mesh>
            <mesh position={[0.2, 0, 0.03]}>
              <boxGeometry args={[0.025, 0.06, 0.01]} />
              <meshBasicMaterial
                color={family === "rubin" ? "#a6b4ff" : "#c1ef7a"}
              />
            </mesh>
          </group>
        ))}
        <Line
          points={[
            [0.39, -0.55, 0.35],
            [0.39, 0.55, 0.35],
            [-0.4, 0.55, 0.35],
          ]}
          color="#bec7ff"
          lineWidth={1}
        />
      </group>
    );
  return (
    <group position={[-1.3, 0.25, -0.6]} rotation={[-0.15, 0, 0.05]}>
      <RoundedBox
        args={[family === "jetson" ? 0.85 : 1.25, 0.08, 0.74]}
        radius={0.03}
      >
        <meshStandardMaterial
          color="#183b22"
          metalness={0.6}
          roughness={0.38}
        />
      </RoundedBox>
      <mesh
        position={[0, 0.09, 0]}
        onClick={(e) => {
          e.stopPropagation();
          useLab.getState().set({ atlasConcept: "parallel" });
        }}
      >
        <boxGeometry args={[0.36, 0.1, 0.32]} />
        <meshStandardMaterial
          color="#181b20"
          metalness={0.95}
          roughness={0.15}
        />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh
          key={i}
          position={[(i - 3.5) * 0.09, 0.1, 0.26]}
          onClick={(e) => {
            e.stopPropagation();
            useLab.getState().set({ atlasConcept: "memory" });
          }}
        >
          <boxGeometry args={[0.055, 0.05, 0.08]} />
          <meshStandardMaterial
            color="#444d41"
            metalness={0.8}
            roughness={0.3}
          />
        </mesh>
      ))}
      <Line
        points={[
          [-0.5, 0.1, 0.1],
          [0, 0.1, 0.1],
          [0, 0.1, -0.2],
          [0.5, 0.1, -0.2],
        ]}
        color="#b8eb77"
        lineWidth={1.2}
      />
      <mesh ref={marker}>
        <sphereGeometry args={[0.035, 12, 8]} />
        <meshBasicMaterial color="#c8ff80" />
      </mesh>
    </group>
  );
}
