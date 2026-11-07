import type { ExperienceId } from "./simulation-lessons";

export type SceneVector = [number, number, number];
export type CameraShot = {
  eye: SceneVector;
  target: SceneVector;
  view: string;
  scope: string;
  signal?: string;
};

// Camera direction belongs to the educational scene, not to product specifications.
// Coordinates and every internal arrangement are original teaching illustrations.
export const SHOTS: Record<ExperienceId, CameraShot[]> = {
  rubin: [
    {
      eye: [6.3, 4.5, 7.8],
      target: [0, 2.5, 0],
      view: "EMPTY STAGE TO COMPLETE RACK",
      scope: "Rack-scale schematic",
    },
    {
      eye: [7.8, 5.6, 9.4],
      target: [0, 2.6, 0.7],
      view: "ASSEMBLED RACK STRUCTURE",
      scope: "Final-position teaching model",
    },
    {
      eye: [2.2, 5.4, 2.8],
      target: [0, 4.68, 0],
      view: "PROCESSORS IN THE ASSEMBLED RACK",
      scope: "Illustrative package placement",
      signal: "CPU coordination → parallel GPU work",
    },
    {
      eye: [-2.7, 5.3, 2.4],
      target: [0, 4.65, 0],
      view: "THE WORKING MEMORY",
      scope: "Illustrative memory placement",
      signal: "LPDDR5X ↔ CPU · HBM4 ↔ GPU",
    },
    {
      eye: [6.6, 4.4, -8.4],
      target: [0, 2.6, -0.65],
      view: "THE CONNECTION FABRIC",
      scope: "Illustrative connection routes",
      signal: "NVLink within the rack · networking beyond it",
    },
    {
      eye: [3.6, 1.8, 5.5],
      target: [0, 0.7, 0],
      view: "FOLLOW THE POWER",
      scope: "Illustrative electrical path",
      signal: "Power shelves → bus bar → electronics",
    },
    {
      eye: [7, 4.5, -7.6],
      target: [0.3, 2.7, -0.4],
      view: "FOLLOW THE HEAT",
      scope: "Illustrative cooling loop",
      signal: "Coolant supply → cold plates → warm return",
    },
    {
      eye: [5.7, 4.6, 8.4],
      target: [0, 2.5, 0.3],
      view: "ONE EXAMPLE WORKLOAD",
      scope: "Educational flow · no benchmark",
      signal: "Request → CPU → memory / GPUs → result",
    },
    {
      eye: [-6.1, 4.3, 8],
      target: [0, 2.55, 0],
      view: "THE COMPLETE RACK",
      scope: "Rack-scale schematic",
    },
  ],
  thor: [
    {
      eye: [3.7, 4.6, 5.7],
      target: [0, 1.2, 0],
      view: "FROM WAFER TO CHIP",
      scope: "General fabrication concept",
      signal: "Pattern → build layers → separate a die → package",
    },
    {
      eye: [2, 2.4, 3.2],
      target: [0, 1.4, 0],
      view: "ONE ENLARGED SWITCH",
      scope: "Concept · not a T5000 transistor",
      signal: "Gate signal controls current through the channel",
    },
    {
      eye: [3.3, 4, 4.9],
      target: [-0.4, 1.5, 0],
      view: "SWITCHES BECOME LOGIC",
      scope: "Conceptual AND gate",
      signal: "Output is 1 only when inputs A and B are both 1",
    },
    {
      eye: [3.3, 3.6, 4],
      target: [0, 1.5, 0],
      view: "BUILD THE MODULE IN PLACE",
      scope: "Illustrative T5000 board",
    },
    {
      eye: [0.1, 2.8, 1.8],
      target: [-0.75, 1.68, 0],
      view: "THE CPU CLOSE-UP",
      scope: "14 cores · logical illustration",
      signal: "Instruction → core → cache → next instruction",
    },
    {
      eye: [1.9, 3, 2.2],
      target: [0.5, 1.7, 0.1],
      view: "THE GPU CLOSE-UP",
      scope: "Conceptual work groups",
      signal: "Many similar calculations run together",
    },
    {
      eye: [-3, 3.4, 3.8],
      target: [0, 1.45, 0],
      view: "CONNECTING CPU, GPU & MEMORY",
      scope: "Illustrative package positions",
      signal: "Inputs / parameters ↔ working memory ↔ processors",
    },
    {
      eye: [4.7, 4.1, 5.6],
      target: [0, 1.7, 0.3],
      view: "SENSOR TO AI OUTPUT",
      scope: "Example workload · no live inference",
      signal: "Sensor → CPU preparation → GPU inference → output",
    },
    {
      eye: [-4.2, 4.6, 5.3],
      target: [0, 1.5, 0],
      view: "THE COMPLETE MODULE",
      scope: "Illustrative T5000 board",
    },
  ],
  microduck: [
    {
      eye: [2.5, 2.25, 3.3],
      target: [0, 1.3, 0],
      view: "EMPTY STAGE TO COMPLETE ROBOT",
      scope: "Original mechanical interpretation",
    },
    {
      eye: [3.6, 2.7, 4.8],
      target: [0, 1.55, 0],
      view: "FRAME AND ATTACHED ASSEMBLIES",
      scope: "Illustrative internal placement",
    },
    {
      eye: [2.1, 1.5, 2.8],
      target: [0, 0.75, 0],
      view: "THE JOINT CHAIN",
      scope: "Illustrative actuator arrangement",
      signal: "Motor shaft → joint rotation → linked motion",
    },
    {
      eye: [-3, 2.7, 5],
      target: [0, 1.9, 0.9],
      view: "SENSING THE WORLD",
      scope: "Conceptual sensor rays",
      signal: "Camera + 8×8 ToF depth + body / head IMUs",
    },
    {
      eye: [0.9, 1.95, 1.5],
      target: [0, 1.58, 0.22],
      view: "THE ONBOARD COMPUTER",
      scope: "Conceptual RK3566 board",
    },
    {
      eye: [0.6, 1.9, 1.25],
      target: [0, 1.6, 0.25],
      view: "THREE COMPUTING ROLES",
      scope: "Logical blocks · not a floorplan",
      signal: "CPU coordination · Mali graphics · supported NPU inference",
    },
    {
      eye: [-2.7, 2.5, 4.1],
      target: [0, 1.3, 0.25],
      view: "THE REPEATING CONTROL LOOP",
      scope: "Illustrative signals · no live policy",
      signal: "Observe → decide → command → measure again",
    },
    {
      eye: [2.8, 1.7, 4.3],
      target: [0, 1.15, 0],
      view: "A WALKING CYCLE, IN PLACE",
      scope: "Kinematic foot placement · no force solver",
      signal: "Bright ground markers show planted support feet",
    },
    {
      eye: [-2.5, 2.3, 3.3],
      target: [0, 1.3, 0],
      view: "ONE ROBOT, MANY COOPERATING PARTS",
      scope: "Original mechanical interpretation",
    },
  ],
};
