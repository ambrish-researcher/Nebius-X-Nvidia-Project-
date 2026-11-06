"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  Line,
  OrbitControls,
  RoundedBox,
} from "@react-three/drei";
import {
  Component,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
  type ReactNode,
  type RefObject,
} from "react";
import * as THREE from "three";
import { EXPERIENCES, type ExperienceId } from "../lib/simulation-lessons";

type Vec = [number, number, number];
type Props = {
  kind: ExperienceId;
  step: number;
  time: RefObject<number>;
  reduced: boolean;
  reset: number;
  wireframe: boolean;
  explode: boolean;
  zoom: number;
  onInspect: (name: string) => void;
};
type SceneState = Props & {
  selected: string;
  select: (id: string, name: string) => void;
  focus: string;
};
const State = createContext<SceneState>(null!);
const Tint = createContext(false);
function Label({
  at,
  text,
  width = 2,
}: {
  at: Vec;
  text: string;
  width?: number;
}) {
  const sprite = useRef<THREE.Sprite>(null!),
    point = useRef(new THREE.Vector3()),
    projected = useRef(new THREE.Vector3());
  const short = width < 1;
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = short ? 256 : 768;
    canvas.height = short ? 96 : 120;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#0b160df2";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#badc9e";
    context.lineWidth = 3;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    let size = short ? 42 : 34;
    context.font = `${size}px Arial`;
    while (context.measureText(text).width > canvas.width - 35 && size > 18)
      context.font = `${--size}px Arial`;
    context.fillStyle = "#f1f7e9";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    return new THREE.CanvasTexture(canvas);
  }, [text, short]);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame(({ camera, size }) => {
    sprite.current.position.set(...at);
    sprite.current.updateWorldMatrix(true, false);
    const depth = -sprite.current
      .getWorldPosition(point.current)
      .applyMatrix4(camera.matrixWorldInverse).z;
    if (depth <= 0) return;
    const pixels = short ? 72 : Math.min(280, size.width * 0.75);
    const scale =
      (pixels * 2 * depth) / (size.width * camera.projectionMatrix.elements[0]);
    sprite.current.scale.set(
      scale,
      (scale * texture.image.height) / texture.image.width,
      1,
    );
    sprite.current.getWorldPosition(projected.current).project(camera);
    const marginX = (pixels + 24) / size.width;
    const marginY =
      ((pixels * texture.image.height) / texture.image.width + 24) /
      size.height;
    projected.current.x = THREE.MathUtils.clamp(
      projected.current.x,
      -1 + marginX,
      1 - marginX,
    );
    projected.current.y = THREE.MathUtils.clamp(
      projected.current.y,
      -1 + marginY,
      1 - marginY,
    );
    sprite.current.position.copy(
      sprite.current.parent!.worldToLocal(projected.current.unproject(camera)),
    );
  });
  return (
    <sprite
      ref={sprite}
      position={at}
      scale={[width, (width * 120) / 768, 1]}
      renderOrder={10}
      raycast={() => {}}
    >
      <spriteMaterial
        map={texture}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}
function Surface({
  color = "#737f76",
  emissive = false,
}: {
  color?: string;
  emissive?: boolean;
}) {
  const active = useContext(Tint),
    { wireframe } = useContext(State);
  return (
    <meshStandardMaterial
      color={active ? "#c2e8a0" : color}
      metalness={0.76}
      roughness={0.3}
      wireframe={wireframe}
      emissive={active || emissive ? "#7cb846" : "#000"}
      emissiveIntensity={active ? 0.2 : emissive ? 0.35 : 0}
    />
  );
}
function Block({
  at = [0, 0, 0],
  size,
  color,
  glow = false,
  round = true,
}: {
  at?: Vec;
  size: Vec;
  color?: string;
  glow?: boolean;
  round?: boolean;
}) {
  return round ? (
    <RoundedBox
      position={at}
      args={size}
      radius={Math.min(...size) * 0.12}
      smoothness={2}
    >
      <Surface color={color} emissive={glow} />
    </RoundedBox>
  ) : (
    <mesh position={at}>
      <boxGeometry args={size} />
      <Surface color={color} emissive={glow} />
    </mesh>
  );
}
function Batch({
  positions,
  size,
  color,
}: {
  positions: Vec[];
  size: Vec;
  color: string;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  useEffect(() => {
    const matrix = new THREE.Matrix4(),
      scale = new THREE.Vector3(...size),
      quaternion = new THREE.Quaternion();
    positions.forEach((p, i) => {
      matrix.compose(new THREE.Vector3(...p), quaternion, scale);
      mesh.current.setMatrixAt(i, matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [positions, size]);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, positions.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <Surface color={color} />
    </instancedMesh>
  );
}
function Part({
  id,
  name,
  at = [0, 0, 0],
  offset = [0, 0, 0],
  opened = false,
  labelAt = [0, 0.4, 0],
  children,
}: {
  id: string;
  name: string;
  at?: Vec;
  offset?: Vec;
  opened?: boolean;
  labelAt?: Vec;
  children: ReactNode;
}) {
  const s = useContext(State),
    root = useRef<THREE.Group>(null!);
  const active = s.selected === id || (!s.selected && s.focus === id);
  const target = useRef(new THREE.Vector3());
  useFrame((_, dt) => {
    const spread = s.explode || opened ? 1 : 0;
    target.current.set(
      at[0] + offset[0] * spread,
      at[1] + offset[1] * spread,
      at[2] + offset[2] * spread,
    );
    if (s.reduced) root.current.position.copy(target.current);
    else
      root.current.position.lerp(
        target.current,
        1 - Math.exp(-7 * Math.min(dt, 0.1)),
      );
  });
  return (
    <group
      ref={root}
      position={at}
      name={`sim-part:${id}`}
      onClick={(e) => {
        e.stopPropagation();
        s.select(id, name);
      }}
    >
      <Tint.Provider value={active}>{children}</Tint.Provider>
      {active && <Label at={labelAt} text={name} />}
    </group>
  );
}
function Joint({
  at = [0, 0, 0],
  radius = 0.1,
}: {
  at?: Vec;
  radius?: number;
}) {
  return (
    <group position={at}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius, radius, 0.15, 20]} />
        <Surface color="#363f37" />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[0.08, 0, 0]}>
        <torusGeometry args={[radius * 0.72, 0.014, 6, 24]} />
        <Surface color="#9eca6a" />
      </mesh>
    </group>
  );
}
function Flow({ points }: { points: Vec[] }) {
  const { time, reduced } = useContext(State);
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
    [points],
  );
  const group = useRef<THREE.Group>(null!);
  useFrame(() => {
    group.current.children.forEach((child, i) =>
      curve.getPoint(
        ((reduced ? 0 : time.current * 0.23) + i / 7) % 1,
        child.position,
      ),
    );
  });
  return (
    <>
      <Line
        points={points}
        color="#88b56b"
        lineWidth={1}
        transparent
        opacity={0.4}
      />
      <group ref={group}>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshBasicMaterial color="#caff9b" />
          </mesh>
        ))}
      </group>
    </>
  );
}
function Rack() {
  const { step } = useContext(State),
    opened = step === 1,
    networking = step === 3 || step === 5,
    cooling = step === 4;
  const gpu = useMemo(
    () =>
      Array.from(
        { length: 72 },
        (_, i) =>
          [-0.61 + (i % 4) * 0.4, 0.45 + Math.floor(i / 4) * 0.25, 0.28] as Vec,
      ),
    [],
  );
  const cpu = useMemo(
    () =>
      Array.from(
        { length: 36 },
        (_, i) =>
          [
            -0.39 + (i % 2) * 0.8,
            0.45 + Math.floor(i / 2) * 0.25,
            -0.24,
          ] as Vec,
      ),
    [],
  );
  const ports = useMemo(
    () =>
      Array.from(
        { length: 72 },
        (_, i) =>
          [
            -0.78 + (i % 4) * 0.52,
            0.39 + Math.floor(i / 4) * 0.25,
            0.79,
          ] as Vec,
      ),
    [],
  );
  return (
    <>
      <Part id="rack" name="Rack frame" labelAt={[0, 5.7, 0]}>
        {[-1, 1].flatMap((x) =>
          [-1, 1].map((z) => (
            <Block
              key={`${x}${z}`}
              at={[x * 1.24, 2.7, z * 0.83]}
              size={[0.11, 5.4, 0.11]}
              color="#414b43"
            />
          )),
        )}
        {[0.08, 5.38].map((y) => (
          <Block
            key={y}
            at={[0, y, 0]}
            size={[2.65, 0.14, 1.85]}
            color="#333c35"
          />
        ))}
        <Block at={[0, 5.15, 0.86]} size={[2.4, 0.3, 0.08]} color="#242e25" />
        <Batch
          positions={Array.from(
            { length: 20 },
            (_, i) => [-1.12 + i * 0.118, 5.16, 0.91] as Vec,
          )}
          size={[0.055, 0.13, 0.02]}
          color="#667b57"
        />
      </Part>
      <Part
        id="tray"
        name="18 illustrative compute trays"
        opened={opened}
        offset={[0, 0, 1.3]}
        labelAt={[0, 5.1, 0.8]}
      >
        {Array.from({ length: 18 }, (_, i) => (
          <group key={i} position={[0, 0.32 + i * 0.25, 0]}>
            <Block size={[2.26, 0.045, 1.45]} color="#344334" />
            <Block
              at={[0, 0.04, 0.75]}
              size={[2.27, 0.11, 0.08]}
              color="#5d685b"
            />
            <Block
              at={[-1.03, 0.04, 0.81]}
              size={[0.07, 0.09, 0.06]}
              color="#a2c777"
            />
          </group>
        ))}
        <Batch positions={ports} size={[0.19, 0.045, 0.04]} color="#131d16" />
      </Part>
      <Part
        id="gpu"
        name="72 Rubin GPU markers"
        opened={opened || step === 2}
        offset={[1.8, 0, 0.7]}
        labelAt={[0.2, 4.9, 0.3]}
      >
        <Batch positions={gpu} size={[0.31, 0.095, 0.33]} color="#88b858" />
      </Part>
      <Part
        id="cpu"
        name="36 Vera CPU markers"
        opened={opened || step === 2}
        offset={[-1.65, 0, 0.7]}
        labelAt={[-0.2, 4.9, -0.1]}
      >
        <Batch positions={cpu} size={[0.27, 0.08, 0.25]} color="#c2c7ad" />
      </Part>
      <Part
        id="network"
        name="NVLink / network · schematic"
        at={[0, 0, -0.76]}
        offset={[0, 0, -0.8]}
        opened={networking || opened}
        labelAt={[1.4, 4.7, 0]}
      >
        {Array.from({ length: 9 }, (_, i) => (
          <group key={i} position={[0, 0.6 + i * 0.5, 0]}>
            <Block size={[2.1, 0.13, 0.24]} color="#2b3d2a" />
            {networking && (
              <Line
                points={[
                  [-1, 0, 0.1],
                  [-1.7, 0.12, 0.4],
                  [-1.7, 0.12, 1.4],
                  [0.4, 0.12, 1.4],
                ]}
                color="#b4ed73"
                lineWidth={1.5}
              />
            )}
          </group>
        ))}
      </Part>
      <Part
        id="cooling"
        name="Coolant manifold · illustrative path"
        opened={cooling || opened}
        offset={[0.8, 0, -0.3]}
        labelAt={[1.5, 5.5, 0]}
      >
        {[-1, 1].map((x) => (
          <group key={x}>
            <mesh position={[x * 1.43, 2.75, -0.5]}>
              <cylinderGeometry args={[0.055, 0.055, 5.2, 12]} />
              <Surface color="#9aa795" />
            </mesh>
            {[0.6, 1.6, 2.6, 3.6, 4.6].map((y) => (
              <Line
                key={y}
                points={[
                  [x * 1.43, y, -0.5],
                  [x * 1.43, y, 0],
                  [x * 0.6, y, 0.2],
                ]}
                color={cooling ? "#d9f2bd" : "#667965"}
                lineWidth={3}
              />
            ))}
          </group>
        ))}
      </Part>
      <Part
        id="power"
        name="Power delivery"
        at={[0, -0.12, 0]}
        labelAt={[0, 0.3, 1.1]}
      >
        {[-1, 0, 1].map((i) => (
          <Block
            key={i}
            at={[i * 0.76, 0.12, 0]}
            size={[0.66, 0.19, 1.5]}
            color="#202a22"
          />
        ))}
      </Part>
      {step === 5 && (
        <Flow
          points={[
            [-2, 0.5, 1],
            [-1.5, 2.5, 1],
            [0.1, 2.5, 1],
            [0.7, 3.5, 0.9],
            [1.8, 4.7, 1],
          ]}
        />
      )}
    </>
  );
}
function Module() {
  const { step } = useContext(State),
    opened = step === 1 || step === 5;
  const cores = useMemo(
    () =>
      Array.from(
        { length: 14 },
        (_, i) =>
          [
            -0.94 + (i % 4) * 0.13,
            1.67,
            -0.24 + Math.floor(i / 4) * 0.13,
          ] as Vec,
      ),
    [],
  );
  const gpu = useMemo(
    () =>
      Array.from(
        { length: 48 },
        (_, i) =>
          [
            0.05 + (i % 8) * 0.12,
            1.66,
            -0.25 + Math.floor(i / 8) * 0.12,
          ] as Vec,
      ),
    [],
  );
  const pins = useMemo(
    () =>
      Array.from({ length: 76 }, (_, i) => {
        const edge = Math.floor(i / 19),
          n = (i % 19) * 0.17 - 1.53;
        return edge < 2
          ? ([n, 1.27, (edge ? -1 : 1) * 1.23] as Vec)
          : ([(edge === 2 ? -1 : 1) * 1.75, 1.27, n * 0.7] as Vec);
      }),
    [],
  );
  return (
    <>
      <Part
        id="module"
        name="T5000 module · conceptual layout"
        at={[0, 1.25, 0]}
        offset={[0, -0.3, 0]}
        opened={opened}
        labelAt={[0, 0.3, 1.3]}
      >
        <Block size={[3.6, 0.12, 2.6]} color="#2d4a34" />
        <Block at={[0, -0.1, 0]} size={[3.64, 0.05, 2.64]} color="#17271b" />
        {[-1, 1].flatMap((x) =>
          [-1, 1].map((z) => (
            <mesh
              key={`${x}${z}`}
              position={[x * 1.58, 0.09, z * 1.08]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <torusGeometry args={[0.06, 0.018, 6, 20]} />
              <Surface color="#c5b98e" />
            </mesh>
          )),
        )}
      </Part>
      <Batch positions={pins} size={[0.065, 0.045, 0.08]} color="#b0a27d" />
      <Part
        id="silicon"
        name={
          step === 1
            ? "General chip fabrication · enlarged"
            : "Processor package"
        }
        at={[0, 1.46, 0]}
        offset={[0, 0.4, 0]}
        opened={opened}
        labelAt={[0, 0.4, -0.7]}
      >
        <Block size={[2.15, 0.18, 1.55]} color="#2c3330" />
        <Block at={[0, 0.11, 0]} size={[1.95, 0.035, 1.36]} color="#818e7d" />
      </Part>
      <Part
        id="cpu"
        name="14 CPU cores · logical diagram"
        opened={step === 3 || opened}
        offset={[-0.5, 0.7, 0]}
        labelAt={[-0.65, 2.1, 0]}
      >
        <Batch positions={cores} size={[0.1, 0.075, 0.1]} color="#c6c9b4" />
      </Part>
      <Part
        id="gpu"
        name="Blackwell GPU · illustrative groups"
        opened={step === 4 || opened}
        offset={[0.5, 0.6, 0]}
        labelAt={[0.55, 2.1, 0]}
      >
        <Batch positions={gpu} size={[0.09, 0.06, 0.09]} color="#a3d86e" />
      </Part>
      <Part
        id="memory"
        name="LPDDR5X working memory"
        opened={step === 5 || opened}
        offset={[0, 0.6, 0]}
        labelAt={[1.5, 1.9, 0.6]}
      >
        {[-1, 1].flatMap((x) =>
          [-1, 1].map((z) => (
            <group key={`${x}${z}`} position={[x * 1.37, 1.46, z * 0.68]}>
              <Block size={[0.38, 0.15, 0.65]} color="#3b433c" />
              <Block
                at={[0, 0.08, 0]}
                size={[0.28, 0.015, 0.48]}
                color="#6c7b64"
              />
            </group>
          )),
        )}
      </Part>
      <Part
        id="power"
        name="Power regulation and interfaces"
        labelAt={[-1.55, 1.8, 0.8]}
      >
        <Batch
          positions={Array.from(
            { length: 14 },
            (_, i) => [-1.25 + i * 0.19, 1.44, 1.02] as Vec,
          )}
          size={[0.1, 0.16, 0.15]}
          color="#7a8270"
        />
        {[-1, 1].map((z) => (
          <Block
            key={z}
            at={[1.74, 1.5, z * 0.75]}
            size={[0.12, 0.22, 0.45]}
            color="#525c52"
          />
        ))}
      </Part>
      {[0, 1, 2, 3, 4].map((i) => (
        <Line
          key={i}
          points={[
            [-1.5, 1.322, -0.5 + i * 0.2],
            [-1.1, 1.322, -0.5 + i * 0.2],
            [-0.9, 1.322, -0.3 + i * 0.2],
            [1.5, 1.322, -0.3 + i * 0.2],
          ]}
          color="#789b56"
          lineWidth={1}
        />
      ))}
      {step === 1 && (
        <Part
          id="wafer"
          name="Patterned wafer · general concept"
          at={[-2.9, 1.3, 0]}
          labelAt={[0, 0.45, 0]}
        >
          <mesh>
            <cylinderGeometry args={[0.85, 0.85, 0.035, 64]} />
            <Surface color="#859087" />
          </mesh>
          <Batch
            positions={Array.from(
              { length: 25 },
              (_, i) =>
                [
                  ((i % 5) - 2) * 0.23,
                  0.04,
                  (Math.floor(i / 5) - 2) * 0.23,
                ] as Vec,
            )}
            size={[0.19, 0.025, 0.19]}
            color="#3b5840"
          />
        </Part>
      )}
      {step === 2 && (
        <Part
          id="logic"
          name="Transistor / logic concept · not a floorplan"
          at={[0, 2.5, 0]}
          labelAt={[0, 0.6, 0]}
        >
          {[-1, 0, 1].map((x) => (
            <group key={x} position={[x * 0.65, 0, 0]}>
              <Block size={[0.45, 0.08, 0.5]} color="#9bbaa5" />
              <Block
                at={[0, 0.15, 0]}
                size={[0.13, 0.2, 0.5]}
                color="#a4d66f"
              />
              <Line
                points={[
                  [-0.25, 0.1, 0.3],
                  [-0.25, 0.1, 0.8],
                  [0.4, 0.1, 0.8],
                ]}
                color="#b4ed73"
                lineWidth={2}
              />
            </group>
          ))}
        </Part>
      )}
      {(step === 5 || step === 6) && (
        <Flow
          points={[
            [-2.3, 1.5, 1],
            [-1.1, 1.9, 0],
            [0.5, 1.9, 0],
            [1.4, 1.9, 0.6],
            [2.1, 1.5, 1],
          ]}
        />
      )}
    </>
  );
}
function DuckLeg({ side }: { side: number }) {
  const { step, time, reduced } = useContext(State),
    hip = useRef<THREE.Group>(null!),
    knee = useRef<THREE.Group>(null!),
    ankle = useRef<THREE.Group>(null!);
  useFrame(() => {
    const cycle =
      (step === 7 || step === 2) && !reduced
        ? Math.sin(time.current * 3.4 + (side > 0 ? Math.PI : 0))
        : 0;
    hip.current.rotation.x = cycle * 0.32;
    knee.current.rotation.x = Math.max(0, -cycle) * 0.55;
    ankle.current.rotation.x = -cycle * 0.16;
  });
  return (
    <group>
      <Joint at={[0, 0.04, 0]} />
      <Joint at={[side * 0.06, -0.05, 0.06]} radius={0.09} />
      <group ref={hip}>
        <Joint at={[0, -0.1, 0]} />
        <Block at={[0, -0.31, 0]} size={[0.19, 0.33, 0.21]} color="#9da79b" />
        <group position={[0, -0.52, 0]} ref={knee}>
          <Joint />
          <Block at={[0, -0.21, 0]} size={[0.15, 0.3, 0.17]} color="#a9b1a2" />
          <group ref={ankle} position={[0, -0.43, 0]}>
            <Joint radius={0.085} />
            <Joint at={[0, -0.09, 0.04]} radius={0.075} />
            <Block
              at={[0, -0.15, 0.16]}
              size={[0.29, 0.11, 0.52]}
              color="#4d5849"
            />
            <Block
              at={[0, -0.21, 0.16]}
              size={[0.31, 0.025, 0.54]}
              color="#1c271d"
            />
          </group>
        </group>
      </group>
    </group>
  );
}
function Duck() {
  const { step } = useContext(State),
    open = step === 1,
    electronics = step === 4 || step === 5;
  const sensorRays = useMemo(
    () =>
      new Float32Array(
        Array.from({ length: 64 }, (_, i) => [
          0,
          2.15,
          0.5,
          ((i % 8) - 3.5) * 0.18,
          1.3 + Math.floor(i / 8) * 0.13,
          2.2,
        ]).flat(),
      ),
    [],
  );
  return (
    <>
      <Part
        id="body"
        name="Body shell and structural frame"
        at={[0, 1.5, 0]}
        offset={[0, 0.1, -0.65]}
        opened={open || electronics}
        labelAt={[0, 1.3, 0]}
      >
        <Block size={[0.78, 0.56, 0.56]} color="#b1baaa" />
        <Block at={[0, 0.02, 0.29]} size={[0.54, 0.31, 0.04]} color="#465442" />
        {[-1, 1].map((x) => (
          <Block
            key={x}
            at={[x * 0.31, 0.02, 0.32]}
            size={[0.035, 0.15, 0.018]}
            color="#b8d492"
          />
        ))}
      </Part>
      <Part
        id="battery"
        name="Battery and power"
        at={[0, 1.5, -0.17]}
        opened={open}
        offset={[0, 0.05, -0.5]}
        labelAt={[0, 0.25, -0.3]}
      >
        <Block size={[0.43, 0.32, 0.22]} color="#293629" />
      </Part>
      <Part
        id="motor"
        name="Leg motors and linked joints"
        labelAt={[-0.4, 1.1, 0.3]}
      >
        {[-1, 1].map((side) => (
          <Part
            key={side}
            id={`leg-${side}`}
            name={`${side > 0 ? "Right" : "Left"} leg chain`}
            at={[side * 0.28, 1.22, 0]}
            offset={[side * 0.42, 0, 0]}
            opened={open}
            labelAt={[0, -0.5, 0.35]}
          >
            <DuckLeg side={side} />
          </Part>
        ))}
      </Part>
      <Part
        id="head"
        name="Head, neck and articulated beak"
        at={[0, 2.04, 0.03]}
        opened={open}
        offset={[0, 0.6, 0]}
        labelAt={[0, 0.58, 0]}
      >
        <Joint at={[0, -0.18, 0]} radius={0.12} />
        <Joint at={[0, -0.05, 0]} radius={0.1} />
        <Block at={[0, 0.15, 0]} size={[1.02, 0.5, 0.62]} color="#aeb9a5" />
        <Block
          at={[0, 0.16, 0.32]}
          size={[0.83, 0.28, 0.045]}
          color="#17251d"
        />
        {[-1, 1].map((x) => (
          <mesh key={x} position={[x * 0.25, 0.17, 0.36]}>
            <torusGeometry args={[0.055, 0.012, 8, 24]} />
            <Surface color="#c3ee98" emissive />
          </mesh>
        ))}
        <Joint at={[0, -0.04, 0.32]} radius={0.06} />
        <Block at={[0, -0.08, 0.49]} size={[0.4, 0.085, 0.4]} color="#a8cc77" />
      </Part>
      <Part
        id="sensor"
        name="Front camera and ToF depth sensing"
        at={[0, 2.2, 0.39]}
        opened={open || step === 3}
        offset={[0, 0.2, 0.4]}
        labelAt={[0, 0.5, 0]}
      >
        <Block size={[0.16, 0.12, 0.11]} color="#1a2921" />
        <mesh position={[0, 0, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.025, 20]} />
          <Surface color="#7bbdc3" />
        </mesh>
        <Block
          at={[0.25, -0.18, -0.02]}
          size={[0.15, 0.08, 0.07]}
          color="#2b392b"
        />
      </Part>
      <Part id="imu" name="Two motion-sensing IMUs" labelAt={[0.5, 1.7, 0.5]}>
        {[-1, 1].map((x) => (
          <Block
            key={x}
            at={[x * 0.25, 1.58, 0.18]}
            size={[0.12, 0.07, 0.14]}
            color="#7ca95e"
          />
        ))}
      </Part>
      <Part
        id="processor"
        name="Rockchip RK3566 · conceptual board"
        at={[0, 1.58, 0.32]}
        opened={open || electronics}
        offset={[0, 0, 0.48]}
        labelAt={[0, 0.55, 0.1]}
      >
        <Block size={[0.65, 0.38, 0.045]} color="#3f663d" />
        <Block
          at={[-0.1, 0.02, 0.03]}
          size={[0.28, 0.23, 0.035]}
          color="#202d26"
        />
        {[-1, 1].map((x) => (
          <Block
            key={x}
            at={[x * 0.23, -0.09, 0.03]}
            size={[0.09, 0.09, 0.025]}
            color="#a7bd8a"
          />
        ))}
        {step === 5 && (
          <group position={[0, 0.18, 0.35]}>
            {["CPU", "Mali GPU", "NPU"].map((label, i) => (
              <Part
                key={label}
                id={`compute-${i}`}
                name={label}
                at={[(i - 1) * 0.7, 0, 0]}
                labelAt={[0, 0.15, 0]}
              >
                <Block
                  size={[0.55, 0.3, 0.05]}
                  color={i === 0 ? "#a7b994" : "#81aa58"}
                />
                <Label at={[0, 0, 0.04]} text={label} width={0.4} />
              </Part>
            ))}
          </group>
        )}
      </Part>
      {step === 3 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[sensorRays, 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#b4ed73" transparent opacity={0.2} />
        </lineSegments>
      )}
      {step === 6 && (
        <Flow
          points={[
            [0, 2.25, 0.6],
            [0.6, 1.85, 0.7],
            [0, 1.55, 0.8],
            [-0.45, 0.8, 0.6],
            [-0.3, 0.3, 0.3],
          ]}
        />
      )}
    </>
  );
}
function Camera({ kind, reset, zoom }: Pick<Props, "kind" | "reset" | "zoom">) {
  const camera = useThree((s) => s.camera);
  const portrait = useThree((s) => s.size.width < s.size.height);
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null!);
  const target: Vec =
    kind === "rubin"
      ? [0, 2.6, 0]
      : kind === "thor"
        ? [0, 1.4, 0]
        : [0, 1.25, 0];
  useEffect(() => {
    camera.position.set(
      ...((kind === "rubin"
        ? [7.5, 5.5, 8.5]
        : kind === "thor"
          ? [3.8, 4.2, 4.5]
          : [3.2, 2.4, 4.2]) as Vec),
    );
    if (kind === "thor" && portrait)
      camera.position
        .sub(new THREE.Vector3(...target))
        .multiplyScalar(1.55)
        .add(new THREE.Vector3(...target));
    camera.lookAt(...target);
    controls.current?.target.set(...target);
    controls.current?.update();
  }, [kind, reset, camera, portrait]);
  const previousZoom = useRef(zoom);
  useEffect(() => {
    if (zoom === previousZoom.current) return;
    const center = controls.current.target;
    camera.position
      .sub(center)
      .multiplyScalar(zoom > previousZoom.current ? 0.83 : 1.2)
      .add(center);
    controls.current.update();
    previousZoom.current = zoom;
  }, [zoom, camera]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={target}
      minDistance={kind === "rubin" ? 4 : 1.5}
      maxDistance={kind === "rubin" ? 19 : 13}
      maxPolarAngle={Math.PI * 0.49}
      enablePan
      enableDamping
      dampingFactor={0.08}
    />
  );
}
function World(props: Props) {
  const [selected, setSelected] = useState("");
  useEffect(() => setSelected(""), [props.step, props.kind]);
  const select = (id: string, name: string) => {
    setSelected(id);
    props.onInspect(name);
  };
  return (
    <State.Provider
      value={{
        ...props,
        selected,
        select,
        focus: EXPERIENCES[props.kind].steps[props.step].focus,
      }}
    >
      <color attach="background" args={["#080b09"]} />
      <fog attach="fog" args={["#080b09", 15, 34]} />
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#f0f4e8", "#1b2519", 1.8]} />
      <spotLight
        position={[4, 10, 6]}
        angle={0.5}
        penumbra={1}
        intensity={100}
        color="#f0f7e9"
      />
      <pointLight position={[-5, 3, -3]} intensity={45} color="#9cc971" />
      <Environment resolution={128} frames={1}>
        <Lightformer position={[0, 6, -3]} intensity={3} scale={[8, 3, 1]} />
        <Lightformer
          position={[-4, 2, 2]}
          rotation={[0, Math.PI / 2, 0]}
          intensity={3}
          scale={[3, 6, 1]}
        />
      </Environment>
      {props.kind === "rubin" ? (
        <Rack />
      ) : props.kind === "thor" ? (
        <Module />
      ) : (
        <Duck />
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]}>
        <circleGeometry args={[10, 80]} />
        <meshStandardMaterial color="#101811" metalness={0.6} roughness={0.7} />
      </mesh>
      {[2.8, 3.7, 5.1].map((r) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.245, 0]}>
          <ringGeometry args={[r, r + 0.008, 100]} />
          <meshBasicMaterial color="#3d5431" transparent opacity={0.5} />
        </mesh>
      ))}
      <ContactShadows
        position={[0, -0.24, 0]}
        opacity={0.45}
        scale={16}
        far={7}
        resolution={256}
        blur={2}
        frames={1}
      />
      <Camera kind={props.kind} reset={props.reset} zoom={props.zoom} />
    </State.Provider>
  );
}
class SceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? (
      <p className="sim-no-webgl">
        The 3D scene could not start. Lessons and step controls remain
        available. Reload the page to try again.
      </p>
    ) : (
      this.props.children
    );
  }
}
function ContextMonitor({ onChange }: { onChange: (lost: boolean) => void }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onChange(true);
    };
    const restored = () => onChange(false);
    onChange(gl.getContext().isContextLost());
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    return () => {
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
    };
  }, [gl, onChange]);
  return null;
}
function SimulationScene(props: Props) {
  const [supported, setSupported] = useState<boolean | null>(null),
    [lost, setLost] = useState(false);
  useEffect(() => {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    setSupported(!!gl);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  }, []);
  return supported === false ? (
    <p className="sim-no-webgl">
      WebGL 2 is unavailable on this device. You can still read every step and
      use the lesson controls. Try a browser with hardware acceleration for 3D.
    </p>
  ) : supported === null ? (
    <p className="sim-scene-loading">Preparing your 3D workspace…</p>
  ) : (
    <SceneBoundary onFailure={() => setLost(true)}>
      {lost && (
        <div className="sim-no-webgl" role="alert">
          The graphics connection was lost.{" "}
          <button onClick={() => location.reload()}>Reload 3D</button>
        </div>
      )}
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [5, 4, 7], fov: 42, near: 0.05, far: 60 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.domElement.setAttribute(
            "aria-label",
            `${EXPERIENCES[props.kind].name} interactive 3D scene`,
          );
        }}
      >
        <World {...props} />
        <ContextMonitor onChange={setLost} />
      </Canvas>
    </SceneBoundary>
  );
}
export default memo(SimulationScene);
