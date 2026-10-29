"use client";
import { useState } from "react";
import { ArrowRight, RotateCcw, Check } from "lucide-react";
import { useLab } from "../lib/store";
import { api, formatError } from "../lib/api";
import type { SimulationRun } from "../lib/types";
import { Button } from "./ui/button";
export function ImprovementPanel({
  onError,
}: {
  onError: (s: string) => void;
}) {
  const {
    robot,
    task,
    hardwareId,
    runs,
    driveSpeed,
    changes,
    inspected,
    attempts,
    cards,
    set,
  } = useLab();
  const [componentId, setComponentId] = useState(
    robot?.components[0]?.id || "",
  );
  const [mass, setMass] = useState(robot?.components[0]?.mass_kg || 1);
  const [prediction, setPrediction] = useState("");
  const [busy, setBusy] = useState(false);
  if (!robot) return null;
  const selected =
    robot.components.find((c) => c.id === componentId) || robot.components[0];
  const apply = () => {
    if (!Number.isFinite(mass) || mass <= 0 || mass > 1000) return;
    const change = {
      id: crypto.randomUUID(),
      component_id: selected.id,
      before_kg: selected.mass_kg,
      after_kg: mass,
      at: new Date().toISOString(),
    };
    set({
      robot: {
        ...robot,
        components: robot.components.map((c) =>
          c.id === selected.id ? { ...c, mass_kg: mass } : c,
        ),
      },
      changes: [...changes.slice(-99), change],
      selected: selected.id,
      playing: false,
    });
  };
  const run = async () => {
    setBusy(true);
    try {
      const result = await api<SimulationRun>("simulate", {
        robot,
        task,
        hardware_id: hardwareId,
        duration_s: 6,
        wheel_speed_rad_s: driveSpeed,
      });
      set({
        runs: [
          ...runs.slice(-19),
          { ...result, prediction: prediction.trim() },
        ],
        playhead: 0,
        playing: false,
      });
    } catch (e) {
      onError(formatError(e));
    } finally {
      setBusy(false);
    }
  };
  const previous = runs.at(-2),
    latest = runs.at(-1);
  return (
    <>
      <div className="eyebrow">08 / THE NEXT ITERATION</div>
      <h2>
        Keep asking.
        <br />
        <em>Keep improving.</em>
      </h2>
      <p className="panel-intro">
        Change one supported input. Make a prediction. Keep the measured
        evidence.
      </p>
      <div className="evolution-controls">
        <label htmlFor="evolve-part">
          COMPONENT
          <select
            id="evolve-part"
            value={componentId}
            onChange={(e) => {
              setComponentId(e.target.value);
              setMass(
                robot.components.find((c) => c.id === e.target.value)!.mass_kg,
              );
            }}
          >
            {robot.components.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="evolve-mass">
          DESIGN MASS / KG
          <input
            id="evolve-mass"
            type="number"
            min={0.001}
            max={1000}
            step={0.1}
            value={mass}
            onChange={(e) => setMass(+e.target.value)}
          />
        </label>
        <Button
          variant="outline"
          disabled={
            !Number.isFinite(mass) ||
            mass <= 0 ||
            mass > 1000 ||
            mass === selected.mass_kg
          }
          onClick={apply}
        >
          Apply component revision <Check size={14} />
        </Button>
        <label htmlFor="drive-setpoint">
          WHEEL VELOCITY SETPOINT / {driveSpeed} RAD/S
          <input
            id="drive-setpoint"
            type="range"
            min={0}
            max={8}
            step={0.5}
            value={driveSpeed}
            onChange={(e) => set({ driveSpeed: +e.target.value })}
          />
        </label>
        <label htmlFor="prediction">
          PREDICT BEFORE YOU SIMULATE
          <textarea
            id="prediction"
            value={prediction}
            onChange={(e) => setPrediction(e.target.value)}
            placeholder="What will change, and why?"
            maxLength={1000}
          />
        </label>
        <Button
          disabled={busy || robot.classification !== "rover"}
          onClick={run}
        >
          {busy
            ? "Solving rigid-body dynamics…"
            : "Run revised physics experiment"}{" "}
          <RotateCcw size={14} />
        </Button>
      </div>
      <p className="fine muted">
        Only the flat-floor rover adapter supports this experiment. Design mass
        and wheel setpoint are simulation inputs, not validated physical
        hardware ratings. Sensor inference and arbitrary missions remain outside
        the adapter.
      </p>
      {latest && (
        <>
          <div className="eyebrow">BEFORE / AFTER — ACTUAL SOLVER OUTPUT</div>
          <div className="revision-comparison">
            {[previous, latest].map((r, i) => (
              <div key={i}>
                <span className="eyebrow">
                  {i === 0 ? "PREVIOUS RUN" : "LATEST RUN"}
                </span>
                <strong>
                  {r ? r.metrics.displacement_m.toFixed(2) + " m" : "—"}
                </strong>
                <small>
                  {r
                    ? `${r.metrics.simulated_seconds.toFixed(1)} s · ${r.parameters?.wheel_speed_rad_s ?? "legacy"} rad/s · ${r.parameters?.design_mass_kg?.toFixed(2) ?? "unrecorded"} kg total`
                    : "Run a baseline to compare."}
                </small>
              </div>
            ))}
          </div>
          {previous && (
            <p className="fine">
              Displacement changed by{" "}
              {(
                latest.metrics.displacement_m - previous.metrics.displacement_m
              ).toFixed(3)}{" "}
              m. Compare duration, input mass, wheel setpoint, and model
              assumptions before interpreting this as an improvement.
            </p>
          )}
          {latest.prediction && (
            <div className="notice">
              <span>
                Prediction recorded before this run: {latest.prediction}
                <br />
                Observed displacement:{" "}
                {latest.metrics.displacement_m.toFixed(3)} m. This comparison
                does not establish completion of “{task.description}”.
              </span>
            </div>
          )}
        </>
      )}
      <div className="eyebrow">ENGINEERING DECISIONS</div>
      <ol className="decision-list">
        {changes.length ? (
          changes.map((c) => (
            <li key={c.id}>
              {robot.components.find((p) => p.id === c.component_id)?.name ||
                c.component_id}
              <br />
              {c.before_kg.toFixed(2)} → {c.after_kg.toFixed(2)} kg
            </li>
          ))
        ) : (
          <li>
            No component revisions yet. Keep a baseline experiment before
            editing.
          </li>
        )}
      </ol>
      <div className="knowledge-summary">
        <div className="eyebrow">A MACHINE. A LITTLE MORE UNDERSTANDING.</div>
        <h3>{robot.name}</h3>
        <p>Mission: {task.description}</p>
        {latest && (
          <p>
            Latest experiment: {latest.metrics.displacement_m.toFixed(2)} m in{" "}
            {latest.metrics.simulated_seconds.toFixed(1)} s. Compute selection:{" "}
            {hardwareId}; inference latency unmeasured.
          </p>
        )}
        <p>
          {inspected.length} / {robot.components.length} components inspected.{" "}
          {runs.length} recorded experiments.
        </p>
        <p>
          {attempts.filter((a) => a.correct).length} / {attempts.length} quiz
          answers correct. {cards.filter((c) => c.mastered).length} concepts
          reviewed.
        </p>
        <p>
          Next: inspect the component with the greatest influence on your task.
          A bigger GPU does not fix a mechanical constraint.
        </p>
        <Button onClick={() => set({ section: "inspect" })}>
          Return to the robot <ArrowRight size={14} />
        </Button>
      </div>
    </>
  );
}
