"use client";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Batch, Block, Surface, type Vec } from "./simulation-geometry";
import { useGeometry, type Finish } from "./simulation-resources";

// Original, procedural teaching geometry. Profiles are chosen for mechanical
// clarity, never presented as NVIDIA or Pollen manufacturing/CAD dimensions.
type Point = [number, number];
type Aperture = { x: number; y: number; w: number; h: number; radius?: number };
function contour(points: Point[]) {
  const p = new THREE.Shape();
  p.moveTo(...points[0]);
  points.slice(1).forEach((v) => p.lineTo(...v));
  p.closePath();
  return p;
}
export function chamfer(
  w: number,
  h: number,
  c = Math.min(w, h) * 0.12,
): Point[] {
  return [
    [-w / 2 + c, -h / 2],
    [w / 2 - c, -h / 2],
    [w / 2, -h / 2 + c],
    [w / 2, h / 2 - c],
    [w / 2 - c, h / 2],
    [-w / 2 + c, h / 2],
    [-w / 2, h / 2 - c],
    [-w / 2, -h / 2 + c],
  ];
}
function profile(
  points: Point[],
  depth: number,
  holes: Aperture[] = [],
  bevel = 0.008,
) {
  const shape = contour(points);
  for (const hole of holes) {
    const path = new THREE.Path();
    if (hole.radius)
      path.absellipse(
        hole.x,
        hole.y,
        hole.radius,
        hole.radius,
        0,
        Math.PI * 2,
        true,
        0,
      );
    else {
      const outline = chamfer(
        hole.w,
        hole.h,
        Math.min(hole.w, hole.h) * 0.18,
      ).reverse();
      path.moveTo(outline[0][0] + hole.x, outline[0][1] + hole.y);
      outline.slice(1).forEach(([x, y]) => path.lineTo(x + hole.x, y + hole.y));
      path.closePath();
    }
    shape.holes.push(path);
  }
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 12,
  });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}
export function Profile({
  points,
  depth,
  holes = [],
  at = [0, 0, 0],
  rotation = [0, 0, 0],
  color = "#899589",
  finish = "metal",
  bevel = 0.008,
}: {
  points: Point[];
  depth: number;
  holes?: Aperture[];
  at?: Vec;
  rotation?: Vec;
  color?: string;
  finish?: Finish;
  bevel?: number;
}) {
  const key = JSON.stringify([points, depth, holes, bevel]);
  const geometry = useGeometry("profile:" + key, () =>
    profile(points, depth, holes, bevel),
  );
  return (
    <mesh
      geometry={geometry}
      position={at}
      rotation={rotation}
      castShadow
      receiveShadow
    >
      <Surface color={color} finish={finish} />
    </mesh>
  );
}
export function Plate({
  width,
  depth,
  thickness,
  at = [0, 0, 0],
  color = "#546957",
  finish = "metal",
  holes = [],
  corner = 0.06,
}: {
  width: number;
  depth: number;
  thickness: number;
  at?: Vec;
  color?: string;
  finish?: Finish;
  holes?: Aperture[];
  corner?: number;
}) {
  return (
    <Profile
      points={chamfer(width, depth, corner)}
      depth={thickness}
      holes={holes}
      at={at}
      rotation={[-Math.PI / 2, 0, 0]}
      color={color}
      finish={finish}
      bevel={Math.min(thickness * 0.16, 0.008)}
    />
  );
}
export function Fasteners({
  positions,
  axis = "y",
  size = 0.035,
}: {
  positions: Vec[];
  axis?: "x" | "y" | "z";
  size?: number;
}) {
  const geometry = useGeometry(
    "fastener",
    () => new THREE.CylinderGeometry(1, 1, 0.45, 12),
  );
  return (
    <Batch
      positions={positions}
      size={[size, size, size]}
      geometry={geometry}
      rotation={
        axis === "z"
          ? [Math.PI / 2, 0, 0]
          : axis === "x"
            ? [0, 0, Math.PI / 2]
            : [0, 0, 0]
      }
      color="#9da99c"
    />
  );
}
export function FramePosts() {
  const geometry = useGeometry("rack-extrusion", () => {
    const g = profile(
      [
        [-0.065, -0.065],
        [0.065, -0.065],
        [0.065, -0.025],
        [0.015, -0.025],
        [0.015, 0.065],
        [-0.065, 0.065],
      ],
      5.25,
      [],
      0.003,
    );
    g.rotateX(-Math.PI / 2);
    return g;
  });
  return (
    <>
      <Batch
        positions={[-1, 1].flatMap((x) =>
          [-1, 1].map((z) => [x * 1.24, 2.72, z * 0.83] as Vec),
        )}
        size={[1, 1, 1]}
        geometry={geometry}
        color="#48564f"
      />
      <Fasteners
        positions={[-1, 1].flatMap((x) =>
          Array.from(
            { length: 28 },
            (_, i) => [x * 1.24, 0.25 + i * 0.18, 0.9] as Vec,
          ),
        )}
        axis="z"
        size={0.021}
      />
      <Batch
        positions={[-1, 1].flatMap((x) =>
          Array.from(
            { length: 27 },
            (_, i) => [x * 1.17, 0.34 + i * 0.18, 0.84] as Vec,
          ),
        )}
        size={[0.035, 0.055, 0.018]}
        color="#101916"
      />
    </>
  );
}
export function RackBase({ top = false }: { top?: boolean }) {
  return (
    <>
      <Plate
        width={2.65}
        depth={1.85}
        thickness={0.14}
        at={[0, top ? 5.38 : 0.08, 0]}
        color="#39463f"
        corner={0.14}
      />
      {!top &&
        [-1, 1].flatMap((x) =>
          [-1, 1].map((z) => (
            <group key={x + ":" + z} position={[x * 1.12, -0.12, z * 0.72]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.075, 0.09, 0.26, 20]} />
                <Surface color="#26352b" finish="rubber" />
              </mesh>
              <mesh position={[0, 0.12, 0]} castShadow>
                <cylinderGeometry args={[0.11, 0.11, 0.03, 20]} />
                <Surface color="#839481" />
              </mesh>
            </group>
          )),
        )}
      {top && (
        <Batch
          positions={Array.from(
            { length: 22 },
            (_, i) => [-1.1 + i * 0.105, 5.462, 0] as Vec,
          )}
          size={[0.035, 0.012, 1.25]}
          color="#17231b"
        />
      )}
    </>
  );
}
export function ComputeTray() {
  const pan = useGeometry("tray-pan", () => {
    const floor = profile(chamfer(2.25, 1.44, 0.065), 0.035, [], 0.003).rotateX(
      -Math.PI / 2,
    );
    const rails = [-1, 1].map((x) => {
      const g = new THREE.BoxGeometry(0.055, 0.115, 1.4).toNonIndexed();
      g.translate(x * 1.1, 0.065, 0);
      return g;
    });
    const result = mergeGeometries([floor, ...rails]);
    [floor, ...rails].forEach((g) => g.dispose());
    return result;
  });
  const face = useGeometry("tray-face-perforated", () =>
    profile(
      chamfer(2.25, 0.145, 0.02),
      0.035,
      Array.from({ length: 24 }, (_, i) => ({
        x: -0.86 + i * 0.075,
        y: 0,
        w: 0.035,
        h: 0.071,
      })),
      0,
    ),
  );
  const handle = useGeometry("tray-latch", () => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.035, -0.027, 0),
      new THREE.Vector3(-0.045, -0.02, 0.09),
      new THREE.Vector3(0.045, -0.02, 0.09),
      new THREE.Vector3(0.035, 0.027, 0),
    ]);
    return new THREE.TubeGeometry(curve, 12, 0.012, 6, false);
  });
  return (
    <>
      <mesh geometry={pan} castShadow receiveShadow>
        <Surface color="#344a3c" />
      </mesh>
      <mesh geometry={face} position={[0, 0.045, 0.76]} castShadow>
        <Surface color="#829082" />
      </mesh>
      <Batch
        positions={[-1, 1].map((x) => [x * 1.02, 0.05, 0.79] as Vec)}
        size={[1, 1, 1]}
        geometry={handle}
        color="#bdc7b4"
      />
      <Batch
        positions={[-1, 1].map((x) => [x * 1.01, 0.05, 0.8] as Vec)}
        size={[0.055, 0.075, 0.035]}
        color="#1c2b21"
      />
      <Block
        at={[-0.94, 0.06, 0.79]}
        size={[0.025, 0.032, 0.012]}
        color="#a6ed6b"
        glow
        round={false}
      />
    </>
  );
}
export function ProcessorPackages({
  positions,
  gpu = false,
}: {
  positions: Vec[];
  gpu?: boolean;
}) {
  const base = useGeometry("package-base:" + gpu, () =>
    profile(
      chamfer(gpu ? 0.33 : 0.28, gpu ? 0.35 : 0.27, 0.025),
      0.055,
      [],
      0.003,
    ).rotateX(-Math.PI / 2),
  );
  const cap = useGeometry("package-cap:" + gpu, () =>
    profile(
      chamfer(gpu ? 0.255 : 0.215, gpu ? 0.275 : 0.205, 0.025),
      0.035,
      [],
      0.004,
    ).rotateX(-Math.PI / 2),
  );
  return (
    <>
      <Batch
        positions={positions}
        size={[1, 1, 1]}
        geometry={base}
        color="#25382c"
      />
      <Batch
        positions={positions.map((p) => [p[0], p[1] + 0.042, p[2]] as Vec)}
        size={[1, 1, 1]}
        geometry={cap}
        color={gpu ? "#739c50" : "#b5c4aa"}
      />
    </>
  );
}
export function ModuleBoard() {
  const holes = [-1, 1].flatMap((x) =>
    [-1, 1].map((y) => ({
      x: x * 1.58,
      y: y * 1.08,
      w: 0,
      h: 0,
      radius: 0.062,
    })),
  );
  const points: Point[] = [
    [-1.64, -1.3],
    [1.64, -1.3],
    [1.8, -1.14],
    [1.8, -0.45],
    [1.69, -0.34],
    [1.69, 0.34],
    [1.8, 0.45],
    [1.8, 1.14],
    [1.64, 1.3],
    [-1.64, 1.3],
    [-1.8, 1.14],
    [-1.8, -1.14],
  ];
  return (
    <>
      <Profile
        points={points}
        depth={0.12}
        holes={holes}
        rotation={[-Math.PI / 2, 0, 0]}
        color="#24563d"
        finish="board"
        bevel={0.004}
      />
      <Plate
        width={3.53}
        depth={2.51}
        thickness={0.012}
        at={[0, -0.078, 0]}
        color="#132c20"
        finish="board"
        holes={holes}
      />
      <Batch
        positions={[-1, 1].flatMap((x) =>
          Array.from(
            { length: 32 },
            (_, i) => [x * 1.62, 0.066, -0.9 + i * 0.058] as Vec,
          ),
        )}
        size={[0.028, 0.008, 0.025]}
        color="#b49f66"
      />
    </>
  );
}
export function ThermalCover() {
  return (
    <>
      <Plate
        width={2.16}
        depth={1.56}
        thickness={0.047}
        color="#9aa99b"
        holes={[{ x: 0, y: 0, w: 1.84, h: 1.25 }]}
        corner={0.085}
      />
      <Fasteners
        positions={[-1, 1].flatMap((x) =>
          [-1, 1].map((z) => [x * 0.98, 0.029, z * 0.68] as Vec),
        )}
        size={0.025}
      />
    </>
  );
}
export function CameraLens({ at = [0, 0, 0] }: { at?: Vec }) {
  return (
    <group position={at}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.073, 0.085, 0.077, 40]} />
        <Surface color="#18251f" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.04]}>
        <cylinderGeometry args={[0.056, 0.056, 0.014, 40]} />
        <Surface color="#83a881" />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <torusGeometry args={[0.049, 0.006, 8, 40]} />
        <Surface color="#b5c3b0" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.054]}>
        <cylinderGeometry args={[0.043, 0.043, 0.009, 40]} />
        <Surface color="#25434b" finish="lens" />
      </mesh>
      <mesh position={[0.015, 0.014, 0.061]}>
        <circleGeometry args={[0.012, 20]} />
        <meshBasicMaterial color="#aee4e4" transparent opacity={0.65} />
      </mesh>
    </group>
  );
}
export function RobotShell({ head = false }: { head?: boolean }) {
  const w = head ? 1.02 : 0.78,
    h = head ? 0.5 : 0.56,
    d = head ? 0.62 : 0.56;
  return (
    <>
      <Profile
        points={chamfer(w, h, head ? 0.105 : 0.085)}
        depth={d}
        at={[0, head ? 0.15 : 0, 0]}
        holes={[
          {
            x: 0,
            y: head ? 0.17 : 0.015,
            w: head ? 0.83 : 0.52,
            h: head ? 0.29 : 0.34,
          },
        ]}
        color={head ? "#a9b8a7" : "#899e8c"}
        finish="polymer"
        bevel={0.014}
      />
      <Profile
        points={chamfer(w * 0.94, h * 0.91, 0.07)}
        depth={0.025}
        at={[0, head ? 0.15 : 0, -d / 2 - 0.012]}
        color="#253b2d"
        finish="polymer"
      />
      {[-1, 1].map((x) => (
        <Batch
          key={x}
          positions={Array.from(
            { length: 5 },
            (_, i) =>
              [
                x * (w / 2 + 0.013),
                (head ? 0.07 : -0.13) + i * 0.06,
                -0.09,
              ] as Vec,
          )}
          size={[0.01, 0.022, 0.21]}
          color="#18291f"
        />
      ))}
      <Fasteners
        positions={[-1, 1].flatMap((x) =>
          [-1, 1].map(
            (y) =>
              [
                x * (w / 2 - 0.065),
                (head ? 0.15 : 0) + y * (h / 2 - 0.06),
                d / 2 + 0.018,
              ] as Vec,
          ),
        )}
        axis="z"
        size={0.018}
      />
    </>
  );
}
export function Beak() {
  const jaw: Point[] = [
    [-0.21, -0.18],
    [0.21, -0.18],
    [0.19, 0.1],
    [0.13, 0.22],
    [-0.13, 0.22],
    [-0.19, 0.1],
  ];
  return (
    <>
      <Profile
        points={jaw}
        depth={0.055}
        rotation={[-Math.PI / 2, 0, 0]}
        at={[0, -0.08, 0.48]}
        color="#93bd63"
        finish="polymer"
        bevel={0.012}
      />
      <Profile
        points={jaw.map(([x, z]) => [x * 0.95, z * 0.95])}
        depth={0.025}
        rotation={[-Math.PI / 2, 0, 0]}
        at={[0, -0.135, 0.47]}
        color="#304c32"
        finish="rubber"
        bevel={0.006}
      />
    </>
  );
}
export function LinkCheeks({
  length,
  width,
}: {
  length: number;
  width: number;
}) {
  const points: Point[] = [
    [-width / 2, 0.045],
    [width / 2, 0.045],
    [width * 0.48, -0.12],
    [width * 0.35, -length + 0.06],
    [width * 0.25, -length - 0.015],
    [-width * 0.25, -length - 0.015],
    [-width * 0.35, -length + 0.06],
    [-width * 0.48, -0.12],
  ];
  return (
    <>
      {[-1, 1].map((x) => (
        <Profile
          key={x}
          points={points}
          depth={0.024}
          holes={[
            { x: 0, y: -length * 0.46, w: width * 0.38, h: length * 0.38 },
          ]}
          at={[x * 0.105, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
          color="#a5b3a4"
          bevel={0.004}
        />
      ))}
      <mesh position={[0, -length * 0.5, 0.015]} castShadow>
        <cylinderGeometry
          args={[width * 0.22, width * 0.22, length * 0.57, 24]}
        />
        <Surface color="#273d30" />
      </mesh>
      <mesh position={[0, -length * 0.53, -0.065]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, length * 0.7, 16]} />
        <Surface color="#9baa9d" />
      </mesh>
    </>
  );
}
export function RobotFoot() {
  return (
    <>
      <Plate
        width={0.3}
        depth={0.53}
        thickness={0.09}
        at={[0, -0.15, 0.16]}
        color="#8fa57b"
        corner={0.07}
      />
      <Plate
        width={0.315}
        depth={0.55}
        thickness={0.033}
        at={[0, -0.207, 0.16]}
        color="#17291d"
        finish="rubber"
        corner={0.075}
      />
      <Batch
        positions={Array.from(
          { length: 7 },
          (_, i) => [0, -0.222, -0.06 + i * 0.075] as Vec,
        )}
        size={[0.26, 0.007, 0.025]}
        color="#506b43"
      />
      <Fasteners
        positions={[-1, 1].map((x) => [x * 0.09, -0.101, 0.07] as Vec)}
        size={0.02}
      />
    </>
  );
}
