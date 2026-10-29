export type Vec3 = [number, number, number];
export interface ComponentSpec {
  id: string;
  name: string;
  kind:
    "structure" | "actuator" | "sensor" | "power" | "compute" | "controller";
  shape: "box" | "cylinder" | "sphere";
  size: Vec3;
  position: Vec3;
  rotation: Vec3;
  mass_kg: number;
  depends_on: string[];
  function: string;
  selection_reason: string;
  alternatives: string[];
  limitations: string[];
}
export interface RobotSpec {
  id: string;
  name: string;
  purpose: string;
  classification: string;
  provenance: "reference" | "nebius";
  dimensions_m: Vec3;
  components: ComponentSpec[];
  joints: { id: string; component_id: string; type: string; axis: Vec3 }[];
  degrees_of_freedom: number;
  power_budget_w: number;
  control_requirements: string[];
  operating_environment: string;
  intended_tasks: string[];
  constraints: string[];
  simulation_capabilities: string[];
  unsupported_assumptions: string[];
}
export interface AssemblyStep {
  index: number;
  name: string;
  component_ids: string[];
}
export interface Task {
  description: string;
  needs_vision: boolean;
  needs_manipulation: boolean;
  outdoor: boolean;
  memory_gb: number;
  deadline_ms: number;
  model: string;
  network_available: boolean;
}
export interface Hardware {
  id: string;
  name: string;
  family: string;
  category: string;
  memory_gb: number;
  power_w: number;
  availability: string;
  software: string;
  source: string;
  verified: boolean;
  note: string;
  compatible: boolean;
  reasons: string[];
  latency: string;
  deadline_verified: boolean;
  cost: string;
}
export interface Recommendation {
  recommended_id: string | null;
  candidates: Hardware[];
  feasibility_issues: string[];
  reasoning: string;
  assumptions: string[];
  simulation_scope: string;
}
export interface Frame {
  t: number;
  position: Vec3;
  quaternion: [number, number, number, number];
  joints: number[];
  velocity: number[];
  controller_output: number[];
  contacts: number;
}
export interface SimulationRun {
  id: string;
  robot_id: string;
  engine: string;
  experiment: string;
  frames: Frame[];
  hardware_id: string;
  hardware_benchmarked: boolean;
  metrics: {
    simulated_seconds: number;
    wall_seconds: number;
    displacement_m: number;
    max_contact_count: number;
    max_tilt_rad: number;
    steps: number;
  };
  outcome: string;
  task_completed: null;
  limitations: string[];
}
export interface Question {
  question: string;
  choices: string[];
  correct_index: number;
  explanation: string;
}
export interface Card {
  id: string;
  front: string;
  back: string;
}
export interface Project {
  id: string;
  robot: RobotSpec;
  task: Task;
  hardware_id: string;
  simulation_runs: SimulationRun[];
  quiz_attempts: {
    question: string;
    selected_index: number;
    correct: boolean;
  }[];
  flashcard_progress: { card_id: string; mastered: boolean }[];
}
export type Section =
  | "design"
  | "inspect"
  | "challenge"
  | "compute"
  | "simulate"
  | "learn"
  | "history";
