"use client";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
  Plus,
  BookOpen,
  RefreshCw,
  Download,
  Cloud,
  Eye,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { useLab } from "../lib/store";
import { api, formatError } from "../lib/api";
import { HardwareAtlas } from "./hardware-atlas";
import { ImprovementPanel } from "./improvement-panel";
import { DesignEvidence, useAssessment } from "./design-evidence";
import { Button } from "./ui/button";
import type {
  Recommendation,
  SimulationRun,
  Task,
  Question,
  Card,
  Project,
} from "../lib/types";

type Props = { onError: (s: string) => void };
export function PanelContent({ onError }: Props) {
  const section = useLab((s) => s.section);
  return section === "design" ? (
    <Design />
  ) : section === "inspect" ? (
    <Inspect />
  ) : section === "challenge" ? (
    <Challenge onError={onError} />
  ) : section === "compute" ? (
    <Compute onError={onError} />
  ) : section === "simulate" ? (
    <Simulate onError={onError} />
  ) : section === "learn" ? (
    <Learn onError={onError} />
  ) : section === "improve" ? (
    <ImprovementPanel onError={onError} />
  ) : (
    <History onError={onError} />
  );
}
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="notice">
      <Lightbulb size={14} />
      <span>{children}</span>
    </div>
  );
}
function Design() {
  const { robot, assembly, set } = useLab();
  if (!robot) return null;
  return (
    <>
      <Eyebrow>01 / ENGINEERING BRIEF</Eyebrow>
      <h2>
        Anatomy of
        <br />
        <em>an idea.</em>
      </h2>
      <p className="panel-intro">{robot.purpose}</p>
      <div className="provenance">
        {robot.provenance === "reference"
          ? "CURATED REFERENCE · NOT AI-GENERATED"
          : "NVIDIA MODEL · VALIDATED SCHEMA"}
      </div>
      <DesignEvidence />
      <div className="stat-grid">
        <div>
          <strong>{robot.components.length.toString().padStart(2, "0")}</strong>
          <span>COMPONENTS</span>
        </div>
        <div>
          <strong>
            {robot.degrees_of_freedom.toString().padStart(2, "0")}
          </strong>
          <span>DEGREES OF FREEDOM</span>
        </div>
      </div>
      <div className="spec-rows">
        <div>
          <span>Configuration</span>
          <b>{robot.classification}</b>
        </div>
        <div>
          <span>Envelope</span>
          <b>{robot.dimensions_m.map((n) => n.toFixed(2)).join(" × ")} m</b>
        </div>
        <div>
          <span>Compute budget</span>
          <b>{robot.power_budget_w} W</b>
        </div>
        <div>
          <span>Environment</span>
          <b>{robot.operating_environment}</b>
        </div>
      </div>
      <Eyebrow>DEPENDENCY-DRIVEN ASSEMBLY</Eyebrow>
      <ol className="assembly-list">
        {assembly.map((s) => (
          <li key={s.index}>
            <span>{String(s.index + 1).padStart(2, "0")}</span>
            <p>{s.name}</p>
            <Check size={12} />
          </li>
        ))}
      </ol>
      <Notice>
        Conceptual engineering model. Dimensions, masses, and component choices
        require physical validation.
      </Notice>
      <Button onClick={() => set({ section: "inspect" })}>
        Explore the components <ArrowRight size={16} />
      </Button>
    </>
  );
}
function Inspect() {
  const { robot, selected, set } = useLab();
  const [level, setLevel] = useState("intermediate");
  if (!robot) return null;
  const part = robot.components.find((c) => c.id === selected);
  return (
    <>
      <Eyebrow>02 / COMPONENT EXPLORER</Eyebrow>
      <h2>
        Every part.
        <br />
        <em>A purpose.</em>
      </h2>
      <p className="panel-intro">
        Select a component in the lab. Follow the connections that make the
        machine.
      </p>
      <div className="component-grid">
        {robot.components.map((c) => (
          <button
            key={c.id}
            className={`component-choice ${selected === c.id ? "active" : ""}`}
            onClick={() => useLab.getState().inspect(c.id)}
          >
            <span className={`kind-dot ${c.kind}`} />
            <span>{c.name}</span>
            <ChevronRight size={12} />
          </button>
        ))}
      </div>
      {part && (
        <div className="inspection" key={part.id}>
          <Eyebrow>
            {part.kind.toUpperCase()} / {part.id}
          </Eyebrow>
          <h3>{part.name}</h3>
          <div className="segmented">
            {["beginner", "intermediate", "advanced"].map((l) => (
              <button
                key={l}
                className={l === level ? "active" : ""}
                onClick={() => setLevel(l)}
              >
                {l}
              </button>
            ))}
          </div>
          <p>{part.function}</p>
          {part.appearance && (
            <p>
              Conceptual material: {part.appearance.material}. Appearance is
              illustrative; no physical rating is established.
            </p>
          )}
          {level !== "beginner" && (
            <>
              <h4>WHY THIS COMPONENT</h4>
              <p>{part.selection_reason}</p>
              <div className="spec-rows">
                <div>
                  <span>Mass (design input)</span>
                  <b>{part.mass_kg} kg</b>
                </div>
                <div>
                  <span>Geometry</span>
                  <b>{part.shape}</b>
                </div>
              </div>
            </>
          )}
          {level === "advanced" && (
            <>
              <h4>MECHANICAL RELATIONSHIPS</h4>
              <p>
                {part.depends_on.length
                  ? `Mounted after ${part.depends_on.join(", ")}.`
                  : "Root structure: assembly starts here."}{" "}
                {robot.joints
                  .filter((j) => j.component_id === part.id)
                  .map(
                    (j) =>
                      `${j.type} joint; local axis ${j.axis.join(", ")}; ${j.continuous ? "continuous" : `bounds ${j.limits_rad?.join(" to ") || "unspecified"}`}; drive limits ${j.force_limit_nm ?? "unspecified"} N·m, ${j.velocity_limit_rad_s ?? "unspecified"} rad/s.`,
                  )
                  .join(" ")}
              </p>
              <h4>ALTERNATIVES & LIMITS</h4>
              {[...part.alternatives, ...part.limitations].map((x, i) => (
                <p className="fine" key={i}>
                  {x}
                </p>
              ))}
            </>
          )}
          <Button variant="outline" onClick={() => set({ section: "learn" })}>
            Ask about this component <ArrowUpRight size={14} />
          </Button>
        </div>
      )}
      {!part && (
        <Notice>
          Click a part to focus the camera. Use isolation and exploded view to
          see inside.
        </Notice>
      )}
    </>
  );
}
function Challenge({ onError }: Props) {
  const { task, robot, visualPreview, set } = useLab();
  const [busy, setBusy] = useState(false);
  if (!robot) return null;
  const update = (patch: Partial<Task>) => set({ task: { ...task, ...patch } });
  const interpret = async () => {
    setBusy(true);
    try {
      const r = await api<{ data: Task }>("ai", {
        workflow: "task",
        robot,
        prompt: task.description,
        level: "intermediate",
      });
      set({ task: r.data });
    } catch (e) {
      onError(formatError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Eyebrow>03 / MISSION CONTROL</Eyebrow>
      <h2>
        Give your robot
        <br />
        <em>a reason.</em>
      </h2>
      <p className="panel-intro">
        What should your robot accomplish? Define the task, then make the
        engineering trade-offs.
      </p>
      <label className="field-label" htmlFor="task">
        YOUR MISSION
      </label>
      <textarea
        id="task"
        value={task.description}
        onChange={(e) => update({ description: e.target.value })}
        maxLength={4000}
      />
      <Button
        variant="outline"
        disabled={busy || task.description.length < 3}
        onClick={interpret}
      >
        {busy ? <Loader2 className="spin" size={14} /> : <Plus size={14} />}{" "}
        {visualPreview ? "Interpret visual fixture" : "Interpret with NVIDIA"}
      </Button>
      <p className="fine muted">
        Or set workload assumptions below. They are design inputs, not
        measurements.
      </p>
      <div className="toggle-list">
        {(
          [
            ["needs_vision", "Camera-based perception"],
            ["needs_manipulation", "Object manipulation"],
            ["outdoor", "Outdoor operation"],
            ["network_available", "Network available"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            <span>{label}</span>
            <input
              type="checkbox"
              checked={task[key]}
              onChange={(e) => update({ [key]: e.target.checked })}
            />
          </label>
        ))}
      </div>
      <label className="field-label" htmlFor="model">
        AI MODEL / PIPELINE
      </label>
      <input
        id="model"
        value={task.model}
        maxLength={200}
        onChange={(e) => update({ model: e.target.value })}
      />
      <div className="input-pair">
        <label>
          Memory budget (GB)
          <input
            aria-label="Memory budget (GB)"
            type="number"
            min={0.001}
            max={10000}
            step={0.1}
            value={task.memory_gb}
            onChange={(e) =>
              update({ memory_gb: Number(e.target.value) || 0.001 })
            }
          />
        </label>
        <label>
          Deadline (ms)
          <input
            aria-label="Deadline (ms)"
            type="number"
            min={1}
            max={100000}
            value={task.deadline_ms}
            onChange={(e) =>
              update({ deadline_ms: Number(e.target.value) || 1 })
            }
          />
        </label>
      </div>
      <Button
        disabled={task.description.length < 3}
        onClick={() => set({ section: "compute" })}
      >
        Analyze compute requirements <ArrowRight size={16} />
      </Button>
    </>
  );
}
function Compute({ onError }: Props) {
  const { robot, task, hardwareId, visualPreview, set } = useLab();
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [busy, setBusy] = useState(false);
  const [compare, setCompare] = useState<string[]>(["cpu", "orin-nano"]);
  const [explanation, setExplanation] = useState("");
  useEffect(() => {
    let alive = true;
    if (robot)
      api<Recommendation>("recommend", { robot, task })
        .then((r) => {
          if (alive) setRec(r);
        })
        .catch((e) => {
          if (alive) onError(formatError(e));
        });
    return () => {
      alive = false;
    };
  }, [robot, task, onError]);
  const explain = async () => {
    setBusy(true);
    try {
      const r = await api<{ data: { answer: string } }>("ai", {
        workflow: "recommendation",
        robot,
        prompt: JSON.stringify({ task, deterministic_recommendation: rec }),
        level: "intermediate",
      });
      setExplanation(r.data.answer);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Eyebrow>04 / COMPUTE INTELLIGENCE</Eyebrow>
      <h2>
        The right brain.
        <br />
        <em>For the job.</em>
      </h2>
      <p className="panel-intro">
        Computing is an engineering decision. Start with the workload, not the
        biggest GPU.
      </p>
      <HardwareAtlas />
      <div className="data-flow">
        <span>SENSE</span>
        <ChevronRight size={10} />
        <span>PERCEIVE</span>
        <ChevronRight size={10} />
        <span>PLAN</span>
        <ChevronRight size={10} />
        <span>ACT</span>
      </div>
      {!rec && <p className="muted">Checking memory and power envelopes…</p>}
      {rec && (
        <>
          <Notice>{rec.reasoning}</Notice>
          {rec.feasibility_issues.map((issue, i) => (
            <div className="warning" key={i}>
              {issue}
            </div>
          ))}
          <div className="hardware-list">
            {rec.candidates.map((h) => (
              <div
                key={h.id}
                className={`hardware-card ${h.id === hardwareId ? "selected" : ""}`}
              >
                <button
                  className="hardware-select"
                  disabled={!h.compatible}
                  onClick={() =>
                    set({
                      hardwareId: h.id,
                      selected:
                        robot?.components.find((c) => c.kind === "compute")
                          ?.id || null,
                    })
                  }
                >
                  <span className="hardware-icon">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span className="hardware-name">
                    <small>{h.family}</small>
                    <b>{h.name}</b>
                    <span>
                      {h.memory_gb} GB <i /> {h.power_w} W envelope
                    </span>
                  </span>
                  <span className="radio-indicator">
                    {h.id === hardwareId && <span />}
                  </span>
                </button>
                <div className="hardware-footer">
                  <span className={h.compatible ? "green" : ""}>
                    {h.id === rec.recommended_id
                      ? "SUGGESTED · HEURISTIC"
                      : h.compatible
                        ? "ENVELOPE FIT"
                        : "CONSTRAINT MISMATCH"}
                  </span>
                  <label>
                    <input
                      type="checkbox"
                      aria-label={`Compare ${h.name}`}
                      checked={compare.includes(h.id)}
                      onChange={() =>
                        setCompare(
                          compare.includes(h.id)
                            ? compare.filter((x) => x !== h.id)
                            : [...compare.slice(-1), h.id],
                        )
                      }
                    />{" "}
                    Compare
                  </label>
                </div>
                {!h.compatible && (
                  <p className="hardware-reason">{h.reasons.join(" ")}</p>
                )}
              </div>
            ))}
          </div>
          <Eyebrow>SELECTED COMPARISON</Eyebrow>
          <div className="comparison">
            <table>
              <thead>
                <tr>
                  <th>Design envelope</th>
                  {rec.candidates
                    .filter((h) => compare.includes(h.id))
                    .map((h) => (
                      <th key={h.id}>{h.name}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Memory", "memory_gb", " GB"],
                  ["Power envelope", "power_w", " W"],
                  ["Placement", "category", ""],
                ].map(([label, key, unit]) => (
                  <tr key={key}>
                    <td>{label}</td>
                    {rec.candidates
                      .filter((h) => compare.includes(h.id))
                      .map((h) => (
                        <td key={h.id}>
                          {String(h[key as keyof typeof h])}
                          {unit}
                        </td>
                      ))}
                  </tr>
                ))}
                <tr>
                  <td>Inference latency</td>
                  {compare.map((id) => (
                    <td key={id}>Unmeasured</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          {rec.candidates
            .filter((h) => compare.includes(h.id))
            .map((h) => (
              <div className="source-note" key={h.id}>
                <p>{h.note}</p>
                <a href={h.source} target="_blank" rel="noreferrer">
                  Documentation reference <ArrowUpRight size={11} />
                </a>
                <small>{h.availability}</small>
              </div>
            ))}
          <Notice>
            Catalog source links require current verification; no inference
            benchmark or price quote is available. Memory fit does not establish
            that a deadline is achievable.
          </Notice>
          <Button variant="outline" disabled={busy} onClick={explain}>
            {busy ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <BookOpen size={14} />
            )}{" "}
            {visualPreview ? "Explain fixture" : "Explain with NVIDIA"}
          </Button>
          {explanation && <p className="ai-answer">{explanation}</p>}
          <Button onClick={() => set({ section: "simulate" })}>
            Enter the simulation lab <ArrowRight size={16} />
          </Button>
        </>
      )}
    </>
  );
}
function Simulate({ onError }: Props) {
  const { assessment } = useAssessment();
  const {
    robot,
    task,
    hardwareId,
    runs,
    playhead,
    playing,
    speed,
    driveSpeed,
    visualPreview,
    set,
  } = useLab();
  const [busy, setBusy] = useState(false);
  const [duration, setDuration] = useState(6);
  const [analysis, setAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const analyze = async () => {
    setAnalyzing(true);
    try {
      const response = await api<{ data: { answer: string } }>("ai", {
        workflow: "analysis",
        robot,
        prompt: JSON.stringify({
          task,
          hardware_id: hardwareId,
          experiment: run
            ? {
                engine: run.engine,
                metrics: run.metrics,
                task_completed: run.task_completed,
                limitations: run.limitations,
              }
            : null,
        }),
        level: "intermediate",
      });
      setAnalysis(response.data.answer);
    } catch (e) {
      onError(formatError(e));
    } finally {
      setAnalyzing(false);
    }
  };
  const run = runs.at(-1);
  const frame = run?.frames[playhead];
  const execute = async () => {
    setBusy(true);
    set({ playing: false });
    try {
      const result = await api<SimulationRun>("simulate", {
        robot,
        task,
        hardware_id: hardwareId,
        duration_s: duration,
        wheel_speed_rad_s: driveSpeed,
      });
      set({
        runs: [...runs.slice(-19), result],
        playhead: 0,
        playing: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      });
    } catch (e) {
      onError(formatError(e));
    } finally {
      setBusy(false);
    }
  };
  const supported = !!assessment?.physics_valid;
  return (
    <>
      <Eyebrow>05 / PHYSICS LABORATORY</Eyebrow>
      <h2>
        Less assumption.
        <br />
        <em>More evidence.</em>
      </h2>
      <p className="panel-intro">
        A real MuJoCo experiment, rendered from recorded physics states.
      </p>
      <div className="experiment-title">
        <span className="green-dot" />
        <b>FLAT-FLOOR DRIVE</b>
        <span>CPU physics</span>
      </div>
      <p className="fine">
        Four wheel velocity controllers · 2 ms integration timestep · gravity
        and contact friction. Geometry and masses come from this robot.
      </p>
      {!supported && (
        <div className="warning">
          This robot is conceptual for simulation. The current adapter supports
          four-wheel rovers only.
        </div>
      )}
      <label className="field-label" htmlFor="duration">
        EXPERIMENT DURATION · {duration} S
      </label>
      <input
        id="duration"
        type="range"
        min={1}
        max={12}
        value={duration}
        onChange={(e) => setDuration(+e.target.value)}
      />
      <Button onClick={execute} disabled={busy || !supported}>
        {busy ? <Loader2 size={15} className="spin" /> : <Play size={15} />}{" "}
        {busy ? "Integrating rigid-body dynamics…" : "Run physics experiment"}
      </Button>
      <Notice>
        This experiment tests forward drive. It does not execute “
        {task.description}” or benchmark {hardwareId}. The selected compute does
        not change physics.
      </Notice>
      {run && (
        <>
          <div className="result-header">
            <span>MEASURED / {run.engine}</span>
            <Check size={14} />
          </div>
          <div className="stat-grid">
            <div>
              <strong>
                {run.metrics.displacement_m.toFixed(2)}
                <small>m</small>
              </strong>
              <span>PLANAR DISPLACEMENT</span>
            </div>
            <div>
              <strong>
                {run.metrics.simulated_seconds.toFixed(1)}
                <small>s</small>
              </strong>
              <span>SIMULATED TIME</span>
            </div>
          </div>
          <div className="playback">
            <button
              aria-label={playing ? "Pause playback" : "Play playback"}
              onClick={() =>
                set({
                  playing: !playing,
                  ...(playhead >= run.frames.length - 1 ? { playhead: 0 } : {}),
                })
              }
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <input
              aria-label="Simulation timeline"
              type="range"
              min={0}
              max={run.frames.length - 1}
              value={playhead}
              onChange={(e) =>
                set({ playhead: +e.target.value, playing: false })
              }
            />
            <span>{frame?.t.toFixed(2)} s</span>
            <button
              aria-label="Reset playback"
              onClick={() => set({ playhead: 0, playing: false })}
            >
              <RotateCcw size={14} />
            </button>
          </div>
          <div className="spec-rows">
            <div>
              <span>Integration steps</span>
              <b>{run.metrics.steps}</b>
            </div>
            <div>
              <span>Local solve time</span>
              <b>{(run.metrics.wall_seconds * 1000).toFixed(1)} ms</b>
            </div>
            <div>
              <span>Contacts in current frame</span>
              <b>{frame?.contacts || 0}</b>
            </div>
            <div>
              <span>Maximum tilt</span>
              <b>{((run.metrics.max_tilt_rad * 180) / Math.PI).toFixed(2)}°</b>
            </div>
          </div>
          <Eyebrow>LIVE RECORDED JOINT STATES</Eyebrow>
          {frame?.joints.map((v, i) => (
            <div className="joint-row" key={i}>
              <span>WHEEL {i + 1}</span>
              <meter value={Math.abs(Math.sin(v))} min={0} max={1} />
              <b>{v.toFixed(2)} rad</b>
              <small>{frame.controller_output[i]?.toFixed(3)} Nm</small>
            </div>
          ))}
          <p className="fine muted">
            Contacts include wheel–floor contact. Actuator torque is MuJoCo
            output; it is not a GPU metric. {run.outcome}.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              const blob = new Blob([JSON.stringify(run, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `experiment-${run.id}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download size={14} /> Export measured states
          </Button>
          <Button variant="outline" disabled={analyzing} onClick={analyze}>
            {analyzing ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <BookOpen size={14} />
            )}{" "}
            {visualPreview
              ? "Review recorded results fixture"
              : "Analyze recorded results with NVIDIA"}
          </Button>
          {analysis && <div className="ai-answer">{analysis}</div>}
          <Button onClick={() => set({ section: "learn" })}>
            Understand what happened <ArrowRight size={16} />
          </Button>
        </>
      )}
    </>
  );
}
function Learn({ onError }: Props) {
  const {
    robot,
    selected,
    task,
    runs,
    attempts,
    cards: progress,
    visualPreview,
    set,
  } = useLab();
  const [tab, setTab] = useState("tutor");
  const [level, setLevel] = useState("intermediate");
  const [question, setQuestion] = useState(
    "How does this robot move, and what limits its capabilities?",
  );
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const request = async (workflow: string) => {
    setBusy(true);
    try {
      const result = await api<{
        data: { answer?: string; questions?: Question[]; cards?: Card[] };
      }>("ai", {
        workflow,
        robot,
        prompt: JSON.stringify({
          question,
          component_id: selected,
          task,
          experiment: runs.at(-1)
            ? {
                metrics: runs.at(-1)?.metrics,
                limitations: runs.at(-1)?.limitations,
              }
            : null,
        }),
        level,
      });
      if (workflow === "quiz") {
        setQuestions(result.data.questions || []);
        setAnswers({});
      } else if (workflow === "flashcards") setCards(result.data.cards || []);
      else setAnswer(result.data.answer || "");
    } catch (e) {
      onError(formatError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Eyebrow>06 / THE ENGINEERING CLASSROOM</Eyebrow>
      <h2>
        Build a machine.
        <br />
        <em>Build intuition.</em>
      </h2>
      <p className="panel-intro">
        Learning grounded in your robot, its components, and the experiments you
        actually ran.
      </p>
      {visualPreview && (
        <div className="provenance">
          DETERMINISTIC VISUAL EXERCISES / NO MODEL INFERENCE
        </div>
      )}
      <div className="segmented">
        {["tutor", "quiz", "flashcards"].map((t) => (
          <button
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
            key={t}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "tutor" && (
        <>
          <label htmlFor="level" className="field-label">
            EXPLANATION LEVEL
          </label>
          <select
            id="level"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            {["beginner", "intermediate", "advanced"].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <label htmlFor="question" className="field-label">
            YOUR QUESTION
          </label>
          <textarea
            id="question"
            value={question}
            maxLength={3000}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <Button
            disabled={busy || question.length < 3}
            onClick={() => request("tutor")}
          >
            {busy ? (
              <Loader2 className="spin" size={14} />
            ) : (
              <BookOpen size={14} />
            )}{" "}
            {visualPreview ? "Ask visual tutor" : "Ask the NVIDIA tutor"}
          </Button>
          {answer && <div className="ai-answer">{answer}</div>}
          {!answer && (
            <Notice>
              {visualPreview
                ? "Visual preview uses labeled, deterministic explanations. No model inference is sent."
                : "The tutor requires a configured Nebius-hosted Nemotron model. It will not return a scripted response."}
            </Notice>
          )}
        </>
      )}
      {tab === "quiz" && (
        <>
          <Button disabled={busy} onClick={() => request("quiz")}>
            {busy ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <RefreshCw size={14} />
            )}{" "}
            Generate a contextual quiz
          </Button>
          {questions.map((q, i) => (
            <div className="quiz-card" key={i}>
              <span className="eyebrow">QUESTION {i + 1}</span>
              <h3>{q.question}</h3>
              {q.choices.map((choice, j) => (
                <button
                  disabled={answers[i] !== undefined}
                  className={
                    answers[i] === j
                      ? j === q.correct_index
                        ? "correct"
                        : "incorrect"
                      : ""
                  }
                  onClick={() => {
                    setAnswers({ ...answers, [i]: j });
                    set({
                      attempts: [
                        ...attempts,
                        {
                          question: q.question,
                          selected_index: j,
                          correct: j === q.correct_index,
                        },
                      ],
                    });
                  }}
                  key={j}
                >
                  <span>{String.fromCharCode(65 + j)}</span>
                  {choice}
                </button>
              ))}
              {answers[i] !== undefined && <p>{q.explanation}</p>}
            </div>
          ))}
        </>
      )}
      {tab === "flashcards" && (
        <>
          <Button disabled={busy} onClick={() => request("flashcards")}>
            {busy ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}{" "}
            Generate robot flashcards
          </Button>
          {cards.map((card) => (
            <div className="flashcard" key={card.id}>
              <button
                aria-label={`Flip ${card.front}`}
                onClick={() =>
                  setFlipped({ ...flipped, [card.id]: !flipped[card.id] })
                }
              >
                <span className="eyebrow">
                  {flipped[card.id] ? "EXPLANATION" : "CONCEPT · CLICK TO FLIP"}
                </span>
                <p>{flipped[card.id] ? card.back : card.front}</p>
              </button>
              <label>
                <input
                  type="checkbox"
                  checked={
                    !!progress.find((p) => p.card_id === card.id)?.mastered
                  }
                  onChange={(e) =>
                    set({
                      cards: [
                        ...progress.filter((p) => p.card_id !== card.id),
                        { card_id: card.id, mastered: e.target.checked },
                      ],
                    })
                  }
                />{" "}
                I understand this concept
              </label>
            </div>
          ))}
        </>
      )}
      <div className="learning-progress">
        <span>
          {attempts.filter((a) => a.correct).length} / {attempts.length} correct
          answers
        </span>
        <span>
          {progress.filter((c) => c.mastered).length} concepts reviewed
        </span>
      </div>
      <details className="ecosystem">
        <summary>Beyond the edge: NVIDIA architecture</summary>
        <h3>Vera Rubin · cloud infrastructure</h3>
        <p>
          Vera CPU and Rubin GPU architecture belongs in the data center. NVLink
          connects accelerated compute; scale-out networking connects systems.
          Large memory pools and high-bandwidth communication support model
          training and fleet-level research.
        </p>
        <p>
          This is architecture education. No Vera Rubin hardware is accessed or
          benchmarked here, and product specifications and availability need
          current manufacturer verification.
        </p>
        <a
          href="https://www.nvidia.com/en-us/data-center/technologies/rubin/"
          target="_blank"
          rel="noreferrer"
        >
          NVIDIA architecture reference <ArrowUpRight size={12} />
        </a>
        <h4>ROBOTICS ECOSYSTEM / STATUS</h4>
        {[
          ["MuJoCo", "INTEGRATED · actual CPU physics"],
          [
            "Nebius Token Factory",
            visualPreview
              ? "INTEGRATED adapter · preview fixtures; paid calls blocked"
              : "INTEGRATED adapter · verification evidence in Connections",
          ],
          [
            "Supabase",
            "PLANNED live validation · adapter present; project required",
          ],
          ["Isaac Sim / Isaac Lab", "PLANNED · not installed"],
          ["Isaac ROS / JetPack", "EDUCATIONAL DEMONSTRATION"],
          ["Cosmos / GR00T", "EDUCATIONAL DEMONSTRATION"],
          [
            "CUDA / TensorRT",
            "EDUCATIONAL DEMONSTRATION · no measured deployment",
          ],
          [
            "Omniverse / PhysX",
            "EDUCATIONAL DEMONSTRATION · no execution integration",
          ],
          ["GPU benchmarking", "UNSUPPORTED in the current prototype"],
        ].map(([a, b]) => (
          <p key={a}>
            <b>{a}</b>
            <br />
            <span className="muted">{b}</span>
          </p>
        ))}
      </details>
    </>
  );
}
function History({ onError }: Props) {
  const { runs, robot, set, project } = useLab();
  const [stored, setStored] = useState<Project[]>([]);
  const [cloud, setCloud] = useState<{ data: Project }[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    try {
      setStored(JSON.parse(localStorage.getItem("robotics-projects") || "[]"));
    } catch {}
  }, []);
  const cloudRequest = async (method: "GET" | "POST") => {
    setBusy(true);
    try {
      const token = sessionStorage.getItem("supabase-session");
      if (!token)
        throw new Error("Sign in through Connections to sync with Supabase.");
      const res = await fetch("/api/projects", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        ...(method === "POST" ? { body: JSON.stringify(project()) } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Cloud sync failed");
      if (method === "GET") setCloud(data);
      else onError("Project synced to Supabase.");
    } catch (e) {
      onError(formatError(e));
    } finally {
      setBusy(false);
    }
  };
  const load = (p: Project) => {
    set({
      robot: p.robot,
      task: p.task,
      hardwareId: p.hardware_id,
      runs: p.simulation_runs,
      attempts: p.quiz_attempts,
      cards: p.flashcard_progress,
      driveSpeed: p.controller_settings?.wheel_speed_rad_s ?? 4,
      changes: p.design_changes || [],
      inspected: p.inspected_components || [],
      selected: null,
      playing: false,
      playhead: 0,
      section: "design",
      assembly: deriveAssembly(p.robot),
    });
  };
  return (
    <>
      <Eyebrow>07 / RESEARCH NOTEBOOK</Eyebrow>
      <h2>
        Keep the evidence.
        <br />
        <em>Improve the idea.</em>
      </h2>
      <p className="panel-intro">
        Experiments and learning progress stay with the same robot
        specification.
      </p>
      <div className="provenance">BROWSER STORAGE · LOCAL DEVICE</div>
      <Eyebrow>THIS ROBOT / {runs.length} EXPERIMENTS</Eyebrow>
      {runs.length === 0 && (
        <p className="fine muted">No physics experiments recorded yet.</p>
      )}
      {runs.map((r, i) => (
        <button
          className="history-run"
          key={r.id}
          onClick={() =>
            set({
              runs: [...runs.filter((x) => x.id !== r.id), r],
              section: "simulate",
              playhead: 0,
              playing: false,
            })
          }
        >
          <span>{String(i + 1).padStart(2, "0")}</span>
          <div>
            <b>
              {r.metrics.displacement_m.toFixed(2)} m ·{" "}
              {r.metrics.simulated_seconds.toFixed(1)} s
            </b>
            <small>
              {r.engine} / {r.hardware_id}
            </small>
          </div>
          <ArrowUpRight size={14} />
        </button>
      ))}
      <Eyebrow>SAVED PROJECTS</Eyebrow>
      {stored.map((p) => (
        <button key={p.id} className="history-run" onClick={() => load(p)}>
          <span>
            <BookOpen size={16} />
          </span>
          <div>
            <b>{p.robot.name}</b>
            <small>
              {p.simulation_runs.length} experiments · {p.robot.provenance}
            </small>
          </div>
          <ArrowUpRight size={14} />
        </button>
      ))}
      <Button
        variant="outline"
        disabled={!robot}
        onClick={() => {
          const p = project();
          if (!p) return;
          const blob = new Blob([JSON.stringify(p, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "robot-project.json";
          a.click();
          URL.revokeObjectURL(url);
        }}
      >
        <Download size={14} /> Export current project
      </Button>
      <div className="button-pair">
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => cloudRequest("POST")}
        >
          <Cloud size={14} /> Sync to Supabase
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => cloudRequest("GET")}
        >
          Load cloud
        </Button>
      </div>
      {cloud.map((p) => (
        <button
          className="history-run"
          key={p.data.id}
          onClick={() => load(p.data)}
        >
          {p.data.robot.name}
          <Cloud size={14} />
        </button>
      ))}
      <Notice>
        Browser storage is the current persistence layer. Supabase sync requires
        a configured project, the SQL migration, and a signed-in account.
      </Notice>
    </>
  );
}
export function deriveAssembly(robot: Project["robot"]) {
  const done = new Set<string>();
  const steps = [];
  while (done.size < robot.components.length) {
    const ids = robot.components.filter(
      (c) => !done.has(c.id) && c.depends_on.every((id) => done.has(id)),
    );
    if (!ids.length) break;
    steps.push({
      index: steps.length,
      name: ids.map((c) => c.name).join(" → "),
      component_ids: ids.map((c) => c.id),
    });
    ids.forEach((c) => done.add(c.id));
  }
  return steps;
}
