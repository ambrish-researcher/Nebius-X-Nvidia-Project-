"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  RoundedBox,
  Html,
  Line,
  TransformControls,
} from "@react-three/drei";
import { useShallow } from "zustand/react/shallow";
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
import { CinematicWorld, ComputeSculpture } from "./cinematic-scene";
import { useCinema, componentPose } from "../lib/cinema";
import { useMotionPreference } from "../lib/use-motion-preference";
import { useLab, assemblyOrder } from "../lib/store";
import { useRenderer } from "../lib/renderer";
import type { ComponentSpec } from "../lib/types";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";

function measuredFrame() {
  const s = useLab.getState();
  const run = s.runs.at(-1);
  return s.section === "simulate" && run && run.robot_id === s.robot?.id
    ? run.frames[Math.min(s.playhead, run.frames.length - 1)]
    : undefined;
}

function Part({ part, order }: { part: ComponentSpec; order: number }) {
  const ref = useRef<THREE.Group>(null!);
  const dragging = useRef(false);
  const { invalidate } = useThree();
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
    transformMode,
    inspectionOffsets,
    section,
  } = useLab(
    useShallow((s) => ({
      selected: s.selected,
      exploded: s.exploded,
      transparent: s.transparent,
      isolate: s.isolate,
      annotations: s.annotations,
      replay: s.replay,
      speed: s.speed,
      set: s.set,
      playing: s.playing,
      transformMode: s.transformMode,
      inspectionOffsets: s.inspectionOffsets,
      section: s.section,
    })),
  );
  const start = useRef(0);
  const elapsed = useRef(0);
  const isWheel =
    part.kind === "actuator" &&
    part.shape === "cylinder" &&
    /wheel/i.test(part.id + " " + part.name);
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
    if (dragging.current) return;
    if (!start.current) start.current = state.clock.elapsedTime;
    // Slow renderers may skip visual samples; they must not stretch construction.
    elapsed.current += dt * speed;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const progress = reduced
      ? 1
      : THREE.MathUtils.smoothstep(elapsed.current - order * 0.55, 0, 1.2);
    const cinema = useCinema.getState();
    if (!useLab.getState().entered && cinema.phase === "transform") {
      // The cinematic timeline owns construction. Enter the lab fully assembled,
      // including on slow renderers where frame-counted elapsed time lags behind.
      elapsed.current = order * 0.55 + 1.2;
      const index =
        useLab
          .getState()
          .robot?.components.findIndex((c) => c.id === part.id) || 0;
      const pose = componentPose(part.position, order, cinema.time, index);
      ref.current.position.set(...pose.position);
      ref.current.rotation.set(
        part.rotation[0] + pose.spin,
        part.rotation[1] + pose.spin * 0.5,
        part.rotation[2],
      );
      ref.current.scale.setScalar(Math.max(0.001, pose.scale));
      return;
    }
    ref.current.rotation.set(...part.rotation);
    const spread = exploded ? 1 : (1 - progress) * 2.3;
    target.set(...part.position).addScaledVector(offset, spread);
    if (section !== "simulate" && inspectionOffsets[part.id])
      target.add(new THREE.Vector3(...inspectionOffsets[part.id]));
    if (reduced) ref.current.position.copy(target);
    else ref.current.position.lerp(target, Math.min(1, dt * 7));
    ref.current.scale.setScalar(Math.max(0.001, progress));
    const frame = measuredFrame();
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
      : part.appearance?.color ||
        (part.kind === "compute"
          ? "#394c30"
          : part.kind === "power"
            ? "#252e29"
            : part.kind === "sensor"
              ? "#68736c"
              : part.kind === "actuator"
                ? "#292d29"
                : "#a0a7a0");
  const [w, h, d] = part.size;
  const material = (
    <meshStandardMaterial
      color={color}
      metalness={part.appearance?.metalness ?? (isWheel ? 0.25 : 0.75)}
      roughness={part.appearance?.roughness ?? (isWheel ? 0.7 : 0.3)}
      transparent={transparent}
      opacity={transparent ? 0.3 : 1}
      emissive={selectedPart ? "#385318" : "#000000"}
      emissiveIntensity={0.25}
    />
  );
  return (
    <>
      <group
        ref={ref}
        position={[...part.position]}
        rotation={[...part.rotation]}
        onClick={(e) => {
          e.stopPropagation();
          useLab.getState().inspect(part.id);
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
        {selectedPart &&
          annotations &&
          !playing &&
          useLab.getState().section === "inspect" && (
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
      {selectedPart &&
        section === "inspect" &&
        transformMode === "translate" &&
        !exploded && (
          <TransformControls
            object={ref}
            mode="translate"
            size={0.7}
            onMouseDown={() => {
              dragging.current = true;
            }}
            onObjectChange={() => invalidate()}
            onMouseUp={() => {
              dragging.current = false;
              if (!ref.current) return;
              const next = ref.current.position
                .toArray()
                .map((n, i) =>
                  Math.max(-5, Math.min(5, n - part.position[i])),
                ) as [number, number, number];
              set({
                inspectionOffsets: {
                  ...useLab.getState().inspectionOffsets,
                  [part.id]: next,
                },
              });
              invalidate();
            }}
          />
        )}
    </>
  );
}

function Robot() {
  const { robot, assembly, runs, section } = useLab(
    useShallow((s) => ({
      robot: s.robot,
      assembly: s.assembly,
      runs: s.runs,
      section: s.section,
    })),
  );
  const group = useRef<THREE.Group>(null);
  const run = runs.at(-1);
  const trajectory = useMemo(
    () =>
      run?.frames.map(
        (f) =>
          [f.position[0], 0.015, f.position[2]] as [number, number, number],
      ) || [],
    [run],
  );
  const origin = useMemo(() => new THREE.Vector3(), []);
  const identity = useMemo(() => new THREE.Quaternion(), []);
  useFrame(() => {
    const frame = measuredFrame();
    if (group.current) {
      if (frame) {
        group.current.position.set(
          frame.position[0],
          frame.position[1],
          frame.position[2],
        );
        const [w, x, y, z] = frame.quaternion;
        group.current.quaternion.set(-x, -z, -y, w).normalize();
      } else if (
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        group.current.position.set(0, 0, 0);
        group.current.quaternion.identity();
      } else {
        group.current.position.lerp(origin, 0.1);
        group.current.quaternion.slerp(identity, 0.1);
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
          />
        ))}
      </group>
      {section === "simulate" && run && run.frames.length > 1 && (
        <Line
          points={trajectory}
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
  const { camera, selected, robot, section, entered, followRobot } = useLab(
    useShallow((s) => ({
      camera: s.camera,
      selected: s.selected,
      robot: s.robot,
      section: s.section,
      entered: s.entered,
      followRobot: s.followRobot,
    })),
  );
  const runId = useLab((s) => s.runs.at(-1)?.id);
  const { camera: threeCamera, size } = useThree();
  const destination = useRef(new THREE.Vector3(2.3, 1.7, 2.5));
  const target = useRef(new THREE.Vector3(0, 0.4, 0));
  const animating = useRef(true);
  const previousPosition = useRef(new THREE.Vector3());
  useEffect(() => {
    const projection = threeCamera as THREE.PerspectiveCamera;
    if (projection.isPerspectiveCamera) {
      // The studio has a dedicated center viewport; no overlay compensation.
      projection.clearViewOffset();
    }
    const part = robot?.components.find((c) => c.id === selected);
    target.current.set(
      ...((part && section === "inspect" ? part.position : [0, 0.4, 0]) as [
        number,
        number,
        number,
      ]),
    );
    let scale = robot
      ? Math.max(
          ...robot.dimensions_m,
          ...robot.components.flatMap((c) =>
            c.position.map((n, i) => Math.abs(n) * 2 + c.size[i]),
          ),
          1,
        )
      : 1.2;
    const recorded =
      section === "simulate" ? useLab.getState().runs.at(-1) : undefined;
    if (recorded && !followRobot) {
      const xs = recorded.frames.map((f) => f.position[0]);
      const zs = recorded.frames.map((f) => f.position[2]);
      target.current.x += (Math.min(...xs) + Math.max(...xs)) / 2;
      target.current.z += (Math.min(...zs) + Math.max(...zs)) / 2;
      scale = Math.max(
        scale,
        (Math.max(...xs) - Math.min(...xs) + scale) * 0.75,
        Math.max(...zs) - Math.min(...zs),
      );
    }
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
    if (section === "compute") {
      target.current.set(-0.5, 0.65, -0.25);
      destination.current
        .copy(target.current)
        .add(new THREE.Vector3(3.1, 1.8, 4.1));
    }
    const lab = useLab.getState();
    const pose =
      section === "simulate" && followRobot
        ? lab.runs.at(-1)?.frames[lab.playhead]?.position
        : undefined;
    if (pose) {
      const offset = new THREE.Vector3(...pose);
      destination.current.add(offset);
      target.current.add(offset);
      previousPosition.current.copy(offset);
    }
    animating.current = true;
  }, [
    camera,
    selected,
    robot,
    section,
    entered,
    runId,
    followRobot,
    size.width,
    size.height,
    threeCamera,
  ]);
  useFrame((_, dt) => {
    if (!useLab.getState().entered) return;
    const s = useLab.getState();
    const f = s.followRobot ? measuredFrame() : undefined;
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
      const fraction = window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches
        ? 1
        : Math.min(1, dt * 3);
      threeCamera.position.lerp(destination.current, fraction);
      controls.current.target.lerp(target.current, fraction);
      controls.current.update();
      if (threeCamera.position.distanceTo(destination.current) < 0.01)
        animating.current = false;
    }
  });
  return (
    <OrbitControls
      ref={controls}
      enabled={entered}
      makeDefault
      minDistance={0.5}
      maxDistance={160}
      maxPolarAngle={Math.PI / 2 - 0.015}
      enableDamping
      dampingFactor={0.07}
      onStart={() => {
        animating.current = false;
      }}
      autoRotate={false}
      autoRotateSpeed={0.28}
    />
  );
}
function Performance({
  onSlow,
  staticFrame,
}: {
  onSlow: (ratio: number) => void;
  staticFrame: boolean;
}) {
  const frames = useRef(0),
    elapsed = useRef(0);
  const { gl, invalidate } = useThree();
  useEffect(() => useLab.subscribe(() => invalidate()), [invalidate]);
  useEffect(() => {
    const context = gl.getContext();
    const info = context.getExtension("WEBGL_debug_renderer_info");
    const read = (parameter: number) =>
      String(context.getParameter(parameter) || "Not disclosed");
    useRenderer.setState({
      status: "available",
      version: read(context.VERSION),
      renderer: read(info ? info.UNMASKED_RENDERER_WEBGL : context.RENDERER),
      vendor: read(info ? info.UNMASKED_VENDOR_WEBGL : context.VENDOR),
    });
    const lost = () => {
      useRenderer.setState({ status: "lost", fps: null });
      useLab.getState().set({ playing: false, renderedRobotId: null });
    };
    const restored = () => {
      useRenderer.setState({ status: "available" });
      invalidate();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    gl.domElement.addEventListener("webglcontextrestored", restored);
    return () => {
      gl.domElement.removeEventListener("webglcontextlost", lost);
      gl.domElement.removeEventListener("webglcontextrestored", restored);
    };
  }, [gl, invalidate]);
  useEffect(() => {
    frames.current = 0;
    elapsed.current = 0;
    useRenderer.setState({ demand: staticFrame, fps: null });
    const node = document.getElementById("render-fps");
    if (node)
      node.textContent = staticFrame
        ? "STATIC VIEW · REDRAW ON INTERACTION"
        : "RENDER RATE · MEASURING";
  }, [staticFrame]);
  useFrame((_, dt) => {
    if (staticFrame) {
      const current = useRenderer.getState();
      if (
        current.calls !== gl.info.render.calls ||
        current.triangles !== gl.info.render.triangles
      )
        useRenderer.setState({
          calls: gl.info.render.calls,
          triangles: gl.info.render.triangles,
        });
      return;
    }
    frames.current++;
    elapsed.current += dt;
    if (elapsed.current > 2) {
      const fps = frames.current / elapsed.current;
      const node = document.getElementById("render-fps");
      if (node) node.textContent = `${Math.round(fps)} FPS · LIVE`;
      useRenderer.setState({
        fps,
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
      });
      if (fps < 22) {
        onSlow(Math.max(0.35, Math.min(0.75, gl.getPixelRatio() * 0.75)));
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
  componentDidCatch() {
    useRenderer.setState({ status: "error", fps: null });
    useLab.getState().set({ renderedRobotId: null });
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
  const entered = useLab((s) => s.entered);
  const playing = useLab((s) => s.playing);
  const reduced = useMotionPreference();
  const phase = useCinema((s) => s.phase);
  const paused = useCinema((s) => s.paused);
  const duration = useCinema((s) => s.duration);
  const staticFrame = reduced && !playing && (entered || paused || !duration);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [low, setLow] = useState(false);
  const [pixelRatio, setPixelRatio] = useState(0.75);
  useEffect(() => {
    const c = document.createElement("canvas");
    const context = c.getContext("webgl2") || c.getContext("webgl");
    if (context) {
      const info = context.getExtension("WEBGL_debug_renderer_info");
      const renderer = info
        ? String(context.getParameter(info.UNMASKED_RENDERER_WEBGL))
        : "";
      // Software WebGL should not first compile the expensive shadow/DPR path.
      // GPU-capable browsers retain the existing quality and adaptive controls.
      if (/swiftshader|llvmpipe|software/i.test(renderer)) {
        setLow(true);
        setPixelRatio(0.5);
      }
      context.getExtension("WEBGL_lose_context")?.loseContext();
    }
    setSupported(!!context);
    if (!context) useRenderer.setState({ status: "unavailable", fps: null });
  }, []);
  if (supported === null)
    return <div className="scene-loading">INITIALIZING CONSTRUCTION LAB</div>;
  return (
    <SceneBoundary>
      {supported ? (
        <Canvas
          frameloop={staticFrame ? "demand" : "always"}
          shadows={!low}
          dpr={low ? pixelRatio : [1, 1.5]}
          camera={{ position: [2.8, 2, 3], fov: 35, near: 0.01, far: 300 }}
          gl={{ antialias: !low, powerPreference: "high-performance" }}
          onPointerMissed={(event) => {
            if (
              (event.target as HTMLElement)?.tagName === "CANVAS" &&
              useLab.getState().transformMode === "off"
            )
              useLab.getState().set({ selected: null });
          }}
        >
          <color
            attach="background"
            args={[
              entered ? "#111217" : phase === "reveal" ? "#000000" : "#060609",
            ]}
          />
          <fog attach="fog" args={[entered ? "#111217" : "#060609", 9, 23]} />
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
            position={[0, entered ? -0.009 : -0.58, 0]}
            receiveShadow
          >
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial
              color={entered ? "#0e141b" : "#07070d"}
              roughness={0.95}
            />
          </mesh>
          <gridHelper
            visible={entered}
            args={[40, 80, "#526a7d", "#2b3d4c"]}
            position={[0, 0.001, 0]}
          />
          <group visible={entered || phase === "transform"}>
            <Robot />
          </group>
          <CinematicWorld />
          <ComputeSculpture />
          <CameraRig />
          <RenderEvidence />
          <Performance
            staticFrame={staticFrame}
            onSlow={(ratio) => {
              setLow(true);
              setPixelRatio(ratio);
            }}
          />
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

function RenderEvidence() {
  const { invalidate } = useThree();
  const previous = useRef<unknown>(null),
    frames = useRef(0);
  useFrame(() => {
    const s = useLab.getState();
    if (!s.entered || !s.robot || s.renderedRobotId === s.robot.id) return;
    if (previous.current !== s.robot) {
      previous.current = s.robot;
      frames.current = 0;
    }
    frames.current++;
    if (frames.current >= 2) s.set({ renderedRobotId: s.robot.id });
    else invalidate();
  });
  return null;
}
