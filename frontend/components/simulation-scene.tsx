"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  Line,
  OrbitControls,
} from "@react-three/drei";
import {
  Component,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { EXPERIENCES } from "../lib/simulation-lessons";
import { SHOTS } from "../lib/simulation-direction";
import { SceneResources } from "./simulation-resources";
import { RenderQuality } from "./simulation-quality";
import {
  FramePosts,
  RackBase,
  ComputeTray,
  ProcessorPackages,
  ModuleBoard,
  ThermalCover,
  RobotShell,
  Beak,
  CameraLens,
  Plate,
  Profile,
  chamfer,
} from "./simulation-machined";
import { CONSTRUCTION } from "../lib/simulation-construction";
import {
  WaferLab,
  TransistorLab,
  LogicLab,
  ActivityMatrix,
  Etch,
  Pipe,
  BoardDetails,
  WalkingLeg,
  DepthReturns,
} from "./simulation-details";
import {
  State,
  Label,
  Surface,
  Block,
  Batch,
  Part,
  Joint,
  Flow,
  type Vec,
  type Props,
} from "./simulation-geometry";

function Rack() {
  const { focus, building } = useContext(State),
    networking = !building,
    cooling = !building || focus === "cooling";
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
  return (
    <>
      <Part id="foundation" name="Rack foundation" labelAt={[0, 0.6, 0.5]}>
        <RackBase />
      </Part>
      <Part id="rack" name="Rack frame" labelAt={[0, 5.7, 0]}>
        <FramePosts />
        <RackBase top />
        <Block at={[0, 5.15, 0.86]} size={[2.4, 0.3, 0.08]} color="#242e25" />
        <Batch
          positions={Array.from(
            { length: 3 },
            (_, i) => [-1.05 + i * 0.075, 5.15, 0.908] as Vec,
          )}
          size={[0.025, 0.035, 0.012]}
          color="#91b970"
        />
        <Etch
          text="RACK-SCALE COMPUTING / NVL72"
          at={[0.15, 5.15, 0.908]}
          width={1.6}
          front
        />
      </Part>
      <Part
        id="tray"
        name="18 illustrative compute trays"
        labelAt={[0, 5.1, 0.8]}
      >
        {Array.from({ length: 18 }, (_, i) => (
          <Part
            key={i}
            id={"tray-" + i}
            name={"Compute tray " + (i + 1)}
            at={[0, 0.32 + i * 0.25, 0]}
          >
            <ComputeTray />
          </Part>
        ))}
      </Part>
      <Part id="gpu" name="72 Rubin GPU markers" labelAt={[0.2, 4.9, 0.3]}>
        <ProcessorPackages positions={gpu} gpu />
      </Part>
      <Part id="cpu" name="36 Vera CPU markers" labelAt={[-0.2, 4.9, -0.1]}>
        <ProcessorPackages positions={cpu} />
      </Part>
      <Part
        id="memory"
        name="Working memory beside the processors"
        labelAt={[0, 5.1, -0.3]}
      >
        <Batch
          positions={Array.from(
            { length: 72 },
            (_, i) =>
              [
                -0.95 + (i % 4) * 0.63,
                0.46 + Math.floor(i / 4) * 0.25,
                -0.52,
              ] as Vec,
          )}
          size={[0.13, 0.04, 0.28]}
          color="#779568"
        />
      </Part>
      <Part
        id="network"
        name="NVLink / network · schematic"
        at={[0, 0, -0.76]}
        labelAt={[1.4, 4.7, 0]}
      >
        {Array.from({ length: 9 }, (_, i) => (
          <group key={i} position={[0, 0.6 + i * 0.5, 0]}>
            <Block size={[2.1, 0.13, 0.24]} color="#2b3d2a" />
            <Batch
              positions={Array.from(
                { length: 12 },
                (_, j) => [-0.92 + j * 0.165, 0, 0.14] as Vec,
              )}
              size={[0.1, 0.07, 0.03]}
              color="#0c1710"
            />
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
        {networking && (
          <Flow
            points={[
              [-1.1, 0.6, -0.2],
              [-1.65, 1.3, -0.2],
              [-1.65, 3.5, -0.2],
              [0, 4.6, -0.2],
              [1.15, 3.1, 0],
            ]}
            radius={0.04}
          />
        )}
        {[0, 1].map((i) => (
          <group key={i} position={[0, 4.93 + i * 0.19, 0]}>
            <Block size={[2.1, 0.15, 0.28]} color="#6c825c" />
            <Etch
              text={i ? "MANAGEMENT" : "NETWORK / SCHEMATIC"}
              at={[0, 0, 0.15]}
              width={1.6}
              front
            />
          </group>
        ))}
      </Part>
      <Part
        id="cooling"
        ghost={focus === "cpu" || focus === "memory"}
        name="Coolant manifold · illustrative path"
        labelAt={[1.5, 5.5, 0]}
      >
        {[-1, 1].map((x) => (
          <group key={x}>
            <mesh position={[x * 1.43, 2.75, -0.5]}>
              <cylinderGeometry args={[0.055, 0.055, 5.2, 12]} />
              <Surface color="#9aa795" />
            </mesh>
            {[0.6, 1.6, 2.6, 3.6, 4.6].map((y) => (
              <Pipe
                key={y}
                points={[
                  [x * 1.43, y, -0.5],
                  [x * 1.43, y, 0],
                  [x * 0.6, y, 0.2],
                ]}
                color={cooling ? "#d9f2bd" : "#667965"}
                radius={0.025}
              />
            ))}
          </group>
        ))}
      </Part>
      {
        <Part
          id="cooling-path"
          name="Cold plates and fluid path"
          ghost={focus === "cpu" || focus === "memory"}
        >
          {cooling && (
            <Flow
              color="#72d5a3"
              points={[
                [-1.43, 0.3, -0.5],
                [-1.43, 2, -0.5],
                [-1.43, 4.6, -0.5],
                [-0.5, 4.6, 0.2],
                [0.5, 4.6, 0.2],
                [1.43, 4.6, -0.5],
                [1.43, 0.3, -0.5],
              ]}
              radius={0.045}
              rate={0.14}
            />
          )}
          {Array.from({ length: 5 }, (_, i) => (
            <group key={i} position={[0, 0.6 + i, 0.18]}>
              <Block size={[1.6, 0.08, 0.36]} color="#9ba98d" />
              <Pipe
                points={[
                  [-1.43, 0, -0.68],
                  [-1, 0, 0],
                  [1, 0, 0],
                  [1.43, 0, -0.68],
                ]}
                radius={0.027}
                color="#a9b99f"
              />
            </group>
          ))}
        </Part>
      }
      <Part
        id="power"
        name="Power delivery"
        at={[0, -0.12, 0]}
        labelAt={[0, 0.5, 1.1]}
      >
        {[-1, 0, 1].map((i) => (
          <group key={i} position={[i * 0.76, 0.12, 0]}>
            <Block size={[0.66, 0.23, 1.5]} color="#56634e" />
            <Batch
              positions={Array.from(
                { length: 7 },
                (_, j) => [-0.24 + j * 0.08, 0, 0.76] as Vec,
              )}
              size={[0.025, 0.14, 0.02]}
              color="#121d13"
            />
            <Etch text="POWER" at={[0, 0.13, 0.45]} width={0.4} />
          </group>
        ))}
      </Part>
      <Part id="power-bar" name="Power distribution bar">
        <Block
          at={[1.12, 2.6, -0.9]}
          size={[0.09, 4.8, 0.08]}
          color={focus === "power" ? "#d8d8a2" : "#716d4c"}
        />
      </Part>
      {focus === "power" && (
        <Flow
          color="#e3efa1"
          points={[
            [0, 0.2, 1.65],
            [1.1, 0.4, -0.85],
            [1.1, 2.5, -0.85],
            [1.1, 4.7, -0.85],
            [0, 4.7, 0.3],
          ]}
        />
      )}
      {!building && (
        <Part
          id="flow"
          name="Request → CPU → GPU work → result"
          labelAt={[0, 5.6, 1]}
        >
          <Flow
            points={[
              [-2, 0.5, 1],
              [-1.5, 2.5, 1],
              [0.1, 2.5, 1],
              [0.7, 3.5, 0.9],
              [1.8, 4.7, 1],
            ]}
          />
          <Flow
            color="#85c77e"
            rate={0.18}
            points={[
              [1.8, 4.7, 1],
              [1.4, 3.6, 1.2],
              [0.7, 2.7, 1.2],
              [-1.8, 1.1, 1.2],
            ]}
          />
        </Part>
      )}
    </>
  );
}
function Module() {
  const { focus, building, stageIndex } = useContext(State);
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
  if (stageIndex === 0) return null;
  const current = CONSTRUCTION.thor[stageIndex];
  if (current.concept && current.shot === 0) return <WaferLab />;
  if (current.id === "transistor") return <TransistorLab />;
  if (current.id === "logic") return <LogicLab />;
  return (
    <>
      <Part
        id="module"
        name="T5000 module · conceptual layout"
        at={[0, 1.25, 0]}
        labelAt={[0, 0.3, 1.3]}
      >
        <ModuleBoard />
        <BoardDetails width={3.5} depth={2.5} at={[0, 0.09, 0]} />
        <Etch
          text="T5000 / CONCEPTUAL BOARD"
          at={[0, 0.075, 1.1]}
          width={1.9}
        />
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
      <Part id="power-pins" name="Module connections">
        <Batch positions={pins} size={[0.065, 0.045, 0.08]} color="#b0a27d" />
      </Part>
      <Part
        id="silicon"
        name="Processor package · conceptual layers"
        at={[0, 1.46, 0]}
        labelAt={[0, 0.4, -0.7]}
      >
        <Plate
          width={2.15}
          depth={1.55}
          thickness={0.18}
          color="#24362d"
          corner={0.1}
        />
        <Plate
          width={1.95}
          depth={1.36}
          thickness={0.035}
          at={[0, 0.11, 0]}
          color="#66826b"
          finish="silicon"
          corner={0.07}
        />
        <Batch
          positions={Array.from(
            { length: 24 },
            (_, i) =>
              [-0.95 + (i % 12) * 0.17, -0.11, i < 12 ? -0.65 : 0.65] as Vec,
          )}
          size={[0.06, 0.04, 0.06]}
          color="#c2b586"
        />
        {
          <Part
            id="package-lid"
            name="Package cover / educational cutaway"
            at={[0, 0.34, 0]}
          >
            <ThermalCover />
          </Part>
        }
      </Part>
      <Part
        id="cpu"
        name="14 CPU cores · logical diagram"
        labelAt={[-0.65, 2.1, 0]}
      >
        <group position={[-0.75, 1.67, 0]}>
          <Block
            at={[0, -0.04, -0.03]}
            size={[0.7, 0.04, 0.65]}
            color="#314134"
          />
          <ActivityMatrix
            at={[-0.19, 0.02, -0.24]}
            columns={4}
            rows={3}
            pitch={0.13}
            serial
          />
          <Batch
            positions={cores
              .slice(12)
              .map((p) => [p[0] + 0.75, p[1] - 1.67, p[2]] as Vec)}
            size={[0.1, 0.075, 0.1]}
            color="#c6c9b4"
          />
          <Etch text="14 CPU CORES" at={[0, 0.03, 0.25]} width={0.66} />
          <Block
            at={[0.01, 0.01, 0.36]}
            size={[0.6, 0.035, 0.06]}
            color="#9bba78"
          />
          {focus === "cpu" && (
            <Flow
              points={[
                [-0.45, 0.13, -0.35],
                [-0.17, 0.13, -0.2],
                [0.05, 0.13, 0.1],
                [0.01, 0.13, 0.36],
              ]}
              radius={0.018}
              rate={0.35}
            />
          )}
        </group>
      </Part>
      <Part
        id="gpu"
        name="Blackwell GPU · illustrative groups"
        labelAt={[0.55, 2.1, 0]}
      >
        <Block at={[0.5, 1.63, 0.05]} size={[1, 0.04, 0.9]} color="#263c2c" />
        <ActivityMatrix
          at={[0.05, 1.69, -0.25]}
          columns={8}
          rows={6}
          pitch={0.12}
        />
        <Batch
          positions={gpu.map((p) => [p[0], 1.72, p[2]] as Vec)}
          size={[0.055, 0.014, 0.015]}
          color="#d1e1b4"
        />
        <Etch text="BLACKWELL / WORK GROUPS" at={[0.5, 1.69, 0.55]} width={1} />
      </Part>
      <Part id="memory" name="LPDDR5X working memory" labelAt={[1.5, 1.9, 0.6]}>
        {[-1, 1].flatMap((x) =>
          [-1, 1].map((z) => (
            <group key={`${x}${z}`} position={[x * 1.37, 1.46, z * 0.68]}>
              <Block size={[0.38, 0.15, 0.65]} color="#3b433c" />
              <Block
                at={[0, 0.08, 0]}
                size={[0.28, 0.015, 0.48]}
                color="#6c7b64"
              />
              <Etch text="LPDDR5X" at={[0, 0.095, 0]} width={0.32} />
              <Batch
                positions={Array.from(
                  { length: 10 },
                  (_, i) =>
                    [
                      (i % 2 ? -1 : 1) * 0.2,
                      0,
                      -0.25 + Math.floor(i / 2) * 0.12,
                    ] as Vec,
                )}
                size={[0.05, 0.025, 0.045]}
                color="#b3a77c"
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
      <Part id="board-traces" name="Printed board connections">
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
      </Part>
      {(!building || focus === "memory") && (
        <Part
          id="flow"
          name="Sensor → CPU → GPU → output"
          labelAt={[0, 1.85, 0]}
        >
          <Flow
            points={[
              [-2.3, 1.5, 1],
              [-1.1, 1.8, 0],
              [0.5, 1.8, 0],
              [1.4, 1.65, 0.6],
              [2.1, 1.5, 1],
            ]}
          />
          {!building && (
            <>
              <mesh position={[-2.2, 1.5, 1]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.16, 0.23, 0.28, 24]} />
                <Surface color="#789c64" />
              </mesh>
              <Etch text="SENSOR" at={[-2.2, 1.8, 1]} width={0.65} front />
              <Etch text="OUTPUT" at={[2.15, 1.8, 1]} width={0.65} front />
              <ActivityMatrix
                at={[1.9, 1.5, 0.8]}
                columns={3}
                rows={3}
                pitch={0.15}
              />
            </>
          )}
        </Part>
      )}
    </>
  );
}
function Duck() {
  const { focus, building } = useContext(State);
  const sensorRays = useMemo(
    () =>
      new Float32Array(
        Array.from({ length: 64 }, (_, i) => [
          0,
          2.4,
          0.86,
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
        id="frame"
        name="Structural frame"
        at={[0, 1.5, 0]}
        labelAt={[0, 0.7, 0]}
      >
        {[-1, 1].map((z) => (
          <Profile
            key={z}
            points={chamfer(0.68, 0.56, 0.045)}
            depth={0.045}
            holes={[{ x: 0, y: 0, w: 0.575, h: 0.44 }]}
            at={[0, 0, z * 0.22]}
            color="#7e9986"
            bevel={0.005}
          />
        ))}
        {[-1, 1].map((y) => (
          <Plate
            key={y}
            width={0.68}
            depth={0.48}
            thickness={0.045}
            at={[0, y * 0.25, 0]}
            color="#526b58"
            corner={0.04}
          />
        ))}
      </Part>
      <Part
        id="body"
        name="Body shell and structural frame"
        at={[0, 1.5, 0]}
        ghost={
          !building &&
          [
            "frame",
            "processor",
            "compute",
            "sensor",
            "battery",
            "imu",
          ].includes(focus)
        }
        labelAt={[0, 1.3, 0]}
      >
        <RobotShell />
        {![
          "frame",
          "processor",
          "compute",
          "sensor",
          "battery",
          "imu",
        ].includes(focus) && (
          <Etch text="MICRODUCK" at={[0, 0.2, 0.305]} width={0.42} front />
        )}
      </Part>
      <Part
        id="battery"
        name="Battery and power"
        at={[0, 1.5, -0.17]}
        labelAt={[0, 0.25, -0.3]}
      >
        <Profile
          points={chamfer(0.43, 0.32, 0.035)}
          depth={0.22}
          color="#26362d"
          finish="polymer"
        />
        <Batch
          positions={Array.from(
            { length: 5 },
            (_, i) => [-0.17 + i * 0.085, 0, 0.115] as Vec,
          )}
          size={[0.025, 0.24, 0.012]}
          color="#527344"
        />
        <Etch text="BATTERY" at={[0, 0, 0.128]} width={0.36} front />
      </Part>
      <Part
        id="motor"
        name="Leg motors and linked joints"
        labelAt={[-0.4, 1.1, 0.3]}
      >
        <Plate
          width={0.66}
          depth={0.28}
          thickness={0.14}
          at={[0, 1.16, 0]}
          color="#697c68"
          corner={0.06}
        />
        {[-1, 1].map((side) => (
          <Part
            key={side}
            id={`leg-${side}`}
            name={`${side > 0 ? "Right" : "Left"} leg chain`}
            at={[side * 0.28, 1.106, 0]}
            labelAt={[0, -0.5, 0.35]}
          >
            <WalkingLeg side={side} />
          </Part>
        ))}
      </Part>
      <Part
        id="head"
        name="Head, neck and articulated beak"
        at={[0, 2.04, 0.03]}
        ghost={!building && ["sensor", "imu"].includes(focus)}
        labelAt={[0, 0.58, 0]}
      >
        <Joint at={[0, -0.18, 0]} radius={0.12} />
        <mesh position={[0, -0.07, 0]} castShadow>
          <cylinderGeometry args={[0.085, 0.11, 0.15, 24]} />
          <Surface color="#81957c" />
        </mesh>
        <RobotShell head />
        <Joint at={[0, -0.04, 0.32]} radius={0.06} />
        <Beak />
      </Part>
      <Part
        id="sensor"
        name="Front camera and ToF depth sensing"
        at={[0, 2.2, 0.39]}
        labelAt={[0, 0.5, 0]}
      >
        <Profile
          points={chamfer(0.84, 0.24, 0.025)}
          depth={0.02}
          at={[0, 0, -0.035]}
          color="#172a20"
          finish="polymer"
          bevel={0.003}
        />
        <CameraLens at={[-0.19, 0, 0.01]} />
        <Profile
          points={chamfer(0.16, 0.115, 0.02)}
          depth={0.06}
          at={[0.23, -0.015, 0]}
          color="#1b3024"
          finish="polymer"
        />
        <Batch
          positions={Array.from(
            { length: 16 },
            (_, i) =>
              [
                0.19 + (i % 4) * 0.026,
                -0.051 + Math.floor(i / 4) * 0.025,
                0.038,
              ] as Vec,
          )}
          size={[0.014, 0.014, 0.008]}
          color="#7fb8a0"
        />
        <Block
          at={[0.06, 0.025, 0.025]}
          size={[0.018, 0.018, 0.01]}
          color="#b1e77a"
          glow
          round={false}
        />
      </Part>
      <Part
        id="imu"
        name="Body and head IMUs · illustrative placement"
        labelAt={[0.5, 2.5, 0.5]}
      >
        {[-1, 1].map((x) => (
          <Block
            key={x}
            at={[x * 0.25, x < 0 ? 1.58 : 2.3, 0.18]}
            size={[0.12, 0.07, 0.14]}
            color="#7ca95e"
          />
        ))}
      </Part>
      <Part
        id="processor"
        name="Rockchip RK3566 · conceptual board"
        at={[0, 1.58, 0.22]}
        labelAt={[0, 0.55, 0.1]}
      >
        <Profile
          points={chamfer(0.65, 0.38, 0.025)}
          depth={0.045}
          color="#2e6743"
          finish="board"
          bevel={0.003}
        />
        <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.005]}>
          <BoardDetails width={0.6} depth={0.32} />
        </group>
        <Block
          at={[-0.1, 0.02, 0.03]}
          size={[0.28, 0.23, 0.035]}
          color="#202d26"
        />
        <Etch text="RK3566" at={[-0.1, 0.02, 0.055]} width={0.26} front />
        {[-1, 1].map((x) => (
          <Block
            key={x}
            at={[x * 0.23, -0.09, 0.03]}
            size={[0.09, 0.09, 0.025]}
            color="#a7bd8a"
          />
        ))}
        {focus === "compute" && (
          <group position={[0, 0.03, 0.06]}>
            {["CPU", "Mali GPU", "NPU"].map((label, i) => (
              <Part
                key={label}
                id={`compute-${i}`}
                name={label}
                at={[(i - 1) * 0.21, 0, 0]}
                labelAt={[0, 0.15, 0]}
              >
                <Block
                  size={[0.16, 0.12, 0.025]}
                  color={i === 0 ? "#a7b994" : "#81aa58"}
                />
                <Etch text={label} at={[0, 0.09, 0.025]} width={0.18} front />
                <group
                  rotation={[Math.PI / 2, 0, 0]}
                  position={[-0.045, 0.025, 0.025]}
                >
                  <ActivityMatrix
                    at={[0, 0, 0]}
                    columns={i === 0 ? 2 : 4}
                    rows={2}
                    pitch={i === 0 ? 0.05 : 0.025}
                    serial={i === 0}
                  />
                </group>
              </Part>
            ))}
          </group>
        )}
      </Part>
      {!building && focus === "sensor" && (
        <group>
          <lineSegments>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[sensorRays, 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#b4ed73" transparent opacity={0.2} />
          </lineSegments>
          <DepthReturns />
        </group>
      )}
      {!building && (
        <group>
          <Flow
            points={[
              [0, 2.25, 0.6],
              [0.6, 1.85, 0.7],
              [0, 1.55, 0.8],
              [-0.45, 0.8, 0.6],
              [-0.3, 0.3, 0.3],
            ]}
          />
          <Flow
            color="#82ba7c"
            radius={0.025}
            rate={0.19}
            points={[
              [-0.3, 0.3, 0.3],
              [-0.7, 0.8, 0.6],
              [-0.55, 1.6, 0.65],
              [0, 2.25, 0.6],
            ]}
          />
        </group>
      )}
    </>
  );
}
function Camera({
  kind,
  step,
  reset,
  zoom,
  reduced,
  playing,
  time,
}: Pick<
  Props,
  "kind" | "step" | "reset" | "zoom" | "reduced" | "playing" | "time"
>) {
  const camera = useThree((s) => s.camera);
  const aspect = useThree((s) => s.size.width / s.size.height);
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null!);
  const shot = SHOTS[kind][step];
  const playingRef = useRef(playing);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  const flight = useRef({
    active: false,
    started: 0,
    first: true,
    from: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    to: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
  });
  useEffect(() => {
    const f = flight.current;
    f.toTarget.set(...shot.target);
    const focus = EXPERIENCES[kind].steps[step].focus;
    // Reserve the callout strip while keeping the tall rack large on phones.
    if (
      kind === "rubin" &&
      aspect < 0.9 &&
      !["cpu", "memory", "power"].includes(focus)
    )
      f.toTarget.y += 0.3;
    const fitWidth =
      kind === "microduck"
        ? focus === "compute"
          ? 1.05
          : 0.8
        : kind === "thor"
          ? step < 7
            ? 1.25
            : 1.0
          : ["cpu", "memory"].includes(focus)
            ? 0.95
            : 0.62;
    const fit =
      Math.max(1, fitWidth / aspect) *
      (kind === "microduck"
        ? step <= 1
          ? 1.12
          : 1.1
        : kind === "rubin" && !["cpu", "memory"].includes(focus)
          ? 1.13
          : 1);
    f.to
      .set(...shot.eye)
      .sub(f.toTarget)
      .multiplyScalar(fit)
      .add(f.toTarget);
    if (f.first || reduced || !playingRef.current) {
      camera.position.copy(f.to);
      if (f.first && !reduced)
        camera.position.sub(f.toTarget).multiplyScalar(1.12).add(f.toTarget);
      controls.current.target.copy(f.toTarget);
      controls.current.update();
    }
    f.from.copy(camera.position);
    f.fromTarget.copy(controls.current.target);
    f.started = time.current;
    f.active = !reduced && playingRef.current;
    f.first = false;
    if (reduced) {
      camera.position.copy(f.to);
      controls.current.target.copy(f.toTarget);
      controls.current.update();
    }
  }, [shot, reset, camera, aspect, reduced, kind, step, time]);
  useFrame(() => {
    const f = flight.current;
    if (!f.active) return;
    const t = Math.min(1, (time.current - f.started) / 2.1),
      ease = t * t * (3 - 2 * t);
    camera.position.lerpVectors(f.from, f.to, ease);
    controls.current.target.lerpVectors(f.fromTarget, f.toTarget, ease);
    controls.current.update();
    if (t === 1) f.active = false;
  }, -0.5);
  const previousZoom = useRef(zoom);
  useEffect(() => {
    if (zoom === previousZoom.current) return;
    flight.current.active = false;
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
      onStart={() => {
        flight.current.active = false;
      }}
      minDistance={kind === "rubin" ? 2 : 0.8}
      maxDistance={kind === "rubin" ? 22 : 17}
      maxPolarAngle={Math.PI * 0.49}
      enablePan
      enableDamping
      dampingFactor={0.08}
    />
  );
}
function World(props: Props) {
  const selected = props.inspection;
  useEffect(() => props.onReady(), [props.onReady]);
  const select = (id: string, name: string) => {
    props.onInspect(id, name);
  };
  const focus = props.focus;
  const ground = props.kind === "microduck" ? 0 : -0.25;
  return (
    <State.Provider
      value={{
        ...props,
        selected,
        select,
        focus,
      }}
    >
      <color attach="background" args={["#080b09"]} />
      <fog attach="fog" args={["#080b09", 15, 34]} />
      <ambientLight intensity={0.34} />
      <hemisphereLight args={["#e7f1e7", "#101c15", 0.9]} />
      <directionalLight
        position={[4, 8, 6]}
        intensity={2.65}
        color="#f0f5e9"
        castShadow
        shadow-mapSize-width={props.kind === "microduck" ? 1024 : 2048}
        shadow-mapSize-height={props.kind === "microduck" ? 1024 : 2048}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={7}
        shadow-camera-bottom={-3}
        shadow-camera-near={0.5}
        shadow-camera-far={22}
        shadow-normalBias={0.018}
        shadow-bias={-0.0001}
      />
      <spotLight
        position={[-4, 6, -4]}
        intensity={95}
        angle={0.65}
        penumbra={0.9}
        color="#b9efbb"
      />
      <directionalLight
        position={[-5, 3, 4]}
        intensity={1.05}
        color="#a7c5b4"
      />
      <Environment resolution={256} frames={1} environmentIntensity={1.0}>
        <Lightformer
          position={[2, 6, 3]}
          rotation={[-Math.PI / 4, 0, 0]}
          intensity={3}
          scale={[5, 4, 1]}
        />
        <Lightformer
          position={[-4, 2, 1]}
          rotation={[0, Math.PI / 2, 0]}
          intensity={1.5}
          scale={[2, 5, 1]}
        />
        <Lightformer position={[1, 4, -5]} intensity={3} scale={[1, 6, 1]} />
      </Environment>
      <group name="sim-model">
        {props.kind === "rubin" ? (
          <Rack />
        ) : props.kind === "thor" ? (
          <Module />
        ) : (
          <Duck />
        )}
      </group>
      {!selected &&
        !props.building &&
        props.kind === "microduck" &&
        ["assembly", "compute", "flow", "walk"].includes(focus) && (
          <Label
            at={focus === "compute" ? [0, 1.88, 0.3] : [0, 2.5, 0.3]}
            text={
              focus === "assembly"
                ? "Head · body · power · electronics · legs"
                : focus === "compute"
                  ? "RK3566 · CPU / Mali GPU / NPU roles"
                  : focus === "flow"
                    ? "Sensors → controller → motors → feedback"
                    : "Hip, knee and ankle · planted-foot gait"
            }
          />
        )}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, ground, 0]}
        receiveShadow
      >
        <circleGeometry args={[10, 96]} />
        <meshStandardMaterial color="#101811" metalness={0.6} roughness={0.7} />
      </mesh>
      {[2.8, 3.7, 5.1].map((r) => (
        <mesh
          key={r}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, ground + 0.005, 0]}
        >
          <ringGeometry args={[r, r + 0.008, 100]} />
          <meshBasicMaterial color="#3d5431" transparent opacity={0.5} />
        </mesh>
      ))}
      <Camera
        kind={props.kind}
        step={props.step}
        reset={props.reset}
        zoom={props.zoom}
        reduced={props.reduced}
        playing={props.playing}
        time={props.time}
      />
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
        The 3D scene could not start. Reload the page to try again.
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
  const [lost, setLost] = useState(false);
  return (
    <SceneBoundary onFailure={() => setLost(true)}>
      {lost && (
        <div className="sim-no-webgl" role="alert">
          The graphics connection was lost.{" "}
          <button onClick={() => location.reload()}>Reload 3D</button>
        </div>
      )}
      <Canvas
        frameloop={props.playing && !props.reduced ? "always" : "demand"}
        dpr={2}
        shadows="soft"
        camera={{ position: [5, 4, 7], fov: 38, near: 0.05, far: 60 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
          gl.toneMappingExposure = 1.05;
          gl.domElement.setAttribute(
            "aria-label",
            `${EXPERIENCES[props.kind].name} interactive 3D scene`,
          );
        }}
      >
        <SceneResources>
          <World {...props} />
          <RenderQuality
            kind={props.kind}
            building={props.building}
            stageIndex={props.stageIndex}
            time={props.time}
            reduced={props.reduced}
            playing={props.playing}
          />
          <ContextMonitor onChange={setLost} />
        </SceneResources>
      </Canvas>
    </SceneBoundary>
  );
}
export default memo(SimulationScene);
