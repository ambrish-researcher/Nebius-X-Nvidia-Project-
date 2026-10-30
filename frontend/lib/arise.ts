import type { RobotSpec, Vec3 } from "./types";

export type RobotKind = "humanoid" | "drone" | "microduck";
export interface Part {
  id: string;
  name: string;
  position: Vec3;
  size: Vec3;
  rotation?: Vec3;
  shape?: "box" | "sphere" | "cylinder";
  color?: string;
  role: string;
  pivot?: Vec3;
  motion?: "arm" | "head" | "propeller" | "leg";
}
const part = (
  id: string,
  name: string,
  position: Vec3,
  size: Vec3,
  role: string,
  extra: Partial<Part> = {},
): Part => ({ id, name, position, size, role, ...extra });
export const ROBOTS: Record<
  RobotKind,
  {
    name: string;
    subtitle: string;
    description: string;
    tasks: string[];
    parts: Part[];
  }
> = {
  humanoid: {
    name: "Humanoid",
    subtitle: "ARTICULATED INTELLIGENCE",
    description:
      "Meet the mechanics of movement. Explore a human-inspired architecture, one joint at a time.",
    tasks: ["Raise arm", "Wave", "Turn head"],
    parts: [
      part(
        "torso",
        "Torso",
        [0, 1.8, 0],
        [0.78, 0.85, 0.42],
        "The load-bearing chassis carries the controller, battery and shoulder mounts.",
      ),
      part(
        "pelvis",
        "Pelvis",
        [0, 1.18, 0],
        [0.58, 0.25, 0.35],
        "Distributes the upper-body load into both legs.",
        { color: "#343b35" },
      ),
      part(
        "neck",
        "Neck actuator",
        [0, 2.32, 0],
        [0.18, 0.2, 0.18],
        "A servo turns the head about its vertical axis.",
        { shape: "cylinder", color: "#94d849" },
      ),
      part(
        "head",
        "Sensor head",
        [0, 2.65, 0],
        [0.55, 0.46, 0.43],
        "Houses perception sensors. This model does not process camera images.",
        { motion: "head", pivot: [0, 2.32, 0] },
      ),
      part(
        "visor",
        "Vision module",
        [0, 2.66, 0.23],
        [0.42, 0.12, 0.03],
        "A conceptual stereo vision housing for measuring visual features.",
        { color: "#a8ef64", motion: "head", pivot: [0, 2.32, 0] },
      ),
      ...([-1, 1] as const).flatMap((s) => [
        part(
          `shoulder-${s}`,
          `${s === 1 ? "Right" : "Left"} shoulder`,
          [s * 0.56, 2.06, 0],
          [0.26, 0.26, 0.26],
          "A rotary joint connects the arm to the torso.",
          { shape: "sphere", color: "#424b43" },
        ),
        part(
          `arm-${s}`,
          `${s === 1 ? "Right" : "Left"} upper arm`,
          [s * 0.61, 1.77, 0],
          [0.23, 0.48, 0.26],
          "Transmits shoulder motion to the elbow.",
          s === 1 ? { motion: "arm", pivot: [0.56, 2.06, 0] } : {},
        ),
        part(
          `elbow-${s}`,
          `${s === 1 ? "Right" : "Left"} elbow`,
          [s * 0.63, 1.46, 0],
          [0.22, 0.22, 0.22],
          "A hinge provides elbow flexion.",
          {
            shape: "sphere",
            color: "#94d849",
            ...(s === 1
              ? { motion: "arm" as const, pivot: [0.56, 2.06, 0] as Vec3 }
              : {}),
          },
        ),
        part(
          `forearm-${s}`,
          `${s === 1 ? "Right" : "Left"} forearm`,
          [s * 0.64, 1.2, 0],
          [0.2, 0.4, 0.23],
          "Carries the wrist and transfers the elbow load.",
          s === 1 ? { motion: "arm", pivot: [0.56, 2.06, 0] } : {},
        ),
        part(
          `hand-${s}`,
          `${s === 1 ? "Right" : "Left"} hand`,
          [s * 0.64, 0.91, 0.02],
          [0.23, 0.22, 0.16],
          "A simplified end effector. Finger manipulation is outside this demo.",
          {
            color: "#444d46",
            ...(s === 1
              ? { motion: "arm" as const, pivot: [0.56, 2.06, 0] as Vec3 }
              : {}),
          },
        ),
        part(
          `thigh-${s}`,
          `${s === 1 ? "Right" : "Left"} thigh`,
          [s * 0.22, 0.85, 0],
          [0.27, 0.43, 0.3],
          "A structural link between the hip and knee.",
        ),
        part(
          `knee-${s}`,
          `${s === 1 ? "Right" : "Left"} knee`,
          [s * 0.22, 0.57, 0],
          [0.23, 0.23, 0.23],
          "A knee hinge allows leg flexion.",
          { shape: "sphere", color: "#94d849" },
        ),
        part(
          `shin-${s}`,
          `${s === 1 ? "Right" : "Left"} shin`,
          [s * 0.22, 0.32, 0],
          [0.24, 0.35, 0.27],
          "Transfers load from the knee to the ankle.",
        ),
        part(
          `foot-${s}`,
          `${s === 1 ? "Right" : "Left"} foot`,
          [s * 0.22, 0.09, 0.12],
          [0.3, 0.15, 0.5],
          "Provides a support area; balance is not simulated.",
          { color: "#343b35" },
        ),
      ]),
      part(
        "compute",
        "Onboard controller",
        [0, 1.85, 0.235],
        [0.31, 0.2, 0.035],
        "CPU runs coordination; an optional GPU accelerates perception.",
        { color: "#89c947" },
      ),
    ],
  },
  drone: {
    name: "Drone",
    subtitle: "FLIGHT, DECONSTRUCTED",
    description:
      "Four rotors. One coordinated system. Discover the architecture behind a quadcopter.",
    tasks: ["Take off", "Hover", "Land"],
    parts: [
      part(
        "frame",
        "Main frame",
        [0, 1, 0],
        [0.55, 0.16, 0.55],
        "The rigid center plate connects four motor arms.",
        { color: "#a0aaa1" },
      ),
      part(
        "battery",
        "Battery",
        [0, 1.18, 0],
        [0.29, 0.18, 0.42],
        "Supplies the motors and electronics. Flight time is not estimated.",
        { color: "#414b3f" },
      ),
      part(
        "controller",
        "Flight controller",
        [0, 1.31, 0],
        [0.23, 0.055, 0.23],
        "Combines inertial measurements with attitude and motor commands.",
        { color: "#94d849" },
      ),
      part(
        "camera",
        "Camera module",
        [0, 0.88, 0.3],
        [0.18, 0.15, 0.16],
        "A forward-facing imaging sensor.",
        { color: "#94d849" },
      ),
      ...([-1, 1] as const).flatMap((x) =>
        ([-1, 1] as const).flatMap((z) => [
          part(
            `arm-${x}-${z}`,
            "Motor arm",
            [x * 0.31, 1, z * 0.31],
            [0.12, 0.1, 0.9],
            "A structural boom carries motor forces to the frame.",
            { rotation: [0, (x * z * Math.PI) / 4, 0] },
          ),
          part(
            `motor-${x}-${z}`,
            "Brushless motor",
            [x * 0.62, 1.1, z * 0.62],
            [0.18, 0.2, 0.18],
            "Converts electrical energy to rotor torque.",
            { shape: "cylinder", color: "#444d46" },
          ),
          part(
            `prop-${x}-${z}`,
            "Propeller",
            [x * 0.62, 1.23, z * 0.62],
            [0.77, 0.025, 0.085],
            "Rotating blades produce thrust in real flight. Here rotation is purely visual.",
            {
              color: "#a7e86a",
              motion: "propeller",
              pivot: [x * 0.62, 1.23, z * 0.62],
            },
          ),
          part(
            `skid-${x}-${z}`,
            "Landing strut",
            [x * 0.3, 0.73, z * 0.3],
            [0.055, 0.4, 0.055],
            "Supports the frame while on the ground.",
            { color: "#434c43" },
          ),
        ]),
      ),
    ],
  },
  microduck: {
    name: "Microduck",
    subtitle: "SMALL ROBOT. BIG CURIOSITY.",
    description:
      "An educational interpretation of the Pollen Robotics / Hugging Face biped featured in NVIDIA Isaac Lab learning workflows.",
    tasks: ["Turn head", "Nod", "Leg articulation"],
    parts: [
      part(
        "body",
        "Body shell",
        [0, 1.12, 0],
        [0.67, 0.57, 0.48],
        "A conceptual shell carries the electronics and hip mounts.",
      ),
      part(
        "neck",
        "Neck servo",
        [0, 1.5, 0],
        [0.2, 0.22, 0.2],
        "Rotates the head; shown with a limited educational motion.",
        { shape: "cylinder", color: "#94d849" },
      ),
      part(
        "head",
        "Head housing",
        [0, 1.78, 0.08],
        [0.72, 0.43, 0.5],
        "The head houses the conceptual perception modules.",
        { motion: "head", pivot: [0, 1.5, 0] },
      ),
      part(
        "beak",
        "Beak",
        [0, 1.66, 0.4],
        [0.38, 0.12, 0.3],
        "A simplified beak geometry; no grasping capability is simulated.",
        { color: "#a6e66a", motion: "head", pivot: [0, 1.5, 0] },
      ),
      ...([-1, 1] as const).flatMap((s) => [
        part(
          `eye-${s}`,
          "Camera eye",
          [s * 0.22, 1.84, 0.34],
          [0.15, 0.15, 0.15],
          "Conceptual camera placement, not a verified sensor specification.",
          {
            shape: "sphere",
            color: "#19231c",
            motion: "head",
            pivot: [0, 1.5, 0],
          },
        ),
        part(
          `hip-${s}`,
          "Hip actuator",
          [s * 0.3, 0.82, 0],
          [0.23, 0.23, 0.23],
          "A rotary actuator moves the upper leg.",
          { shape: "sphere", color: "#94d849" },
        ),
        part(
          `leg-${s}`,
          "Leg linkage",
          [s * 0.3, 0.55, 0],
          [0.18, 0.43, 0.2],
          "A simplified linkage demonstrates joint rotation; no walking policy runs here.",
          { motion: "leg", pivot: [s * 0.3, 0.82, 0] },
        ),
        part(
          `foot-${s}`,
          "Foot",
          [s * 0.3, 0.21, 0.13],
          [0.36, 0.14, 0.49],
          "A broad conceptual foot. Contact and balance are not simulated.",
          { color: "#414a42", motion: "leg", pivot: [s * 0.3, 0.82, 0] },
        ),
      ]),
      part(
        "controller",
        "Control board",
        [0, 1.16, 0.26],
        [0.26, 0.2, 0.025],
        "Coordinates sensor input and servo commands.",
        { color: "#8cc94b" },
      ),
    ],
  },
};
export const STAGES = [
  "Particle formation",
  "Technical wireframe",
  "Structural assembly",
  "Mechanical installation",
  "Material reveal",
  "Final presentation",
];
export function resolveRobot(prompt: string): RobotKind | null {
  const p = prompt.toLowerCase().trim();
  const matches: RobotKind[] = [];
  if (/\b(humanoid|human[ -]?like|bipedal humanoid)\b/.test(p))
    matches.push("humanoid");
  if (/\b(drone|quadcopter|quadrotor)\b/.test(p)) matches.push("drone");
  if (/\b(micro[ -]?duck)\b/.test(p)) matches.push("microduck");
  if (/\b(rover|submarine|robotic arm|quadruped)\b/.test(p)) return null;
  return matches.length === 1 ? matches[0] : null;
}
export function taskPose(kind: RobotKind, task: string, t: number) {
  const p = Math.max(0, Math.min(1, t / 3));
  const ease = p * p * (3 - 2 * p);
  return {
    arm:
      task === "Raise arm"
        ? -ease * 1.6
        : task === "Wave"
          ? -Math.sin(p * Math.PI) * 1.6
          : 0,
    wave:
      task === "Wave"
        ? Math.sin(p * Math.PI * 6) * 0.28 * Math.sin(p * Math.PI)
        : 0,
    head: task === "Turn head" ? Math.sin(p * Math.PI * 2) * 0.6 : 0,
    nod: task === "Nod" ? Math.sin(p * Math.PI * 2) * 0.25 : 0,
    leg: task === "Leg articulation" ? Math.sin(p * Math.PI * 2) * 0.35 : 0,
    lift:
      kind === "drone"
        ? task === "Land"
          ? 1 - ease
          : task === "Take off"
            ? ease
            : task === "Hover"
              ? 1 + Math.sin(p * Math.PI * 4) * 0.03
              : 0
        : 0,
    rotor: kind === "drone" && !!task ? t * 30 : 0,
  };
}
export function asRobotSpec(kind: RobotKind): RobotSpec {
  const r = ROBOTS[kind];
  const idFor = (id: string) => id.replace(/-(-1)/g, "-left");
  const pivots = new Set<string>();
  const joints: RobotSpec["joints"] = r.parts
    .filter((p) => {
      if (!p.motion || !p.pivot) return false;
      const key = `${p.motion}:${p.pivot.join(",")}`;
      if (pivots.has(key)) return false;
      pivots.add(key);
      return true;
    })
    .map((p) => ({
      id: `joint-${idFor(p.id)}`,
      component_id: idFor(p.id),
      type: "hinge",
      axis:
        p.motion === "arm"
          ? [0, 0, 1]
          : p.motion === "leg"
            ? [1, 0, 0]
            : [0, 1, 0],
      continuous: p.motion === "propeller",
      limits_rad: [-1.7, 1.7],
    }));
  return {
    id: `arise-${kind}`,
    name: r.name,
    purpose: r.description,
    classification: kind === "drone" ? "aerial" : "legged",
    provenance: "reference",
    dimensions_m: [2, 3, 2],
    components: r.parts.map((p) => ({
      id: idFor(p.id),
      name: p.name,
      kind:
        p.id.includes("controller") || p.id === "compute"
          ? "controller"
          : /camera|eye|visor/.test(p.id)
            ? "sensor"
            : /battery/.test(p.id)
              ? "power"
              : /motor|servo|actuator|shoulder|elbow|knee|hip|neck/.test(p.id)
                ? "actuator"
                : "structure",
      shape: p.shape || "box",
      size: p.size,
      position: p.position,
      rotation: p.rotation || [0, 0, 0],
      mass_kg: 0.1,
      depends_on: [],
      function: p.role,
      selection_reason: "Educational procedural template",
      alternatives: [],
      limitations: [
        "Illustrative dimensions and mass; not a hardware specification.",
      ],
    })),
    joints,
    degrees_of_freedom: joints.length,
    power_budget_w: 30,
    control_requirements: ["Separate low-level real-time motor control"],
    operating_environment: "Browser kinematic demonstration",
    intended_tasks: r.tasks,
    constraints: [
      "Concept geometry; dimensions, mass and power budget are illustrative. Joints describe only the demonstrated motion subset, not the full physical robot.",
    ],
    simulation_capabilities: ["Kinematic animation only"],
    unsupported_assumptions: [
      "No physics, balance, thrust or hardware validation",
    ],
  };
}
export const QUIZ = [
  {
    question: "Which component turns a controller command into movement?",
    choices: ["Actuator", "Camera", "Battery enclosure"],
    answer: 0,
    explanation:
      "An actuator converts energy into mechanical motion. A controller decides what motion to request.",
  },
  {
    question: "What does this browser demonstration prove?",
    choices: [
      "The robot is physically stable",
      "The programmed geometry can move",
      "The hardware is flight-ready",
    ],
    answer: 1,
    explanation:
      "Kinematic animation prescribes positions. Physical stability requires dynamics, contact and validated hardware.",
  },
  {
    question: "Where should time-critical motor safety run?",
    choices: [
      "In a remote language model",
      "In a browser tab",
      "On a dedicated local controller",
    ],
    answer: 2,
    explanation:
      "A local controller provides predictable timing and can enforce limits even if the network fails.",
  },
];
