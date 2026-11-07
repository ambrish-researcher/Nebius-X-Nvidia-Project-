"use client";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  useGeometry,
  useMaterial,
  FINISH,
  type Finish,
} from "./simulation-resources";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import * as THREE from "three";
import type { ExperienceId } from "../lib/simulation-lessons";
import {
  CONSTRUCTION,
  constructionPartVisible,
  constructionPartStart,
} from "../lib/simulation-construction";

export type Vec = [number, number, number];
export type Props = {
  kind: ExperienceId;
  step: number;
  time: RefObject<number>;
  building: boolean;
  playing: boolean;
  reduced: boolean;
  reset: number;
  wireframe: boolean;
  activeBuildPart: string;
  stageIndex: number;
  focus: string;
  inspection: string;
  zoom: number;
  onReady: () => void;
  onInspect: (id: string, name: string) => void;
};
export type SceneState = Props & {
  selected: string;
  select: (id: string, name: string) => void;
  focus: string;
};
export const State = createContext<SceneState>(null!);
export const Tint = createContext(false);
const Opacity = createContext(1);
export const Reveal = createContext<{
  id: string;
  planes: THREE.Plane[];
} | null>(null);
export function Label({
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
  const leader = useMemo(
    () =>
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(6), 3),
      ),
    [],
  );
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = short ? 256 : 1024;
    canvas.height = short ? 96 : 144;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#0b160df2";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#badc9e";
    context.lineWidth = 3;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    let size = short ? 48 : 44;
    context.font = `500 ${size}px Arial`;
    while (context.measureText(text).width > canvas.width - 35 && size > 18)
      context.font = `500 ${--size}px Arial`;
    context.fillStyle = "#f1f7e9";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  }, [text, short]);
  useEffect(
    () => () => {
      texture.dispose();
      leader.dispose();
    },
    [texture, leader],
  );
  useFrame(({ camera, size }) => {
    sprite.current.position.set(...at);
    sprite.current.updateWorldMatrix(true, false);
    const depth = -sprite.current
      .getWorldPosition(point.current)
      .applyMatrix4(camera.matrixWorldInverse).z;
    if (depth <= 0) return;
    const pixels = short
      ? Math.min(90, size.width * 0.21)
      : Math.min(340, size.width * 0.92);
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
    // Keep the main callout in an open strip above the model. Its leader stays
    // attached to the seated component as the camera moves.
    projected.current.y = short
      ? THREE.MathUtils.clamp(projected.current.y, -1 + marginY, 1 - marginY)
      : 1 -
        (64 + (pixels * texture.image.height) / texture.image.width) /
          size.height;
    sprite.current.position.copy(
      sprite.current.parent!.worldToLocal(projected.current.unproject(camera)),
    );
    const positions = leader.attributes.position as THREE.BufferAttribute;
    positions.setXYZ(0, ...at);
    positions.setXYZ(
      1,
      sprite.current.position.x,
      sprite.current.position.y,
      sprite.current.position.z,
    );
    positions.needsUpdate = true;
  });
  return (
    <>
      {!short && (
        <lineSegments
          geometry={leader}
          renderOrder={9}
          frustumCulled={false}
          raycast={() => {}}
        >
          <lineBasicMaterial
            color="#a5d884"
            transparent
            opacity={0.45}
            depthTest={false}
            depthWrite={false}
          />
        </lineSegments>
      )}
      <sprite
        ref={sprite}
        name={`sim-callout:${text}`}
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
    </>
  );
}
export function Surface({
  color = "#737f76",
  emissive = false,
  finish = "metal",
}: {
  color?: string;
  emissive?: boolean;
  finish?: Finish;
}) {
  const active = useContext(Tint),
    opacity = useContext(Opacity),
    reveal = useContext(Reveal),
    { wireframe } = useContext(State);
  const [metalness, roughness] = FINISH[finish];
  const material = useMaterial(
    [color, active, opacity, wireframe, emissive, finish, reveal?.id].join(":"),
    () =>
      new THREE.MeshStandardMaterial({
        color,
        metalness,
        roughness,
        wireframe,
        opacity,
        transparent: opacity < 1,
        depthWrite: opacity === 1,
        clippingPlanes: reveal?.planes,
        clipShadows: true,
        emissive: active || emissive ? "#83c84b" : "#000000",
        emissiveIntensity: active ? 0.065 : emissive ? 0.4 : 0,
      }),
  );
  // Nested parts remount on restart. Rebind the cached material to the live
  // reveal plane instead of retaining a plane from an earlier construction.
  material.clippingPlanes = reveal?.planes ?? null;
  return <primitive object={material} attach="material" />;
}
export function Block({
  at = [0, 0, 0],
  size,
  color,
  glow = false,
  round = true,
  finish = "metal",
}: {
  at?: Vec;
  size: Vec;
  color?: string;
  glow?: boolean;
  round?: boolean;
  finish?: Finish;
}) {
  const geometry = useGeometry(round ? "rounded-unit" : "unit", () =>
    round
      ? new RoundedBoxGeometry(1, 1, 1, 2, 0.065)
      : new THREE.BoxGeometry(1, 1, 1),
  );
  return (
    <mesh
      position={at}
      scale={size}
      geometry={geometry}
      castShadow
      receiveShadow
    >
      <Surface color={color} emissive={glow} finish={finish} />
    </mesh>
  );
}
export function Batch({
  positions,
  size,
  color,
  geometry,
  rotation = [0, 0, 0],
}: {
  positions: Vec[];
  size: Vec;
  color: string;
  geometry?: THREE.BufferGeometry;
  rotation?: Vec;
}) {
  const fallback = useGeometry(
    "batch-unit",
    () => new THREE.BoxGeometry(1, 1, 1),
  );
  const mesh = useRef<THREE.InstancedMesh>(null!);
  useEffect(() => {
    const matrix = new THREE.Matrix4(),
      scale = new THREE.Vector3(...size),
      quaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(...rotation),
      );
    positions.forEach((p, i) => {
      matrix.compose(new THREE.Vector3(...p), quaternion, scale);
      mesh.current.setMatrixAt(i, matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [positions, size, rotation[0], rotation[1], rotation[2]]);
  return (
    <instancedMesh
      ref={mesh}
      args={[geometry ?? fallback, undefined, positions.length]}
      castShadow
      receiveShadow
    >
      <Surface color={color} />
    </instancedMesh>
  );
}
export function Part({
  id,
  name,
  at = [0, 0, 0],
  labelAt = [0, 0.4, 0],
  ghost = false,
  children,
}: {
  id: string;
  name: string;
  at?: Vec;
  labelAt?: Vec;
  ghost?: boolean;
  children: ReactNode;
}) {
  const s = useContext(State),
    root = useRef<THREE.Group>(null!);
  const reveal = useMemo(
    () => ({
      id,
      planes: [new THREE.Plane(new THREE.Vector3(0, -1, 0), -10000)],
    }),
    [id],
  );
  const extent = useRef({ min: 0, max: 1, ready: false });
  const introduced = constructionPartStart(s.kind, id);
  const attached =
    !s.building || constructionPartVisible(s.kind, id, s.stageIndex);
  useEffect(() => {
    if (!root.current) return;
    root.current.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(root.current);
    extent.current = {
      min: box.min.y - 0.03,
      max: box.max.y + 0.03,
      ready: !box.isEmpty(),
    };
  }, [reveal, attached]);
  useFrame(() => {
    if (!root.current) return;
    const t = s.reduced
      ? 1
      : Math.max(0, Math.min(1, (s.time.current - introduced) / 0.72));
    root.current.visible = t > 0;
    const e = extent.current;
    reveal.planes[0].constant =
      t === 1 || !e.ready
        ? 10000
        : e.min + (e.max - e.min) * (t * t * (3 - 2 * t));
  });
  const active = s.selected ? s.selected === id : s.focus === id;
  if (!attached) return null;
  return (
    <group
      ref={root}
      visible={false}
      position={at}
      name={"sim-part:" + id}
      userData={{ componentId: id, componentName: name, attached: true }}
      onClick={(e) => {
        e.stopPropagation();
        s.select(id, name);
      }}
    >
      <Reveal.Provider value={reveal}>
        <Opacity.Provider value={ghost ? 0.12 : 1}>
          <Tint.Provider value={active}>{children}</Tint.Provider>
        </Opacity.Provider>
      </Reveal.Provider>
      {active && <Label at={labelAt} text={name} />}
    </group>
  );
}
export function Joint({
  at = [0, 0, 0],
  radius = 0.1,
}: {
  at?: Vec;
  radius?: number;
}) {
  const barrel = useGeometry("motor:" + radius, () => {
    const points: THREE.Vector2[] = [];
    for (let i = 0; i < 12; i++)
      points.push(
        new THREE.Vector2(radius * (i % 2 ? 0.88 : 1), -0.075 + i * 0.013),
      );
    const geometry = new THREE.LatheGeometry(points, 32);
    geometry.rotateZ(Math.PI / 2);
    return geometry;
  });
  const flange = useGeometry("flange:" + radius, () =>
    new THREE.CylinderGeometry(radius * 1.12, radius * 1.12, 0.023, 32).rotateZ(
      Math.PI / 2,
    ),
  );
  const bolt = useGeometry("motor-bolt", () =>
    new THREE.CylinderGeometry(1, 1, 0.5, 10).rotateZ(Math.PI / 2),
  );
  return (
    <group position={at}>
      <mesh geometry={barrel} castShadow>
        <Surface color="#354b3c" />
      </mesh>
      <mesh geometry={flange} position={[0.075, 0, 0]} castShadow>
        <Surface color="#a6b4a5" />
      </mesh>
      <mesh position={[0.091, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[radius * 0.77, radius * 0.065, 8, 32]} />
        <Surface color="#86af64" />
      </mesh>
      <mesh position={[0.101, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[radius * 0.54, radius * 0.54, 0.023, 24]} />
        <Surface color="#182c22" />
      </mesh>
      <mesh position={[0.121, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[radius * 0.25, radius * 0.25, 0.035, 20]} />
        <Surface color="#b7c4b3" />
      </mesh>
      <Batch
        positions={Array.from(
          { length: 6 },
          (_, i) =>
            [
              0.094,
              Math.cos((i * Math.PI) / 3) * radius * 0.89,
              Math.sin((i * Math.PI) / 3) * radius * 0.89,
            ] as Vec,
        )}
        size={[radius * 0.12, radius * 0.12, radius * 0.12]}
        geometry={bolt}
        color="#334637"
      />
    </group>
  );
}
export function Flow({
  points,
  color = "#b8ef8b",
  radius = 0.026,
  rate = 0.23,
}: {
  points: Vec[];
  color?: string;
  radius?: number;
  rate?: number;
}) {
  const { time, reduced, building, kind, stageIndex } = useContext(State);
  const concept = !!CONSTRUCTION[kind][stageIndex]?.concept;
  const key = JSON.stringify(points);
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        (JSON.parse(key) as Vec[]).map((p) => new THREE.Vector3(...p)),
      ),
    [key],
  );
  const geometry = useGeometry(
    "packet",
    () => new THREE.SphereGeometry(1, 12, 8),
  );
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const scratch = useMemo(
    () => ({
      point: new THREE.Vector3(),
      scale: new THREE.Vector3(radius, radius, radius),
      matrix: new THREE.Matrix4(),
      rotation: new THREE.Quaternion(),
    }),
    [radius],
  );
  useFrame(() => {
    if (!mesh.current) return;
    for (let i = 0; i < 5; i++) {
      curve.getPoint(
        ((reduced ? 0 : time.current * rate) + i / 5) % 1,
        scratch.point,
      );
      scratch.matrix.compose(scratch.point, scratch.rotation, scratch.scale);
      mesh.current.setMatrixAt(i, scratch.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group visible={!building || concept}>
      <Line
        points={curve.getPoints(32)}
        color={color}
        lineWidth={0.75}
        transparent
        opacity={0.32}
      />
      <instancedMesh
        ref={mesh}
        args={[geometry, undefined, 5]}
        frustumCulled={false}
      >
        <meshBasicMaterial color={color} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
