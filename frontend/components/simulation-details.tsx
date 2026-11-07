"use client";
import { useContext, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import {
  State,
  Surface,
  Block,
  Batch,
  Part,
  Joint,
  Flow,
  Label,
  Reveal,
  type Vec,
} from "./simulation-geometry";

import { LinkCheeks, RobotFoot, Fasteners } from "./simulation-machined";
import { useGeometry } from "./simulation-resources";

// All dimensions, trace routes and semiconductor shapes are original illustrations.
export function Etch({
  text,
  at,
  width = 1,
  front = false,
}: {
  text: string;
  at: Vec;
  width?: number;
  front?: boolean;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 192;
    const c = canvas.getContext("2d")!;
    let fontSize = 128;
    c.font = `${fontSize}px Arial`;
    while (c.measureText(text).width > 980 && fontSize > 24)
      c.font = `${--fontSize}px Arial`;
    c.fillStyle = "#dcebc9";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(text, 512, 96, 1000);
    return new THREE.CanvasTexture(canvas);
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh
      position={at}
      rotation={front ? [0, 0, 0] : [-Math.PI / 2, 0, 0]}
      raycast={() => {}}
    >
      <planeGeometry args={[width, (width * 192) / 1024]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
export function Screw({ at, radius = 0.035 }: { at: Vec; radius?: number }) {
  return (
    <group position={at}>
      <mesh>
        <cylinderGeometry args={[radius, radius, 0.025, 6]} />
        <Surface color="#a8b39a" />
      </mesh>
      <Block
        at={[0, 0.014, 0]}
        size={[radius * 1.4, 0.004, radius * 0.22]}
        color="#121c14"
        round={false}
      />
    </group>
  );
}
export function Pipe({
  points,
  radius = 0.035,
  color = "#6e8878",
}: {
  points: Vec[];
  radius?: number;
  color?: string;
}) {
  const key = JSON.stringify(points);
  const geometry = useGeometry("pipe:" + radius + key, () => {
    const curve = new THREE.CatmullRomCurve3(
      (JSON.parse(key) as Vec[]).map((p) => new THREE.Vector3(...p)),
    );
    return new THREE.TubeGeometry(curve, 32, radius, 10, false);
  });
  return (
    <mesh geometry={geometry} castShadow>
      <Surface color={color} />
    </mesh>
  );
}
export function ActivityMatrix({
  at,
  columns,
  rows,
  pitch = 0.12,
  serial = false,
}: {
  at: Vec;
  columns: number;
  rows: number;
  pitch?: number;
  serial?: boolean;
}) {
  const { time, reduced, wireframe, building } = useContext(State);
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const colors = useMemo(
    () => [
      new THREE.Color("#253c29"),
      new THREE.Color("#bcf58c"),
      new THREE.Color("#648e4b"),
    ],
    [],
  );
  useEffect(() => {
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < columns * rows; i++) {
      matrix.makeTranslation(
        (i % columns) * pitch,
        0,
        Math.floor(i / columns) * pitch,
      );
      mesh.current.setMatrixAt(i, matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [columns, rows, pitch]);
  const previousPhase = useRef(-1);
  const reveal = useContext(Reveal);
  useFrame(() => {
    const phase = reduced || building ? 0 : Math.floor(time.current * 4);
    if (phase === previousPhase.current) return;
    previousPhase.current = phase;
    for (let i = 0; i < columns * rows; i++) {
      const active = serial
        ? i === phase % (columns * rows)
        : ((i % columns) + Math.floor(i / columns) + phase) % 5 < 2;
      mesh.current.setColorAt(i, colors[active ? 1 : serial ? 0 : 2]);
    }
    if (mesh.current.instanceColor)
      mesh.current.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      position={at}
      args={[undefined, undefined, columns * rows]}
    >
      <boxGeometry args={[pitch * 0.76, 0.045, pitch * 0.76]} />
      <meshStandardMaterial
        clippingPlanes={reveal?.planes}
        clipShadows
        metalness={0.35}
        roughness={0.35}
        wireframe={wireframe}
      />
    </instancedMesh>
  );
}
function CopperTraces({ width, depth }: { width: number; depth: number }) {
  const geometry = useGeometry(`traces:${width}:${depth}`, () => {
    const vertices: number[] = [];
    for (let i = 0; i < 9; i++) {
      const points = [
        [-width * 0.42, 0.035, -depth * 0.35 + i * depth * 0.08],
        [-width * 0.18, 0.035, -depth * 0.35 + i * depth * 0.08],
        [width * 0.01, 0.035, -depth * 0.18 + i * depth * 0.08],
        [width * 0.42, 0.035, -depth * 0.18 + i * depth * 0.08],
      ];
      for (let j = 0; j < 3; j++) vertices.push(...points[j], ...points[j + 1]);
    }
    return new THREE.BufferGeometry().setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
  });
  const reveal = useContext(Reveal);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        color="#93b574"
        transparent
        opacity={0.7}
        clippingPlanes={reveal?.planes}
      />
    </lineSegments>
  );
}
export function BoardDetails({
  at = [0, 0, 0],
  width = 3,
  depth = 2,
}: {
  at?: Vec;
  width?: number;
  depth?: number;
}) {
  const contacts = useMemo(
    () =>
      Array.from(
        { length: 52 },
        (_, i) =>
          [
            -width * 0.44 + ((i % 26) * width * 0.88) / 25,
            0.04,
            (i < 26 ? -1 : 1) * depth * 0.45,
          ] as Vec,
      ),
    [width, depth],
  );
  return (
    <group position={at}>
      <Batch
        positions={contacts}
        size={[0.035, 0.035, 0.065]}
        color="#b0a477"
      />
      <CopperTraces width={width} depth={depth} />
      <Fasteners
        positions={[-1, 1].flatMap((x) =>
          [-1, 1].map((z) => [x * width * 0.46, 0.03, z * depth * 0.42] as Vec),
        )}
      />
    </group>
  );
}
export function RackTrayDetail() {
  const { focus } = useContext(State);
  const memory = focus === "memory";
  return (
    <>
      <Part
        id="tray"
        name="One compute tray · illustrative placement"
        at={[0, 1.1, 1.9]}
        labelAt={[0, 0.6, 0]}
      >
        <Block size={[4.4, 0.12, 2.8]} color="#304d38" />
        <BoardDetails width={4.3} depth={2.7} at={[0, 0.08, 0]} />
        {[-1, 1].map((x) => (
          <Block
            key={x}
            at={[x * 2.22, 0.03, 0]}
            size={[0.07, 0.22, 3]}
            color="#87917d"
          />
        ))}
        <Block at={[0, 0.04, 1.46]} size={[4.5, 0.23, 0.12]} color="#384437" />
        <Etch
          text="ONE COMPUTE TRAY / SCHEMATIC"
          at={[0, 0.18, 1.1]}
          width={2.4}
        />
      </Part>
      <Part
        id="cpu"
        name="Vera CPUs · software coordination"
        labelAt={[-1.1, 2, 1.1]}
      >
        {[-1, 1].map((x, i) => (
          <group key={x} position={[x * 1.1, 1.34, 1.05]}>
            <Block size={[0.78, 0.13, 0.7]} color="#aebba0" />
            <ActivityMatrix
              at={[-0.26, 0.1, -0.22]}
              columns={5}
              rows={4}
              pitch={0.12}
              serial
            />
            <Etch text="VERA CPU" at={[0, 0.11, 0.28]} width={0.6} />
            <Part id={"cpu-cover-" + i} name="CPU cold plate" at={[0, 0.22, 0]}>
              <Block size={[0.83, 0.07, 0.74]} color="#93a38c" />
              <Screw at={[-0.3, 0.04, -0.25]} />
              <Screw at={[0.3, 0.04, 0.25]} />
            </Part>
          </group>
        ))}
      </Part>
      <Part id="gpu" name="Four Rubin GPUs in this tray" labelAt={[0, 2, 2.6]}>
        {[-1.5, -0.5, 0.5, 1.5].map((x, i) => (
          <group key={x} position={[x, 1.34, 2.5]}>
            <Block size={[0.82, 0.13, 0.8]} color="#35423a" />
            <ActivityMatrix
              at={[-0.27, 0.1, -0.25]}
              columns={5}
              rows={4}
              pitch={0.12}
            />
            <Etch text="RUBIN GPU" at={[0, 0.105, 0.32]} width={0.66} />
            <Part id={"gpu-cover-" + i} name="GPU cold plate" at={[0, 0.22, 0]}>
              <Block size={[0.86, 0.07, 0.84]} color="#7f9777" />
              {[-1, 1].map((z) => (
                <Pipe
                  key={z}
                  points={[
                    [-0.34, 0.07, z * 0.25],
                    [0, 0.07, z * 0.25],
                    [0.34, 0.07, z * 0.25],
                  ]}
                  radius={0.025}
                />
              ))}
            </Part>
          </group>
        ))}
      </Part>
      <Part
        id="memory"
        name="LPDDR5X and HBM4 · illustrative layers"
        labelAt={[0, 3, 1.9]}
      >
        {[-1, 1].flatMap((x) =>
          [0, 1, 2].map((i) => (
            <Part
              key={x + ":" + i}
              id={"lpddr-" + x + "-" + i}
              name="CPU working memory"
              at={[x * 1.85, 1.38, 0.65 + i * 0.28]}
            >
              <Block size={[0.25, 0.12, 0.2]} color="#7f9773" />
            </Part>
          )),
        )}
        {memory && (
          <group position={[0, 1.75, 1.75]}>
            {Array.from({ length: 5 }, (_, i) => (
              <Part
                key={i}
                id={"hbm-layer-" + i}
                name="Conceptual memory layer"
                at={[0, i * 0.07, 0]}
              >
                <Block
                  size={[0.75, 0.045, 0.6]}
                  color={i % 2 ? "#779668" : "#b5c79e"}
                />
                <Batch
                  positions={Array.from(
                    { length: 16 },
                    (_, j) =>
                      [
                        -0.27 + (j % 4) * 0.18,
                        0.035,
                        -0.2 + Math.floor(j / 4) * 0.13,
                      ] as Vec,
                  )}
                  size={[0.025, 0.035, 0.025]}
                  color="#c6b98b"
                />
              </Part>
            ))}
            <Etch text="HBM4 / CONCEPT" at={[0, 1.11, 0]} width={0.95} />
          </group>
        )}
      </Part>
      <Flow
        points={[
          [-1.8, 1.65, 0.7],
          [-1.1, 1.65, 1.1],
          [-0.6, 1.65, 1.9],
          [0.5, 1.65, 2.5],
          [1.5, 1.65, 2.5],
        ]}
        radius={0.03}
      />
      {memory && (
        <Flow
          points={[
            [0, 2.9, 1.75],
            [0.35, 2.1, 1.9],
            [0.5, 1.55, 2.5],
          ]}
          radius={0.03}
          rate={0.35}
        />
      )}
    </>
  );
}
export function WaferLab() {
  const scan = useRef<THREE.Mesh>(null!);
  const { time, reduced, wireframe } = useContext(State);
  const dies = useMemo(
    () =>
      Array.from(
        { length: 121 },
        (_, i) =>
          [((i % 11) - 5) * 0.25, 0.05, (Math.floor(i / 11) - 5) * 0.25] as Vec,
      ).filter((p) => Math.hypot(p[0], p[2]) < 1.29),
    [],
  );
  useFrame(() => {
    scan.current.position.z = reduced ? 0 : Math.sin(time.current * 0.8) * 1.1;
  });
  return (
    <>
      <Part
        id="wafer"
        name="Wafer → repeated dies → layered chip"
        at={[-1.2, 0.8, 0]}
        labelAt={[0, 0.15, 0]}
      >
        <mesh>
          <cylinderGeometry args={[1.5, 1.5, 0.07, 96]} />
          <meshPhysicalMaterial
            color="#7c9188"
            metalness={0.8}
            roughness={0.18}
            iridescence={0.8}
            wireframe={wireframe}
          />
        </mesh>
        <Batch positions={dies} size={[0.21, 0.025, 0.21]} color="#42694f" />
        <Batch
          positions={dies.map((p) => [p[0] - 0.045, 0.07, p[2]] as Vec)}
          size={[0.045, 0.015, 0.15]}
          color="#99b37e"
        />
        <mesh ref={scan} position={[0, 0.1, 0]}>
          <boxGeometry args={[2.7, 0.015, 0.045]} />
          <meshBasicMaterial color="#c3ff99" transparent opacity={0.75} />
        </mesh>
        <Etch
          text="REPEATED DIES / GENERAL CONCEPT"
          at={[0, 0.08, 1.42]}
          width={1.7}
        />
      </Part>
      <group position={[1.15, 0.85, 0]}>
        {["SUBSTRATE", "DEVICES", "INSULATOR", "METAL CONNECTIONS"].map(
          (label, i) => (
            <Part
              key={label}
              id={"fabrication-" + i}
              name={label}
              at={[0, i * 0.1, 0]}
            >
              <Block
                size={[1.5, 0.09, 1.35]}
                color={["#6d8178", "#9bbe84", "#a8b1a1", "#8ba56f"][i]}
              />
              {i === 1 && (
                <ActivityMatrix
                  at={[-0.55, 0.08, -0.5]}
                  columns={6}
                  rows={5}
                  pitch={0.2}
                />
              )}
              {i === 3 && (
                <BoardDetails width={1.4} depth={1.25} at={[0, 0.055, 0]} />
              )}
              <Etch text={label} at={[0, 0.055, 0.52]} width={1.05} />
            </Part>
          ),
        )}
      </group>
      <Line
        points={[
          [-0.3, 0.95, 0],
          [0.1, 1.5, 0],
          [0.4, 1.5, 0],
        ]}
        color="#bddf96"
        dashed
        dashSize={0.07}
        gapSize={0.05}
      />
    </>
  );
}
function Switch({ at, signal }: { at: Vec; signal: (t: number) => boolean }) {
  const { time, reduced, wireframe } = useContext(State);
  const channel = useRef<THREE.MeshStandardMaterial>(null!);
  const gate = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(() => {
    const on = signal(reduced ? 0 : time.current);
    channel.current.emissiveIntensity = on ? 1.4 : 0;
    gate.current.emissiveIntensity = on ? 0.8 : 0.05;
  });
  return (
    <group position={at}>
      <Block size={[1.8, 0.2, 1.1]} color="#667d70" />
      {[-1, 1].map((x) => (
        <group key={x}>
          <Block
            at={[x * 0.65, 0.18, 0]}
            size={[0.42, 0.16, 0.9]}
            color="#a7c292"
          />
          <Block
            at={[x * 0.65, 0.4, 0]}
            size={[0.16, 0.4, 0.38]}
            color="#b4baa4"
          />
          <Screw at={[x * 0.65, 0.61, 0]} radius={0.065} />
        </group>
      ))}
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.9, 0.08, 0.5]} />
        <meshStandardMaterial
          ref={channel}
          wireframe={wireframe}
          color="#478157"
          emissive="#a8f178"
        />
      </mesh>
      <Block at={[0, 0.25, 0]} size={[0.35, 0.06, 0.95]} color="#b9c9b1" />
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.18, 0.4, 1]} />
        <meshStandardMaterial
          ref={gate}
          color="#7da852"
          emissive="#b4ed73"
          wireframe={wireframe}
        />
      </mesh>
    </group>
  );
}
function SignalBit({
  at,
  sample,
  prefix = "",
}: {
  at: Vec;
  sample: (t: number) => boolean;
  prefix?: string;
}) {
  const { time, reduced } = useContext(State);
  const zero = useRef<THREE.Group>(null!),
    one = useRef<THREE.Group>(null!);
  useFrame(() => {
    const on = sample(reduced ? 0 : time.current);
    zero.current.visible = !on;
    one.current.visible = on;
  });
  return (
    <group position={at}>
      <group ref={zero}>
        <Label
          text={prefix ? prefix + " = 0" : "0"}
          at={[0, 0, 0]}
          width={0.4}
        />
      </group>
      <group ref={one}>
        <Label
          text={prefix ? prefix + " = 1" : "1"}
          at={[0, 0, 0]}
          width={0.4}
        />
      </group>
    </group>
  );
}
export function TransistorLab() {
  const on = (t: number) => Math.floor(t / 1.5) % 2 === 1;
  const flow = useRef<THREE.Group>(null!);
  const { time, reduced } = useContext(State);
  useFrame(() => {
    flow.current.visible = on(reduced ? 0 : time.current);
  });
  return (
    <>
      <Part
        id="transistor"
        name="Gate controls conduction · generic concept"
        at={[0, 1.1, 0]}
        labelAt={[0, 1.4, 0]}
      >
        <Switch at={[0, 0, 0]} signal={on} />
        <Etch text="SOURCE" at={[-0.65, 0.64, 0]} width={0.55} />
        <Etch text="DRAIN" at={[0.65, 0.64, 0]} width={0.5} />
        <Etch text="GATE" at={[0, 0.74, 0]} width={0.5} />
        <Etch
          text="CHANNEL / INSULATING LAYER ABOVE"
          at={[0, 0.12, 0.7]}
          width={1.7}
        />
        <SignalBit at={[0, 1, 0]} sample={on} prefix="Gate" />
        <Pipe
          points={[
            [-1.6, 0.2, 0],
            [-1.2, 0.2, 0],
            [-0.7, 0.2, 0],
          ]}
        />
        <Pipe
          points={[
            [0.7, 0.2, 0],
            [1.2, 0.2, 0],
            [1.6, 0.2, 0],
          ]}
        />
        <group ref={flow}>
          <Flow
            points={[
              [-1.6, 0.28, 0],
              [-0.65, 0.28, 0],
              [0, 0.22, 0],
              [0.65, 0.28, 0],
              [1.6, 0.28, 0],
            ]}
            radius={0.035}
          />
        </group>
      </Part>
    </>
  );
}
export function LogicLab() {
  const { time, reduced } = useContext(State);
  const a = (t: number) => Math.floor(t / 1.5) % 4 >= 2,
    b = (t: number) => Math.floor(t / 1.5) % 2 === 1;
  const output = useRef<THREE.Group>(null!),
    row = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    const t = reduced ? 0 : time.current;
    output.current.visible = a(t) && b(t);
    row.current.position.z = -0.4 + (Math.floor(t / 1.5) % 4) * 0.27;
  });
  return (
    <Part
      id="logic"
      name="AND logic · both inputs must be 1"
      at={[0, 1.1, 0]}
      labelAt={[0, 1.6, 0]}
    >
      <Block size={[3.7, 0.09, 2.3]} color="#243e2b" />
      <BoardDetails width={3.5} depth={2.1} at={[0, 0.08, 0]} />
      <group scale={0.65}>
        <Switch at={[-1.3, 0.25, 0]} signal={a} />
        <Switch at={[1.3, 0.25, 0]} signal={b} />
      </group>
      <Etch text="INPUT A" at={[-0.9, 0.8, 0]} width={0.65} />
      <Etch text="INPUT B" at={[0.9, 0.8, 0]} width={0.65} />
      <SignalBit at={[-0.9, 1, 0]} sample={a} prefix="A" />
      <SignalBit at={[0.9, 1, 0]} sample={b} prefix="B" />
      <Etch text="OUTPUT" at={[1.45, 0.12, 0.65]} width={0.6} />
      <SignalBit
        at={[1.7, 0.25, 1.5]}
        sample={(t) => a(t) && b(t)}
        prefix="Out"
      />
      <Line
        points={[
          [-1.65, 0.38, 0],
          [-0.1, 0.38, 0],
          [1.65, 0.38, 0],
          [1.65, 0.12, 0.7],
          [1.7, 0.2, 1.5],
        ]}
        color="#648957"
      />
      <group ref={output}>
        <Flow
          points={[
            [-1.65, 0.4, 0],
            [-0.8, 0.4, 0],
            [0.8, 0.4, 0],
            [1.65, 0.4, 0],
            [1.65, 0.15, 0.7],
            [1.7, 0.2, 1.5],
          ]}
          radius={0.03}
        />
      </group>
      <group position={[-2.4, 0.12, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh position={[0, -0.04, -0.13]}>
          <boxGeometry args={[1.45, 0.06, 1.65]} />
          <meshBasicMaterial color="#0e1d13" />
        </mesh>
        <mesh
          ref={row}
          position={[0, 0.005, -0.4]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[1.3, 0.22]} />
          <meshBasicMaterial color="#466339" />
        </mesh>
        {[
          "A  B  →  OUT",
          "0  0       0",
          "0  1       0",
          "1  0       0",
          "1  1       1",
        ].map((text, i) => (
          <Etch
            key={text}
            text={text}
            at={[0, 0.015, -0.67 + i * 0.27]}
            width={1.1}
          />
        ))}
      </group>
    </Part>
  );
}
export function DepthReturns() {
  const { time, reduced } = useContext(State);
  const data = useMemo(
    () => ({
      positions: new Float32Array(
        Array.from({ length: 64 }, (_, i) => [
          ((i % 8) - 3.5) * 0.18,
          1.3 + Math.floor(i / 8) * 0.13,
          2.2,
        ]).flat(),
      ),
      colors: new Float32Array(64 * 3),
    }),
    [],
  );
  const colors = useRef<THREE.BufferAttribute>(null!);
  const bright = useMemo(() => new THREE.Color("#caff9b"), []),
    dim = useMemo(() => new THREE.Color("#375a3a"), []);
  useFrame(() => {
    const row = reduced ? 0 : Math.floor(time.current * 4) % 8;
    for (let i = 0; i < 64; i++) {
      const color = Math.floor(i / 8) === row ? bright : dim;
      colors.current.setXYZ(i, color.r, color.g, color.b);
    }
    colors.current.needsUpdate = true;
  });
  return (
    <points raycast={() => {}}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[data.positions, 3]}
        />
        <bufferAttribute
          ref={colors}
          attach="attributes-color"
          args={[data.colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.045} vertexColors toneMapped={false} />
    </points>
  );
}
// A planted-foot, in-place gait. This solves geometry, not ground forces or balance.
export function WalkingLeg({ side }: { side: number }) {
  const { time, reduced, building } = useContext(State);
  const hip = useRef<THREE.Group>(null!),
    knee = useRef<THREE.Group>(null!),
    ankle = useRef<THREE.Group>(null!);
  const patch = useRef<THREE.Mesh>(null!),
    material = useRef<THREE.MeshBasicMaterial>(null!);
  useFrame(() => {
    const moving = !reduced && !building;
    const phase = moving ? (time.current / 1.65 + (side > 0 ? 0.5 : 0)) % 1 : 0;
    const swing = phase > 0.62 ? (phase - 0.62) / 0.38 : 0;
    const lift = swing ? 0.17 * Math.sin(Math.PI * swing) ** 2 : 0;
    const z = swing ? 0.2 * Math.sin(2 * Math.PI * swing) : 0;
    const y = -0.88 + lift,
      upper = 0.52,
      lower = 0.43;
    const bend = Math.acos(
      THREE.MathUtils.clamp(
        (y * y + z * z - upper * upper - lower * lower) / (2 * upper * lower),
        -1,
        1,
      ),
    );
    const angle =
      Math.atan2(-z, -y) -
      Math.atan2(lower * Math.sin(bend), upper + lower * Math.cos(bend));
    hip.current.rotation.x = angle;
    knee.current.rotation.x = bend;
    ankle.current.rotation.x = -angle - bend;
    patch.current.visible = !building;
    material.current.opacity = lift < 0.005 ? 0.85 : 0;
  });
  return (
    <group>
      <Joint at={[0, 0.04, 0]} />
      <Joint at={[side * 0.06, -0.05, 0.06]} radius={0.09} />
      <group ref={hip}>
        <Joint at={[0, -0.1, 0]} />
        <LinkCheeks length={0.52} width={0.27} />
        <group ref={knee} position={[0, -0.52, 0]}>
          <Joint />
          <LinkCheeks length={0.43} width={0.22} />
          <group ref={ankle} position={[0, -0.43, 0]}>
            <Joint radius={0.085} />
            <Joint at={[0, -0.09, 0.04]} radius={0.075} />
            <RobotFoot />
          </group>
        </group>
      </group>
      <mesh
        ref={patch}
        position={[0, -1.094, 0.16]}
        rotation={[-Math.PI / 2, 0, 0]}
        raycast={() => {}}
      >
        <planeGeometry args={[0.46, 0.74]} />
        <meshBasicMaterial
          ref={material}
          color="#b4ed73"
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
