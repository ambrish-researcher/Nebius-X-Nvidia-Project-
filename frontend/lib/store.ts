import { create } from "zustand";
import type {
  AssemblyStep,
  Project,
  RobotSpec,
  Section,
  Task,
  SimulationRun,
} from "./types";
export const initialTask: Task = {
  description: "Navigate a warehouse aisle",
  needs_vision: false,
  needs_manipulation: false,
  outdoor: false,
  memory_gb: 1,
  deadline_ms: 100,
  model: "Not specified",
  network_available: false,
};
type State = {
  robot: RobotSpec | null;
  assembly: AssemblyStep[];
  section: Section;
  entered: boolean;
  selected: string | null;
  exploded: boolean;
  transparent: boolean;
  isolate: boolean;
  annotations: boolean;
  replay: number;
  speed: number;
  camera: "orbit" | "front" | "top";
  task: Task;
  hardwareId: string;
  runs: SimulationRun[];
  playhead: number;
  playing: boolean;
  attempts: Project["quiz_attempts"];
  cards: Project["flashcard_progress"];
  set: (patch: Partial<State>) => void;
  setRobot: (robot: RobotSpec, assembly: AssemblyStep[]) => void;
  project: () => Project | null;
};
export const useLab = create<State>((set, get) => ({
  robot: null,
  assembly: [],
  section: "design",
  entered: false,
  selected: null,
  exploded: false,
  transparent: false,
  isolate: false,
  annotations: true,
  replay: 0,
  speed: 1,
  camera: "orbit",
  task: initialTask,
  hardwareId: "cpu",
  runs: [],
  playhead: 0,
  playing: false,
  attempts: [],
  cards: [],
  set,
  setRobot: (robot, assembly) =>
    set({
      robot,
      assembly,
      selected: null,
      exploded: false,
      isolate: false,
      runs: [],
      playhead: 0,
      playing: false,
      task: { ...initialTask, description: robot.intended_tasks[0] || "" },
      hardwareId: "cpu",
      attempts: [],
      cards: [],
    }),
  project: () => {
    const s = get();
    return s.robot
      ? {
          id: s.robot.id,
          robot: s.robot,
          task: s.task,
          hardware_id: s.hardwareId,
          simulation_runs: s.runs,
          quiz_attempts: s.attempts,
          flashcard_progress: s.cards,
        }
      : null;
  },
}));
export function assemblyOrder(steps: AssemblyStep[], id: string) {
  return steps.findIndex((s) => s.component_ids.includes(id));
}
