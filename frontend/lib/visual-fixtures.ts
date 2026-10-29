import type { RobotSpec } from "./types";
export function visualFixture(body: unknown) {
  const b = body as { workflow: string; robot: RobotSpec; prompt: string };
  let context: any = {};
  try {
    context = JSON.parse(b.prompt);
  } catch {}
  const robot = b.robot,
    part =
      robot.components.find((c) => c.id === context.component_id) ||
      robot.components[0],
    sensor = robot.components.find((c) => c.kind === "sensor") || part;
  let data: unknown;
  if (b.workflow === "quiz")
    data = {
      questions: [
        {
          question: `Which component of ${robot.name} has this role: ${sensor.function}`,
          choices: [
            sensor.name,
            ...robot.components
              .filter((c) => c.id !== sensor.id)
              .slice(0, 3)
              .map((c) => c.name),
            "No environmental sensor",
            "A data-center rack",
            "Only the task text",
          ].slice(0, 4),
          correct_index: 0,
          explanation: `${sensor.name}: ${sensor.function} Sensor inputs still need calibration and processing.`,
        },
        {
          question:
            "Does a basic wheel-speed controller necessarily need a GPU?",
          choices: [
            "No; a CPU or microcontroller may be sufficient.",
            "Always use a data-center rack.",
            "Every controller requires CUDA.",
            "Memory size alone proves latency.",
          ],
          correct_index: 0,
          explanation:
            "A simple control loop and a vision model have different workloads. Measure the target pipeline before asserting a deadline.",
        },
        {
          question: "What does the flat-floor MuJoCo experiment establish?",
          choices: [
            "Motion in the modeled rigid-body experiment.",
            "Successful warehouse navigation.",
            "Measured NVIDIA inference latency.",
            "A certified physical payload.",
          ],
          correct_index: 0,
          explanation:
            "The experiment measures simulated motion, joints, and contacts. It does not execute an arbitrary mission or benchmark selected hardware.",
        },
      ],
    };
  else if (b.workflow === "flashcards")
    data = {
      cards: robot.components.slice(0, 4).map((c) => ({
        id: `fixture-${c.id}`,
        front: c.name,
        back: `${c.function} Selected because: ${c.selection_reason}`,
      })),
    };
  else if (b.workflow === "task")
    data = {
      description: b.prompt,
      needs_vision: /camera|vision|recogn/i.test(b.prompt),
      needs_manipulation: /pick|grip|sort/i.test(b.prompt),
      outdoor: /outdoor|terrain/i.test(b.prompt),
      memory_gb: 1,
      deadline_ms: 100,
      model: "Visual fixture assumption",
      network_available: false,
    };
  else if (b.workflow === "analysis" && context.experiment?.metrics)
    data = {
      answer: `VISUAL FIXTURE — deterministic reading of actual experiment data. Recorded displacement: ${context.experiment.metrics.displacement_m.toFixed(3)} m over ${context.experiment.metrics.simulated_seconds.toFixed(1)} simulated seconds. This is a rigid-body experiment, not proof of task completion or GPU performance.`,
      limitations: context.experiment.limitations || [],
    };
  else if (
    b.workflow === "recommendation" &&
    context.deterministic_recommendation
  )
    data = {
      answer:
        "VISUAL FIXTURE — " + context.deterministic_recommendation.reasoning,
      limitations: context.deterministic_recommendation.assumptions,
    };
  else
    data = {
      answer: `VISUAL FIXTURE — no model inference. ${robot.name}: ${robot.purpose}\n\n${part.name}: ${part.function}\n\n${robot.unsupported_assumptions.join(" ")}`,
      limitations: [
        "Deterministic visual-development fixture. Not a NVIDIA model response.",
      ],
    };
  return { data, cached: false, model: "visual-fixture", fixture: true };
}
