"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, RoundedBox, ContactShadows } from "@react-three/drei";
import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { ROBOTS, taskPose, type Part, type RobotKind } from "../lib/arise";

interface Props {
  kind: RobotKind;
  assembling: boolean;
  replay: number;
  exploded: boolean;
  wireframe: boolean;
  selected: string;
  onSelect: (id: string) => void;
  task: string;
  taskStart: number;
  cameraReset: number;
  reduced: boolean;
  onComplete: () => void;
}
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="webgl-message">
        3D rendering is unavailable. You can still explore every component and
        lesson below. Reload to retry WebGL.
      </div>
    ) : (
      this.props.children
    );
  }
}
function Piece({
  part,
  index,
  props,
  start,
}: {
  part: Part;
  index: number;
  props: Props;
  start: React.RefObject<number | null>;
}) {
  const root = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!root.current) return;
    const elapsed =
      start.current === null ? 10 : (performance.now() - start.current) / 1000;
    const progress = props.assembling
      ? THREE.MathUtils.smoothstep(
          elapsed,
          1.2 + index * 0.07,
          3.5 + index * 0.07,
        )
      : 1;
    const spread = (1 - progress) * 2.8 + (props.exploded ? 0.65 : 0);
    const angle = index * 2.39996;
    const pivot = part.pivot || part.position;
    root.current.position.set(
      pivot[0] + Math.cos(angle) * spread,
      pivot[1] + Math.sin(angle * 1.3) * spread,
      pivot[2] + Math.sin(angle) * spread,
    );
    root.current.scale.setScalar(
      Math.max(0.001, THREE.MathUtils.smoothstep(elapsed, 0, 0.8)),
    );
    const t = props.task
      ? Math.max(0, (performance.now() - props.taskStart) / 1000)
      : 0;
    const pose = taskPose(props.kind, props.task, t);
    root.current.rotation.set(
      part.motion === "head" ? pose.nod : part.motion === "leg" ? pose.leg : 0,
      part.motion === "head"
        ? pose.head
        : part.motion === "propeller"
          ? pose.rotor
          : part.rotation?.[1] || 0,
      part.motion === "arm" ? pose.arm + pose.wave : 0,
    );
  });
  const offset = part.pivot
    ? (part.position.map((v, i) => v - part.pivot![i]) as [
        number,
        number,
        number,
      ])
    : ([0, 0, 0] as [number, number, number]);
  const active = props.selected === part.id;
  const material = (
    <meshStandardMaterial
      color={active ? "#c9ff8c" : part.color || "#b8c1b6"}
      metalness={0.72}
      roughness={0.29}
      wireframe={props.wireframe}
      emissive={active ? "#6d9b37" : "#000000"}
      emissiveIntensity={0.22}
    />
  );
  const events = {
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      props.onSelect(part.id);
    },
    onPointerOver: () => {
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      document.body.style.cursor = "auto";
    },
  };
  return (
    <group ref={root}>
      {part.shape === "sphere" ? (
        <mesh position={offset} {...events}>
          <sphereGeometry args={[part.size[0] / 2, 24, 16]} />
          {material}
        </mesh>
      ) : part.shape === "cylinder" ? (
        <mesh position={offset} {...events}>
          <cylinderGeometry
            args={[part.size[0] / 2, part.size[2] / 2, part.size[1], 24]}
          />
          {material}
        </mesh>
      ) : (
        <RoundedBox
          position={offset}
          args={part.size}
          radius={Math.min(...part.size) * 0.16}
          smoothness={3}
          {...events}
        >
          {material}
        </RoundedBox>
      )}
    </group>
  );
}
function World(props: Props) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.position.set(4, 3, 6);
    camera.lookAt(0, 1.35, 0);
  }, [camera, props.cameraReset]);
  const start = useRef<number | null>(null);
  const sent = useRef(false);
  const group = useRef<THREE.Group>(null);
  const particles = useRef<THREE.Points>(null);
  useEffect(() => {
    start.current = performance.now();
    sent.current = false;
  }, [props.replay, props.kind]);
  const positions = useMemo(
    () =>
      new Float32Array(
        Array.from({ length: 720 }, (_, i) => {
          const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
          return (x - Math.floor(x) - 0.5) * 9;
        }),
      ),
    [],
  );
  useFrame((state) => {
    const elapsed =
      start.current === null ? 0 : (performance.now() - start.current) / 1000;
    if (props.assembling && elapsed > 6 && !sent.current) {
      sent.current = true;
      props.onComplete();
    }
    if (group.current) {
      const pose = taskPose(
        props.kind,
        props.task,
        props.task ? (performance.now() - props.taskStart) / 1000 : 0,
      );
      group.current.position.y = pose.lift;
      if (!props.assembling && !props.task && !props.reduced)
        group.current.rotation.y = state.pointer.x * 0.12;
    }
    if (particles.current) {
      particles.current.rotation.y = props.reduced
        ? 0
        : state.clock.elapsedTime * 0.025;
      const mat = particles.current.material as THREE.PointsMaterial;
      mat.opacity = props.assembling ? Math.max(0.08, 1 - elapsed / 6) : 0.18;
    }
  });
  return (
    <>
      <color attach="background" args={["#080b09"]} />
      <fog attach="fog" args={["#080b09", 8, 23]} />
      <ambientLight intensity={0.65} />
      <hemisphereLight args={["#d1e5d5", "#101a12", 1.5]} />
      <spotLight
        position={[4, 7, 4]}
        angle={0.5}
        penumbra={1}
        intensity={90}
        color="#e0f4df"
      />
      <pointLight position={[-4, 3, -2]} intensity={28} color="#a2ff64" />
      <pointLight position={[2, 2, -4]} intensity={45} color="#a1b8cf" />
      <group ref={group} rotation={[0, -0.32, 0]}>
        {ROBOTS[props.kind].parts.map((part, index) => (
          <Piece
            key={part.id}
            part={part}
            index={index}
            props={props}
            start={start}
          />
        ))}
      </group>
      <points ref={particles}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#b7db9c"
          size={0.014}
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </points>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <circleGeometry args={[3.4, 96]} />
        <meshStandardMaterial color="#111912" metalness={0.7} roughness={0.5} />
      </mesh>
      {[2.2, 2.7, 3.35].map((r) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
          <ringGeometry args={[r, r + 0.008, 128]} />
          <meshBasicMaterial color="#52644a" transparent opacity={0.4} />
        </mesh>
      ))}
      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.55}
        scale={12}
        blur={2}
        far={5}
        resolution={256}
      />
      <OrbitControls
        key={props.cameraReset}
        makeDefault
        target={[0, 1.35, 0]}
        minDistance={3}
        maxDistance={12}
        maxPolarAngle={Math.PI * 0.49}
        enablePan={false}
        autoRotate={!props.assembling && !props.task && !props.reduced}
        autoRotateSpeed={0.24}
      />
    </>
  );
}
export default function AriseScene(props: Props) {
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    setSupported(!!gl);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  }, []);
  useEffect(() => {
    if (supported === false && props.assembling) {
      const timer = setTimeout(props.onComplete, 6000);
      return () => clearTimeout(timer);
    }
  }, [supported, props.assembling, props.onComplete]);
  if (supported === false)
    return (
      <div className="webgl-message">
        WebGL 2 is unavailable on this device. Component inspection and learning
        remain available below.
      </div>
    );
  if (supported === null) return null;
  return (
    <SceneBoundary>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [4, 3, 6], fov: 38 }}
        gl={{ antialias: true, powerPreference: "low-power" }}
        onCreated={({ gl }) => {
          gl.domElement.setAttribute(
            "aria-label",
            `${ROBOTS[props.kind].name} interactive 3D model`,
          );
        }}
      >
        <World {...props} />
      </Canvas>
    </SceneBoundary>
  );
}
