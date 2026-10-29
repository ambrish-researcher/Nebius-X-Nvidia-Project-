"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  RoundedBox,
  Grid,
  Html,
  Line,
} from "@react-three/drei";
import {
  Component as ReactComponent,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { useLab, assemblyOrder } from "../lib/store";
import type { ComponentSpec, Frame } from "../lib/types";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";

function Part({
  part,
  order,
  frame,
}: {
  part: ComponentSpec;
  order: number;
  frame?: Frame;
}) {
  const ref = useRef<THREE.Group>(null);
  const {
    selected,
    exploded,
    transparent,
    isolate,
    annotations,
    replay,
    speed,
    set,
    playing,
  } = useLab();
  const start = useRef(0);
  const elapsed = useRef(0);
  const isWheel = part.kind === "actuator" && part.shape === "cylinder";
  const [hover, setHover] = useState(false);
  useEffect(() => {
    start.current = 0;
    elapsed.current = 0;
  }, [replay]);
  const offset = useMemo(
    () =>
      new THREE.Vector3(
        (part.position[0] || 0.1) * 1.8,
        part.position[1] * 1.8 + 0.3,
        (part.position[2] || 0.1) * 1.8,
      ),
    [part],
  );
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    if (!ref.current) return;
    if (!start.current) start.current = state.clock.elapsedTime;
    elapsed.current += Math.min(dt, 0.1) * speed;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const progress = reduced
      ? 1
      : THREE.MathUtils.smoothstep(elapsed.current - order * 0.55, 0, 1.2);
    const spread = exploded ? 1 : (1 - progress) * 2.3;
    target.set(...part.position).addScaledVector(offset, spread);
    ref.current.position.lerp(target, Math.min(1, dt * 7));
    ref.current.scale.setScalar(Math.max(0.001, progress));
    if (isWheel && frame) {
      const robot = useLab.getState().robot;
      const index =
        robot?.joints.findIndex((j) => j.component_id === part.id) ?? -1;
      if (index >= 0)
        ref.current.rotation.y = part.rotation[1] + frame.joints[index];
    }
  });
  if (isolate && selected && selected !== part.id) return null;
  const selectedPart = selected === part.id;
  const color = selectedPart
    ? "#b9ef66"
    : hover
      ? "#b9c3bc"
      : part.kind === "compute"
        ? "#394c30"
        : part.kind === "power"
          ? "#252e29"
          : part.kind === "sensor"
            ? "#68736c"
            : part.kind === "actuator"
              ? "#292d29"
              : "#a0a7a0";
  const [w, h, d] = part.size;
  const material = (
    <meshStandardMaterial
      color={color}
      metalness={isWheel ? 0.25 : 0.75}
      roughness={isWheel ? 0.7 : 0.3}
      transparent={transparent}
      opacity={transparent ? 0.3 : 1}
      emissive={selectedPart ? "#385318" : "#000000"}
      emissiveIntensity={0.25}
    />
  );
  return (
    <group
      ref={ref}
      position={[...part.position]}
      rotation={[...part.rotation]}
      onClick={(e) => {
        e.stopPropagation();
        set({ selected: part.id, section: "inspect", entered: true });
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = "auto";
      }}
    >
      {part.shape === "box" ? (
        <RoundedBox
          args={[w, h, d]}
          radius={Math.min(0.025, Math.min(w, h, d) / 5)}
          smoothness={3}
          castShadow
          receiveShadow
        >
          {material}
        </RoundedBox>
      ) : part.shape === "sphere" ? (
        <mesh castShadow>
          <sphereGeometry args={[w / 2, 24, 16]} />
          {material}
        </mesh>
      ) : (
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[w / 2, w / 2, h, 32]} />
          {material}
        </mesh>
      )}
      {isWheel && (
        <>
          {[-1, 1].map((sign) => (
            <group key={sign} position={[0, sign * (h / 2 + 0.004), 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[w * 0.37, 0.013, 6, 32]} />
                <meshStandardMaterial
                  color="#aab2a5"
                  metalness={0.95}
                  roughness={0.23}
                />
              </mesh>
              <mesh>
                <cylinderGeometry args={[w * 0.16, w * 0.16, 0.015, 12]} />
                <meshStandardMaterial
                  color="#89b64c"
                  metalness={0.8}
                  roughness={0.25}
                />
              </mesh>
            </group>
          ))}
          {Array.from({ length: 18 }, (_, i) => (
            <mesh
              key={i}
              position={[
                Math.sin((i * Math.PI) / 9) * w * 0.49,
                0,
                Math.cos((i * Math.PI) / 9) * w * 0.49,
              ]}
              rotation={[0, (i * Math.PI) / 9, 0]}
            >
              <boxGeometry args={[0.016, h * 0.88, 0.018]} />
              <meshStandardMaterial color="#161b17" roughness={0.9} />
            </mesh>
          ))}
        </>
      )}
      {part.kind === "compute" && (
        <group position={[0, h / 2 + 0.009, 0]}>
          {Array.from({ length: 7 }, (_, i) => (
            <mesh key={i} position={[((i - 3) * w) / 9, 0.012, 0]}>
              <boxGeometry args={[w / 20, 0.025, d * 0.8]} />
              <meshStandardMaterial
                color="#161d15"
                metalness={0.9}
                roughness={0.3}
              />
            </mesh>
          ))}
          <mesh position={[w * 0.4, 0.01, d * 0.3]}>
            <sphereGeometry args={[0.008, 8, 8]} />
            <meshBasicMaterial color="#c1ff73" />
          </mesh>
        </group>
      )}
      {part.kind === "sensor" &&
        part.shape === "box" &&
        [-1, 1].map((sign) => (
          <mesh
            key={sign}
            position={[w / 2 + 0.004, 0, sign * d * 0.3]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.025, 0.025, 0.012, 20]} />
            <meshPhysicalMaterial
              color="#0b1315"
              metalness={0.9}
              roughness={0.06}
              clearcoat={1}
            />
          </mesh>
        ))}
      {selectedPart && annotations && !playing && (
        <Html
          center
          position={[0, h + 0.15, 0]}
          distanceFactor={3}
          style={{ pointerEvents: "none" }}
        >
          <div className="part-label">
            {part.name}
            <span>{part.kind.toUpperCase()}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

function Robot() {
  const { robot, assembly, runs, section, playhead, playing, speed, set } =
    useLab();
  const group = useRef<THREE.Group>(null);
  const run = runs.at(-1);
  const frame =
    section === "simulate"
      ? run?.frames[Math.min(playhead, (run?.frames.length || 1) - 1)]
      : undefined;
  const accumulator = useRef(0);
  useFrame((state, dt) => {
    if (playing && run) {
      accumulator.current += Math.min(dt, 0.1) * speed;
      if (accumulator.current >= 0.04) {
        const advance = Math.floor(accumulator.current / 0.04);
        accumulator.current %= 0.04;
        const next = useLab.getState().playhead + advance;
        set({
          playhead: Math.min(next, run.frames.length - 1),
          playing: next < run.frames.length - 1,
        });
      }
    }
    if (group.current) {
      if (frame) {
        group.current.position.set(
          frame.position[0],
          frame.position[1],
          frame.position[2],
        );
        const [w, x, y, z] = frame.quaternion;
        group.current.quaternion.set(-x, -z, -y, w).normalize();
      } else {
        group.current.position.lerp(new THREE.Vector3(0, 0, 0), 0.1);
        group.current.quaternion.slerp(new THREE.Quaternion(), 0.1);
      }
    }
  });
  if (!robot) return null;
  return (
    <>
      <group ref={group}>
        {robot.components.map((c) => (
          <Part
            key={robot.id + c.id}
            part={c}
            order={assemblyOrder(assembly, c.id)}
            frame={frame}
          />
        ))}
      </group>
      {section === "simulate" && run && run.frames.length > 1 && (
        <Line
          points={run.frames.map(
            (f) =>
              [f.position[0], 0.015, f.position[2]] as [number, number, number],
          )}
          color="#b3de7a"
          lineWidth={1.6}
          dashed
          dashSize={0.06}
          gapSize={0.04}
        />
      )}
    </>
  );
}
function CameraRig() {
  const controls = useRef<OrbitControlsType>(null);
  const { camera, selected, robot, section, entered } = useLab();
  const { camera: threeCamera } = useThree();
  const destination = useRef(new THREE.Vector3(2.3, 1.7, 2.5));
  const target = useRef(new THREE.Vector3(0, 0.4, 0));
  const animating = useRef(true);
  const previousPosition = useRef(new THREE.Vector3());
  useEffect(() => {
    const part = robot?.components.find((c) => c.id === selected);
    target.current.set(
      ...((part && section === "inspect" ? part.position : [0, 0.4, 0]) as [
        number,
        number,
        number,
      ]),
    );
    const scale = robot ? Math.max(...robot.dimensions_m, 1) : 1.2;
    destination.current
      .copy(target.current)
      .add(
        camera === "top"
          ? new THREE.Vector3(0.01, 3 * scale, 0.01)
          : camera === "front"
            ? new THREE.Vector3(2.7 * scale, 0.4, 0)
            : new THREE.Vector3(1.7 * scale, 1.1 * scale, 1.9 * scale),
      );
    if (part && section === "inspect")
      destination.current
        .copy(target.current)
        .add(new THREE.Vector3(1, 0.7, 1.2));
    animating.current = true;
  }, [camera, selected, robot, section, entered]);
  useFrame((_, dt) => {
    const s = useLab.getState();
    const f =
      s.section === "simulate" ? s.runs.at(-1)?.frames[s.playhead] : undefined;
    const pos = new THREE.Vector3(
      ...((f ? f.position : [0, 0, 0]) as [number, number, number]),
    );
    if (controls.current && !animating.current) {
      const delta = pos.clone().sub(previousPosition.current);
      threeCamera.position.add(delta);
      controls.current.target.add(delta);
    }
    previousPosition.current.copy(pos);
    if (controls.current && animating.current) {
      threeCamera.position.lerp(destination.current, Math.min(1, dt * 3));
      controls.current.target.lerp(target.current, Math.min(1, dt * 3));
      controls.current.update();
      if (threeCamera.position.distanceTo(destination.current) < 0.01)
        animating.current = false;
    }
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      minDistance={0.5}
      maxDistance={18}
      maxPolarAngle={Math.PI / 2 - 0.015}
      enableDamping
      dampingFactor={0.07}
      onStart={() => {
        animating.current = false;
      }}
      autoRotate={
        !entered &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      }
      autoRotateSpeed={0.28}
    />
  );
}
function Performance({ onSlow }: { onSlow: () => void }) {
  const frames = useRef(0),
    elapsed = useRef(0);
  const { gl } = useThree();
  useFrame((_, dt) => {
    frames.current++;
    elapsed.current += dt;
    if (elapsed.current > 2) {
      const fps = frames.current / elapsed.current;
      const node = document.getElementById("render-fps");
      if (node) node.textContent = `${Math.round(fps)} FPS · LIVE`;
      if (fps < 22) {
        gl.setPixelRatio(0.75);
        onSlow();
      }
      frames.current = 0;
      elapsed.current = 0;
    }
  });
  return null;
}
class SceneBoundary extends ReactComponent<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="scene-fallback">
        <span>3D renderer unavailable</span>
        <p>
          Component inspection, compute analysis, and physics results remain
          available. Try a WebGL-capable browser.
        </p>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function RobotScene() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [low, setLow] = useState(false);
  useEffect(() => {
    const c = document.createElement("canvas");
    setSupported(!!(c.getContext("webgl2") || c.getContext("webgl")));
  }, []);
  if (supported === null)
    return <div className="scene-loading">INITIALIZING CONSTRUCTION LAB</div>;
  return (
    <SceneBoundary>
      {supported ? (
        <Canvas
          shadows={!low}
          dpr={low ? 0.75 : [1, 1.5]}
          camera={{ position: [2.8, 2, 3], fov: 35, near: 0.01, far: 70 }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          onPointerMissed={(event) => {
            if ((event.target as HTMLElement)?.tagName === "CANVAS")
              useLab.getState().set({ selected: null });
          }}
        >
          <color attach="background" args={["#141916"]} />
          <fog attach="fog" args={["#141916", 9, 23]} />
          <ambientLight intensity={0.35} />
          <hemisphereLight args={["#f2ffe8", "#263027", 1]} />
          <directionalLight
            position={[3, 7, 4]}
            intensity={3.5}
            castShadow
            shadow-mapSize={[512, 512]}
            shadow-camera-left={-4}
            shadow-camera-right={4}
            shadow-camera-top={4}
            shadow-camera-bottom={-4}
            shadow-bias={-0.0005}
          />
          <spotLight
            position={[-3, 4, -2]}
            intensity={22}
            color="#c6dbbb"
            angle={0.6}
            penumbra={1}
          />
          <Suspense fallback={null}>
            <Environment resolution={64}>
              <Lightformer
                position={[0, 5, -3]}
                scale={[6, 3, 1]}
                intensity={2}
              />
              <Lightformer
                position={[-4, 2, 1]}
                rotation={[0, Math.PI / 2, 0]}
                scale={[4, 4, 1]}
                intensity={1.5}
              />
            </Environment>
          </Suspense>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.009, 0]}
            receiveShadow
          >
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#141916" roughness={0.95} />
          </mesh>
          <Grid
            args={[28, 28]}
            position={[0, -0.006, 0]}
            cellSize={0.25}
            sectionSize={1}
            cellColor="#303a32"
            sectionColor="#43513e"
            fadeDistance={12}
            fadeStrength={2}
            infiniteGrid
          />
          <Robot />
          <CameraRig />
          <Performance onSlow={() => setLow(true)} />
        </Canvas>
      ) : (
        <div className="scene-fallback">
          <span>WebGL isn’t available</span>
          <p>
            The engineering panels and MuJoCo experiment still work. Enable
            hardware acceleration to view the 3D assembly.
          </p>
        </div>
      )}
    </SceneBoundary>
  );
}
