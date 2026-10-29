"use client";
import { useEffect, useState } from "react";
import { useLab } from "../lib/store";
import { api, formatError } from "../lib/api";
export type Assessment = {
  concept_valid: boolean;
  physics_valid: boolean;
  adapter: string | null;
  simulation_executed: false;
  limitations: string[];
};
export function useAssessment() {
  const robot = useLab((s) => s.robot);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    setAssessment(null);
    setError("");
    if (robot)
      api<Assessment>("assess", robot)
        .then((a) => {
          if (alive) setAssessment(a);
        })
        .catch((e) => {
          if (alive) setError(formatError(e));
        });
    return () => {
      alive = false;
    };
  }, [robot]);
  return { assessment, error };
}
export function DesignEvidence() {
  const { robot, runs, renderedRobotId } = useLab();
  const { assessment, error } = useAssessment();
  if (!robot) return null;
  const mass = robot.components.reduce((n, c) => n + c.mass_kg, 0);
  const executed = runs.some(
    (r) =>
      r.robot_id === robot.id &&
      Math.abs((r.parameters?.design_mass_kg ?? -1) - mass) < 1e-6,
  );
  return (
    <section
      className="design-evidence"
      aria-label="Design verification stages"
    >
      <h3>What has actually been verified?</h3>
      <ol>
        <li>
          1 /{" "}
          {robot.provenance === "nebius"
            ? "AI-generated conceptual design"
            : "Curated reference design"}{" "}
          · schema validated
        </li>
        <li>
          2 /{" "}
          {renderedRobotId === robot.id
            ? "3D assembly rendered"
            : "3D rendering pending or unavailable"}
        </li>
        <li>
          3 /{" "}
          {assessment
            ? assessment.physics_valid
              ? "MuJoCo model compiled · " + assessment.adapter
              : "Conceptual-only for physics"
            : "Checking physics model…"}
        </li>
        <li>
          4 /{" "}
          {executed
            ? "Recorded solver experiment exists for these mass inputs"
            : "No simulation executed for these mass inputs"}
        </li>
      </ol>
      {assessment?.limitations.map((s, i) => (
        <p key={i}>{s}</p>
      ))}
      {error && <p>{error}</p>}
      {robot.engineering_reasoning && (
        <>
          <h4>Design reasoning</h4>
          <p>{robot.engineering_reasoning}</p>
        </>
      )}
      {robot.mobility && <p>Mobility: {robot.mobility}</p>}
      {robot.control_architecture && (
        <p>Control: {robot.control_architecture}</p>
      )}
      <h4>Proposed capabilities · not executed</h4>
      <ul>
        {(robot.capabilities?.length
          ? robot.capabilities
          : robot.intended_tasks
        ).map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
      <h4>Design constraints and limitations</h4>
      <ul>
        {[...robot.constraints, ...robot.unsupported_assumptions].map(
          (s, i) => (
            <li key={i}>{s}</li>
          ),
        )}
      </ul>
      <button
        className="button"
        onClick={() => useLab.getState().set({ section: "simulate" })}
      >
        Review simulation support
      </button>
      <p>
        Conceptual geometry and material choices are not rated hardware, safety
        certification, or proof of task completion.
      </p>
    </section>
  );
}
