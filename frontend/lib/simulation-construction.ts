import { STAGE_NOTES } from "./simulation-stage-notes";
import {
  EXPERIENCES,
  type ExperienceId,
  type LessonStep,
} from "./simulation-lessons";

export type ConstructionStage = LessonStep & {
  id: string;
  parts: string[];
  shot: number;
  seconds: number;
  concept?: boolean;
  working?: boolean;
};

// Every introduced assembly keeps its permanent model anchor. Inspection never
// rewinds this sequence, and the working example never removes attached parts.
function stage(
  kind: ExperienceId,
  lesson: number,
  id: string,
  title: string,
  parts: string[],
  see: string,
  extra: Partial<ConstructionStage> = {},
): ConstructionStage {
  return {
    ...EXPERIENCES[kind].steps[lesson],
    id,
    title,
    parts,
    see,
    shot: lesson,
    seconds: 4.25,
    caption: extra.concept
      ? "A general semiconductor concept, separate from the module assembly that follows."
      : "Attaching components at their final positions. Earlier assemblies stay connected.",
    ...(kind === "microduck" && lesson === 1
      ? {
          why: "The structure must support its connected parts while leaving room for joint movement, wiring and access to the electronics.",
        }
      : {}),
    ...extra,
    ...STAGE_NOTES[kind]?.[id],
  };
}
function empty(kind: ExperienceId, shot = 0) {
  return stage(
    kind,
    shot,
    "empty",
    "An empty stage",
    [],
    "Construction starts here with no equipment on the stage. Named components will attach in order, and the explanation will follow each new assembly.",
    {
      focus: "",
      seconds: 0.7,
      caption: "Construction begins automatically when the 3D stage is ready.",
      how: "Each component has a fixed attachment point. Once introduced, it stays connected while the rest of the system is built.",
      why: "Starting with the support structure makes it easier to understand what holds each part and how the parts connect.",
      terms: [["Assembly", "Connected parts that form a larger working unit."]],
    },
  );
}
const trays = (first: number) =>
  Array.from({ length: 6 }, (_, i) => `tray-${first + i}`);

export const CONSTRUCTION: Record<ExperienceId, ConstructionStage[]> = {
  rubin: [
    empty("rubin"),
    stage(
      "rubin",
      1,
      "foundation",
      "Rack foundation",
      ["foundation"],
      "The rack's base attaches first. It supports the cabinet and provides the reference for every tray and service that follows.",
      {
        focus: "foundation",
        shot: 0,
        how: "The base carries the weight of the cabinet. Uprights will connect to its corners, and tray rails will connect the equipment to those uprights.",
        why: "Computing equipment needs stable physical support as well as electrical connections. Building the base first establishes where every later assembly belongs.",
      },
    ),
    stage(
      "rubin",
      1,
      "rack",
      "Uprights, rails and frame",
      ["rack"],
      "Four uprights, mounting rails and the top cross-member attach to the base. They establish the cabinet's permanent shape. This is an educational rack schematic, not a private internal layout.",
      {
        focus: "rack",
        shot: 0,
        how: "Uprights carry loads down to the base. Cross-members keep the frame aligned; rails provide repeatable mounting points for the trays.",
      },
    ),
    ...[0, 6, 12].map((first, bank) =>
      stage(
        "rubin",
        1,
        `trays-${bank}`,
        ["Lower compute trays", "Middle compute trays", "Upper compute trays"][
          bank
        ],
        ["tray", ...trays(first)],
        `Compute trays ${first + 1}–${first + 6} attach to the rack rails. A tray is a removable shelf for electronics. Earlier trays remain seated; together the three banks hold 18 compute trays.`,
        { focus: `tray-${first + 5}`, shot: 0 },
      ),
    ),
    stage(
      "rubin",
      2,
      "cpu",
      "Vera CPU assemblies",
      ["cpu"],
      "Thirty-six CPU markers attach to the compute trays, two per tray in this schematic. CPUs coordinate software and prepare work for the GPUs. Their drawn positions are illustrative.",
      { focus: "cpu" },
    ),
    stage(
      "rubin",
      2,
      "gpu",
      "Rubin GPU assemblies",
      ["gpu"],
      "Seventy-two GPU markers attach beside the CPUs, four per tray. GPUs apply similar calculations to many numbers at once. These package markers explain the published system count, not its private board design.",
      { focus: "gpu" },
    ),
    stage(
      "rubin",
      3,
      "memory",
      "Working memory",
      ["memory"],
      "Memory markers attach beside the processors. They represent the nearby working storage that supplies inputs and holds intermediate results; the marker arrangement is conceptual.",
      { focus: "memory" },
    ),
    stage(
      "rubin",
      4,
      "network",
      "NVLink and network connections",
      ["network"],
      "Switch assemblies and network equipment attach to the growing rack. NVLink is the processor connection fabric within the system; networking carries information between systems.",
      { focus: "network" },
    ),
    stage(
      "rubin",
      5,
      "power",
      "Power shelves and distribution",
      ["power", "power-bar"],
      "Power shelves and the distribution bar attach to the rack. They turn the electrical supply into usable power and carry it to the electronics.",
      { focus: "power" },
    ),
    stage(
      "rubin",
      6,
      "cooling",
      "Liquid cooling loop",
      ["cooling", "cooling-path"],
      "The manifolds, branches and cold plates complete the assembled rack. A manifold distributes liquid; cold plates transfer heat from electronics into that liquid. The route is an educational schematic.",
      { focus: "cooling" },
    ),
    stage(
      "rubin",
      7,
      "working",
      "Working example: a compute request",
      ["flow"],
      "The complete rack stays assembled. Bright markers trace a request entering the system, CPU coordination, GPU work with nearby memory, and a returned result. The connection paths illustrate cooperation rather than measured traffic.",
      {
        working: true,
        focus: "flow",
        seconds: Infinity,
        caption:
          "Construction complete. The compute and data-flow example is running.",
      },
    ),
  ],
  thor: [
    empty("thor"),
    stage(
      "thor",
      0,
      "wafer",
      "Concept: a silicon wafer",
      ["wafer", "fabrication-0"],
      "A wafer is a thin slice of silicon, a material whose electrical behavior can be controlled. Repeated rectangles represent dies: regions that can become individual chips. The adjacent slab magnifies a tiny part of the wafer.",
      { concept: true, focus: "wafer", seconds: 5 },
    ),
    stage(
      "thor",
      0,
      "devices",
      "Concept: devices and insulation",
      ["fabrication-1", "fabrication-2"],
      "Device and insulating layers appear on the magnified silicon sample. Devices control current; insulation separates electrical paths. Real fabrication repeats many specialized operations. This simplified illustration is not NVIDIA's manufacturing process.",
      { concept: true, focus: "fabrication-1", seconds: 5 },
    ),
    stage(
      "thor",
      0,
      "metal",
      "Concept: metal connections",
      ["fabrication-3"],
      "A connected metal layer completes the teaching sample without lifting its existing layers. Metal paths join tiny devices into circuits. The drawn layers and dimensions are conceptual, not a T5000 mask design.",
      { concept: true, focus: "fabrication-3", seconds: 5 },
    ),
    stage(
      "thor",
      1,
      "transistor",
      "Concept: a transistor switch",
      ["transistor"],
      EXPERIENCES.thor.steps[1].see,
      { concept: true, seconds: 5 },
    ),
    stage(
      "thor",
      2,
      "logic",
      "Concept: switches become logic",
      ["logic"],
      EXPERIENCES.thor.steps[2].see,
      { concept: true, seconds: 5 },
    ),
    stage(
      "thor",
      3,
      "module",
      "T5000 view: module circuit board",
      ["module", "board-traces"],
      "The conceptual lessons are finished. We now start a separate educational module assembly with its circuit board. Printed paths and mounting points connect and support the components that will attach next. This is not a rendering of a private NVIDIA board layout.",
      { focus: "module" },
    ),
    stage(
      "thor",
      3,
      "silicon",
      "Processor package substrate",
      ["silicon"],
      "The processor package attaches to the board. A package protects a chip and connects its very small electrical contacts to the surrounding circuit. Its visible layers are illustrative.",
      {
        focus: "silicon",
        how: "The package substrate is an intermediate support and connection layer between silicon and the module board. The next two stages show CPU and GPU roles inside a transparent teaching view.",
      },
    ),
    stage(
      "thor",
      4,
      "cpu",
      "CPU resources",
      ["cpu"],
      "Fourteen logical CPU-core markers attach inside the conceptual package. These represent the documented core count and the CPU's coordination role. They do not reproduce the private arrangement of CPU cores.",
      { focus: "cpu" },
    ),
    stage(
      "thor",
      5,
      "gpu",
      "Blackwell GPU resources",
      ["gpu"],
      "Parallel work groups attach beside the CPU diagram. The GPU performs many suitable calculations together, including supported AI operations. The number and placement of the drawn tiles are conceptual.",
      { focus: "gpu" },
    ),
    stage(
      "thor",
      6,
      "memory",
      "LPDDR5X working memory",
      ["memory"],
      "Memory packages attach around the processor. T5000's documented 128 GB of LPDDR5X memory holds inputs, model parameters and working results. The package locations here are illustrative.",
      { focus: "memory" },
    ),
    stage(
      "thor",
      3,
      "power",
      "Power regulation",
      ["power"],
      "Power components attach along the board edge. Regulation keeps the electrical supply suitable for sensitive computing parts; different circuits need controlled supplies.",
      {
        focus: "power",
        how: "Regulators convert and stabilize power before it reaches the processor and memory. The circuit shown explains the role, not a private power design.",
      },
    ),
    stage(
      "thor",
      3,
      "connectors",
      "Module connectors",
      ["power-pins"],
      "Edge contacts complete the module's external connections. A carrier board connects a module to power, sensors, storage and other devices. Contact count and placement here are schematic.",
      { focus: "power-pins" },
    ),
    stage(
      "thor",
      3,
      "cover",
      "Package cover",
      ["package-lid"],
      "The cover attaches in its seated position. An educational cutaway leaves the CPU and GPU diagrams visible. The opening is illustrative; nothing is lifted out of the module.",
      { focus: "package-lid" },
    ),
    stage(
      "thor",
      7,
      "working",
      "Working example: sensor to AI",
      ["flow"],
      EXPERIENCES.thor.steps[7].see,
      {
        working: true,
        focus: "flow",
        seconds: Infinity,
        caption:
          "Construction complete. Sensor input, CPU preparation, GPU work and output are running.",
      },
    ),
  ],
  microduck: [
    empty("microduck"),
    stage(
      "microduck",
      1,
      "frame",
      "Mechanical frame",
      ["frame"],
      "The original structural frame attaches first. Its cross-members and supports will hold the body, electronics and joints. The mechanical design is an educational interpretation.",
      { focus: "frame", shot: 0 },
    ),
    stage(
      "microduck",
      2,
      "motor",
      "Pelvis and hip mounting",
      ["motor"],
      "The pelvis attaches below the body frame. It links the left and right hip mounting points and transfers loads into the structure.",
      { focus: "motor", shot: 0 },
    ),
    stage(
      "microduck",
      2,
      "left-leg",
      "Left leg, joints and foot",
      ["leg--1"],
      "The left leg chain attaches at its hip. Connected hip, knee and ankle joints position a foot on the stage. A motor turns a joint, changing the angle between linked parts.",
      { focus: "leg--1", shot: 0 },
    ),
    stage(
      "microduck",
      2,
      "right-leg",
      "Right leg, joints and foot",
      ["leg-1"],
      "The right leg attaches to the other hip. Both feet now contact the floor. The legs stay still during construction; joint motion begins only in the completed walking example.",
      { focus: "leg-1", shot: 0 },
    ),
    stage(
      "microduck",
      1,
      "battery",
      "Battery and power",
      ["battery"],
      "The battery attaches inside the frame. It supplies electrical energy to both the computer and the motors. Its shape, wiring and internal mounting position are illustrative.",
      {
        focus: "battery",
        shot: 0,
        how: "A battery stores chemical energy and supplies electrical current. Power wiring connects it to the controller and motor electronics; the detailed wiring shown is illustrative.",
        why: "The computer needs electrical power to process information, and motors need it to move joints. A shared energy source lets the robot operate without a fixed power cable.",
        terms: [
          ["Current", "The flow of electrical charge through a circuit."],
          [
            "Battery",
            "A device that stores energy and supplies electrical power.",
          ],
        ],
      },
    ),
    stage(
      "microduck",
      4,
      "processor",
      "Rockchip RK3566 controller board",
      ["processor"],
      "The controller board attaches to the frame. Microduck's onboard computer uses Rockchip hardware; neither Jetson Thor nor Vera Rubin is inside this robot. The board position and detailed layout shown are conceptual.",
      { focus: "processor" },
    ),
    stage(
      "microduck",
      1,
      "head",
      "Neck, head and beak",
      ["head"],
      "The neck mechanism and original head attach above the body frame. Their connected joints support sensing and physical interaction. This model is an original mechanical interpretation.",
      {
        focus: "head",
        shot: 0,
        how: "The neck joints connect the head to the frame. Rotating a connected joint changes the head's orientation while keeping its attachments together. A separate beak joint illustrates another moving link.",
        why: "The head provides a mounting structure for sensors. Its location and orientation affect the direction in which those sensors observe the world.",
      },
    ),
    stage(
      "microduck",
      3,
      "sensor",
      "Camera and depth sensors",
      ["sensor"],
      "The front camera and depth sensor attach to the head. A camera measures images; a time-of-flight sensor estimates distance from the travel time of light. The visible mounting positions are illustrative.",
      { focus: "sensor", shot: 0 },
    ),
    stage(
      "microduck",
      3,
      "imu",
      "Body and head motion sensing",
      ["imu"],
      "Two IMU markers attach to the body and head. An inertial measurement unit senses motion and rotation, helping software estimate orientation. The internal locations are illustrative.",
      { focus: "imu", shot: 0 },
    ),
    stage(
      "microduck",
      1,
      "body",
      "Protective body covers",
      ["body"],
      "The body covers finish the assembled robot. The covers protect electronics and stay attached. During inspection they can become transparent to reveal the controller inside.",
      { focus: "body", shot: 0 },
    ),
    stage(
      "microduck",
      6,
      "working",
      "Working example: sense, control and walk",
      [],
      "The completed robot now walks in place. Bright paths connect sensors to the RK3566 controller, motor commands to the joints, and feedback to sensing. Ground markers identify planted feet while the opposite foot swings. This is an illustrative control loop and kinematic gait, not a force simulation or a live robot policy.",
      {
        focus: "walk",
        shot: 7,
        working: true,
        seconds: Infinity,
        caption:
          "Construction complete. The sensor, controller, motor and walking example is running.",
        how: "Sensors supply observations to the controller, which chooses motor targets. In this illustration, inverse kinematics means calculating joint angles for a chosen foot position. One foot stays planted while the other lifts, then their roles swap. Feedback means measuring the result before choosing another command.",
        terms: [
          [
            "Control loop",
            "Repeatedly measure, choose an action and check its result.",
          ],
          [
            "Inverse kinematics",
            "Calculating joint angles that place a foot at a chosen position.",
          ],
          [
            "Support foot",
            "A foot that is planted on the ground during a step.",
          ],
        ],
      },
    ),
  ],
};

export function constructionAt(kind: ExperienceId, seconds: number) {
  let end = 0;
  const stages = CONSTRUCTION[kind];
  for (let i = 0; i < stages.length; i++) {
    end += stages[i].seconds;
    if (seconds < end) return i;
  }
  return stages.length - 1;
}
export function constructionPartStage(kind: ExperienceId, id: string) {
  return CONSTRUCTION[kind].findIndex((s) => s.parts.includes(id));
}
export function constructionPartVisible(
  kind: ExperienceId,
  id: string,
  stageIndex: number,
) {
  const introduced = constructionPartStage(kind, id);
  return introduced >= 0 && introduced <= stageIndex;
}

export function constructionPartStart(kind: ExperienceId, id: string) {
  const index = constructionPartStage(kind, id);
  if (index < 0) return 0;
  const start = CONSTRUCTION[kind]
    .slice(0, index)
    .reduce((sum, stage) => sum + stage.seconds, 0);
  return start + (id.startsWith("tray-") ? (Number(id.slice(5)) % 6) * 0.1 : 0);
}
