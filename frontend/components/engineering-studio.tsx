"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  ChevronDown,
  Cpu,
  Layers3,
  Move3D,
  Pause,
  Play,
  Radar,
  RotateCcw,
  Terminal,
  Zap,
} from "lucide-react";
import { useLab } from "../lib/store";
import {
  useSimulation,
  executeExperiment,
  revealSimulationViewport,
} from "../lib/simulation";
import { useRenderer, renderingAcceleration } from "../lib/renderer";
import { useAssessment } from "./design-evidence";
import { PlaybackClock } from "./playback-clock";
import type { BackendHealth, ComponentSpec, SimulationRun } from "../lib/types";

export function AssemblyHierarchy() {
  const robot = useLab((s) => s.robot);
  const selected = useLab((s) => s.selected);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const ordered = useMemo(() => {
    if (!robot) return [];
    const byId = new Map(robot.components.map((c) => [c.id, c]));
    const depth = (part: ComponentSpec, seen = new Set<string>()): number => {
      if (seen.has(part.id)) return 0;
      seen.add(part.id);
      const parent = byId.get(part.depends_on[0]);
      return parent ? 1 + depth(parent, seen) : 0;
    };
    const rows: { part: ComponentSpec; depth: number }[] = [];
    const visited = new Set<string>();
    const walk = (part: ComponentSpec) => {
      if (visited.has(part.id)) return;
      visited.add(part.id);
      rows.push({ part, depth: depth(part) });
      robot.components.filter((c) => c.depends_on[0] === part.id).forEach(walk);
    };
    robot.components.filter((c) => !c.depends_on.length).forEach(walk);
    robot.components.forEach(walk);
    return rows;
  }, [robot]);
  if (!robot) return null;
  const shown = ordered.filter(
    ({ part }) =>
      (filter === "all" ||
        (filter === "joints"
          ? robot.joints.some((j) => j.component_id === part.id)
          : part.kind === filter)) &&
      `${part.name} ${part.id}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <aside className="studio-assembly" aria-label="Robot assembly hierarchy">
      <details open>
        <summary>
          <Layers3 size={16} />
          <span>Assembly</span>
          <small>{robot.components.length} parts</small>
          <ChevronDown size={14} />
        </summary>
        <div className="assembly-body">
          <label className="sr-only" htmlFor="assembly-search">
            Find a component
          </label>
          <input
            id="assembly-search"
            type="search"
            placeholder="Find a component…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div
            className="hierarchy-filters"
            role="group"
            aria-label="Filter assembly"
          >
            {[
              ["all", "All"],
              ["sensor", "Sensors"],
              ["actuator", "Actuators"],
              ["joints", "Joints"],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <ul className="assembly-tree" aria-label="Mounting relationships">
            {shown.map(({ part, depth }) => {
              const joint = robot.joints.find(
                (j) => j.component_id === part.id,
              );
              const Icon =
                part.kind === "sensor"
                  ? Radar
                  : part.kind === "actuator"
                    ? Zap
                    : part.kind === "compute"
                      ? Cpu
                      : Box;
              return (
                <li key={part.id}>
                  <button
                    aria-label={`Select ${part.name}`}
                    aria-pressed={selected === part.id}
                    style={{ paddingLeft: 10 + Math.min(depth, 5) * 12 }}
                    onClick={() => useLab.getState().inspect(part.id)}
                  >
                    <Icon size={14} />
                    <span>
                      {part.name}
                      <small>
                        {filter === "joints"
                          ? `${joint?.type} · axis ${joint?.axis.join(", ")}`
                          : part.kind}
                      </small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {!shown.length && (
            <p className="studio-muted">No matching components.</p>
          )}
          <div className="assembly-summary">
            <span>{robot.joints.length} joints</span>
            <span>{robot.degrees_of_freedom} DOF</span>
            <span>SI / Y-up</span>
          </div>
          <p className="studio-muted">
            Indented rows follow mounting parents. Select a part to inspect its
            specification.
          </p>
        </div>
      </details>
    </aside>
  );
}

/** Always-readable geometry properties; educational explanations remain below. */
export function SelectedProperties() {
  const robot = useLab((s) => s.robot);
  const selected = useLab((s) => s.selected);
  const offsets = useLab((s) => s.inspectionOffsets);
  const transformMode = useLab((s) => s.transformMode);
  const part = robot?.components.find((c) => c.id === selected);
  if (!part) return null;
  const joint = robot?.joints.find((j) => j.component_id === part.id);
  const offset = offsets[part.id] || [0, 0, 0];
  return (
    <section
      className="selected-properties"
      aria-label="Selected component properties"
    >
      <div className="studio-section-title">
        <Box size={14} />
        {part.id}
        <span>{part.shape}</span>
      </div>
      <dl>
        <div>
          <dt>Dimensions · X / Y / Z</dt>
          <dd>{part.size.map((n) => n.toFixed(3)).join(" × ")} m</dd>
        </div>
        <div>
          <dt>World position · X / Y / Z</dt>
          <dd>{part.position.map((n) => n.toFixed(3)).join(" / ")} m</dd>
        </div>
        <div>
          <dt>Rotation · XYZ radians</dt>
          <dd>{part.rotation.map((n) => n.toFixed(3)).join(" / ")}</dd>
        </div>
        <div>
          <dt>Mass input</dt>
          <dd>{part.mass_kg} kg</dd>
        </div>
        <div>
          <dt>Material</dt>
          <dd>
            {part.appearance?.material || "Unspecified reference material"}
          </dd>
        </div>
        <div>
          <dt>Mounted to</dt>
          <dd>{part.depends_on.join(", ") || "Root assembly"}</dd>
        </div>
        {joint && (
          <>
            <div>
              <dt>Joint / local axis</dt>
              <dd>
                {joint.type} / {joint.axis.join(", ")}
              </dd>
            </div>
            <div>
              <dt>Joint range</dt>
              <dd>
                {joint.continuous
                  ? "Continuous"
                  : joint.limits_rad?.join(" to ") + " rad"}
              </dd>
            </div>
            <div>
              <dt>Drive limits</dt>
              <dd>
                {joint.force_limit_nm ?? 2} N·m /{" "}
                {joint.velocity_limit_rad_s ?? 8} rad/s
              </dd>
            </div>
          </>
        )}
      </dl>
      {part.kind === "sensor" && (
        <p className="studio-muted">
          {part.function} Sensor ranges, noise, sample rates, and calibration
          are not specified or simulated unless explicitly documented in this
          design.
        </p>
      )}
      <button
        className="studio-text-button"
        aria-pressed={transformMode === "translate"}
        onClick={() =>
          useLab.getState().set({
            transformMode: transformMode === "translate" ? "off" : "translate",
            exploded: false,
          })
        }
      >
        <Move3D size={14} /> Move in inspection view
      </button>
      {(transformMode !== "off" || Object.keys(offsets).length > 0) && (
        <div className="inspection-transform-note">
          <p>
            Inspection transform · visual only. The validated design and
            collision model are unchanged. Simulation clears these offsets.
          </p>
          <div className="offset-fields">
            {["X", "Y", "Z"].map((axis, i) => (
              <label key={axis}>
                {axis}
                <input
                  aria-label={`Inspection offset ${axis}`}
                  type="number"
                  min={-5}
                  max={5}
                  step={0.01}
                  value={Number(offset[i].toFixed(3))}
                  onChange={(e) => {
                    const next = [...offset] as [number, number, number];
                    next[i] = Math.max(
                      -5,
                      Math.min(5, Number(e.target.value) || 0),
                    );
                    useLab.getState().set({
                      inspectionOffsets: { ...offsets, [part.id]: next },
                    });
                  }}
                />
              </label>
            ))}
          </div>
          <button
            className="studio-text-button"
            onClick={() =>
              useLab
                .getState()
                .set({ inspectionOffsets: {}, transformMode: "off" })
            }
          >
            Reset inspection transforms
          </button>
        </div>
      )}
    </section>
  );
}

export function RenderingDetails({ health }: { health: BackendHealth | null }) {
  const rendering = useRenderer();
  const run = useLab((s) => s.runs.at(-1));
  return (
    <details className="runtime-details">
      <summary>
        <Cpu size={13} />
        Execution backends
        <ChevronDown size={12} />
      </summary>
      <div
        className="runtime-popover"
        role="region"
        aria-label="Execution backend diagnostics"
      >
        <h3>Three separate execution paths.</h3>
        <dl>
          <div>
            <dt>Browser visualization</dt>
            <dd>
              WebGL {rendering.status}. {rendering.version}
            </dd>
          </div>
          <div>
            <dt>Actual renderer</dt>
            <dd data-testid="actual-renderer">{rendering.renderer}</dd>
          </div>
          <div>
            <dt>Vendor</dt>
            <dd>{rendering.vendor}</dd>
          </div>
          <div>
            <dt>Rendering acceleration</dt>
            <dd>{renderingAcceleration(rendering.renderer)}</dd>
          </div>
          <div>
            <dt>Measured rendering rate</dt>
            <dd>
              {rendering.status !== "available"
                ? "No rendering FPS sample"
                : rendering.demand
                  ? "On demand; continuous FPS not sampled"
                  : rendering.fps === null
                    ? "Measuring rendered frame intervals…"
                    : `${rendering.fps.toFixed(1)} FPS · recent 2-second interval`}
            </dd>
          </div>
          <div>
            <dt>Last reported render pass</dt>
            <dd>
              {rendering.calls} draw calls /{" "}
              {rendering.triangles.toLocaleString()} triangles
            </dd>
          </div>
          <div>
            <dt>Physics computation</dt>
            <dd>
              {run?.engine || "MuJoCo"} · backend CPU · GPU physics disabled.{" "}
              {run
                ? `${run.metrics.steps} integration steps recorded.`
                : "No recorded experiment in this project."}
            </dd>
          </div>
          <div>
            <dt>NVIDIA AI inference</dt>
            <dd>
              Nebius Token Factory public API · cloud model service.{" "}
              {health?.live_inference_verified
                ? "Historical successful inference recorded; not a live availability check."
                : "No current verification evidence loaded."}{" "}
              No dedicated GPU is provisioned.
            </dd>
          </div>
          <div>
            <dt>Local NVIDIA RTX simulation</dt>
            <dd>
              Not integrated. CUDA physics, RTX ray tracing, Isaac Sim, and
              Isaac Lab execution are not implemented.
            </dd>
          </div>
        </dl>
        <p>
          Browser renderer strings may be hidden by privacy settings. FPS
          describes rendering, never physics throughput or cloud inference.
        </p>
      </div>
    </details>
  );
}

function Trajectory({ run, index }: { run: SimulationRun; index: number }) {
  const points = useMemo(() => {
    const xs = run.frames.map((f) => f.position[0]),
      zs = run.frames.map((f) => f.position[2]);
    const minX = Math.min(...xs),
      minZ = Math.min(...zs);
    const span = Math.max(Math.max(...xs) - minX, Math.max(...zs) - minZ, 0.01);
    return run.frames.map((f) => [
      8 + ((f.position[0] - minX) / span) * 250,
      34 - ((f.position[2] - minZ) / span) * 26,
    ]);
  }, [run]);
  const current = points[Math.min(index, points.length - 1)];
  return (
    <svg
      viewBox="0 0 270 42"
      className="trajectory-mini"
      role="img"
      aria-label="Measured XZ trajectory with current playback position"
    >
      <polyline
        points={points.map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke="#63777c"
        strokeWidth="1.5"
      />
      <circle cx={current[0]} cy={current[1]} r="3" fill="#bdeb89" />
    </svg>
  );
}

export function SimulationDock({
  onError,
  health,
}: {
  onError: (s: string) => void;
  health: BackendHealth | null;
}) {
  const { assessment, error: assessmentError } = useAssessment();
  const robot = useLab((s) => s.robot);
  const run = useLab((s) => s.runs.at(-1));
  const playhead = useLab((s) => s.playhead);
  const playing = useLab((s) => s.playing);
  const speed = useLab((s) => s.speed);
  const section = useLab((s) => s.section);
  const rendering = useRenderer();
  const sim = useSimulation();
  const frame = run?.frames[Math.min(playhead, run.frames.length - 1)];
  const currentMass = robot?.components.reduce(
    (n, part) => n + part.mass_kg,
    0,
  );
  const historical =
    !!run &&
    (run.robot_id !== robot?.id ||
      (run.parameters?.design_mass_kg !== undefined &&
        Math.abs(run.parameters.design_mass_kg - (currentMass || 0)) > 1e-6));
  const [showLogs, setShowLogs] = useState(false);
  useEffect(() => {
    if (useSimulation.getState().status !== "running")
      useSimulation.setState({ status: "idle", error: "" });
  }, [robot?.id]);
  const state =
    sim.status === "running"
      ? "Solving on backend CPU…"
      : sim.status === "failed"
        ? "Execution failed"
        : playing
          ? "Playing recorded states"
          : run
            ? playhead >= run.frames.length - 1
              ? "Playback complete · solver succeeded"
              : "Solver completed · playback paused"
            : "No experiment executed";
  const play = () => {
    useLab.getState().set({
      section: "simulate",
      playing: !playing,
      ...(playhead >= (run?.frames.length || 1) - 1 ? { playhead: 0 } : {}),
    });
    if (!playing) revealSimulationViewport();
  };
  return (
    <section
      className="simulation-dock"
      aria-label="Simulation controls and diagnostics"
    >
      <PlaybackClock />
      <div className="dock-header">
        <div className="dock-title">
          <span
            className={sim.status === "failed" ? "status-dot" : "green-dot"}
          />
          <strong>PHYSICS / PLAYBACK</strong>
          <span data-testid="simulation-status" aria-live="polite">
            {state}
          </span>
        </div>
        <div className="dock-render">
          <span>WebGL {rendering.status}</span>
          <span>
            {rendering.status !== "available"
              ? "Rendering unavailable"
              : rendering.demand
                ? "On-demand rendering"
                : rendering.fps === null
                  ? "FPS measuring"
                  : `${rendering.fps.toFixed(1)} FPS`}
          </span>
        </div>
      </div>
      <div className="dock-main">
        <div className="dock-actions">
          <button
            className="studio-primary"
            disabled={sim.status === "running" || !assessment?.physics_valid}
            onClick={() => executeExperiment().catch((e) => onError(e.message))}
          >
            <Play size={14} />
            {sim.status === "running" ? "Solving…" : "Start simulation"}
          </button>
          <button
            aria-label={playing ? "Pause playback" : "Play playback"}
            disabled={!run || sim.status === "running"}
            onClick={play}
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button
            aria-label="Reset playback"
            disabled={!run || sim.status === "running"}
            onClick={() =>
              useLab
                .getState()
                .set({ section: "simulate", playhead: 0, playing: false })
            }
          >
            <RotateCcw size={15} />
          </button>
          <button
            aria-label="Replay simulation"
            disabled={!run || sim.status === "running"}
            onClick={() => {
              useLab
                .getState()
                .set({ section: "simulate", playhead: 0, playing: true });
              revealSimulationViewport();
            }}
          >
            Replay
          </button>
          <label className="sr-only" htmlFor="playback-speed">
            Playback speed
          </label>
          <select
            id="playback-speed"
            value={speed}
            onChange={(e) => useLab.getState().set({ speed: +e.target.value })}
          >
            {[0.5, 1, 2].map((n) => (
              <option key={n} value={n}>
                {n}×
              </option>
            ))}
          </select>
        </div>
        <div className="dock-timeline">
          <input
            aria-label="Simulation timeline"
            type="range"
            min={0}
            max={Math.max(1, (run?.frames.length || 1) - 1)}
            value={playhead}
            disabled={!run}
            onChange={(e) =>
              useLab.getState().set({
                section: "simulate",
                playhead: +e.target.value,
                playing: false,
              })
            }
          />
          <span
            data-testid="elapsed-simulation"
            aria-label="Recorded simulation time"
          >
            {frame?.t.toFixed(2) || "0.00"} /{" "}
            {run?.metrics.simulated_seconds.toFixed(2) || "—"} s
          </span>
        </div>
        {run && <Trajectory run={run} index={playhead} />}
      </div>
      <div className="dock-telemetry">
        <span>MuJoCo / backend CPU</span>
        {run ? (
          <>
            <span>
              {run.metrics.steps.toLocaleString()} steps ·{" "}
              {(run.metrics.wall_seconds * 1000).toFixed(1)} ms solve
            </span>
            <span data-testid="position-readout">
              XYZ {frame?.position.map((n) => n.toFixed(3)).join(" / ")} m
            </span>
            <span data-testid="orientation-readout">
              WXYZ {frame?.quaternion.map((n) => n.toFixed(3)).join(" / ")} ·
              Z-up
            </span>
          </>
        ) : (
          <span>
            {assessmentError ||
              (assessment
                ? assessment.physics_valid
                  ? "Flat-floor forward-drive adapter ready"
                  : "Conceptual-only · no controller for this configuration"
                : "Checking physics support…")}
          </span>
        )}
      </div>
      {sim.error && (
        <p className="dock-error" role="alert">
          {sim.error} No new result was accepted; any prior recording remains
          available.
        </p>
      )}
      {run && section !== "simulate" && (
        <p className="dock-note">
          Recorded experiment retained. Press Play to view it in the physics
          workspace.
        </p>
      )}
      {historical && (
        <p className="dock-note">
          Historical recording: these states used different design mass inputs.
          Run a new experiment to test the current revision.
        </p>
      )}
      {run && !playing && playhead === 0 && section === "simulate" && (
        <p className="dock-note">
          Solver succeeded. Press Play to animate the recorded states; Replay
          never reruns physics.
        </p>
      )}
      <div className="dock-footer">
        <button
          aria-expanded={showLogs}
          className="studio-text-button"
          onClick={() => setShowLogs(!showLogs)}
        >
          <Terminal size={13} />
          Execution log ({sim.logs.length})
        </button>
        <span>
          {sim.logs.at(-1)?.message ||
            "Explicit Start runs physics. Pause, Reset, and Replay control recorded playback."}
        </span>
        <RenderingDetails health={health} />
      </div>
      {showLogs && (
        <div
          className="execution-log"
          role="region"
          aria-label="Simulation execution log"
        >
          <h3>Session execution log</h3>
          <p>
            Client-observed request and response events; not a streamed backend
            console.
          </p>
          <ol>
            {sim.logs.map((l, i) => (
              <li className={l.level} key={i}>
                <time>{new Date(l.at).toLocaleTimeString()}</time>
                {l.message}
              </li>
            ))}
          </ol>
          {!sim.logs.length && <p>No solver requests in this session.</p>}
        </div>
      )}
    </section>
  );
}
