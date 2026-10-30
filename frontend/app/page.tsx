"use client";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  ArrowUpRight,
  ArrowRight,
  ChevronDown,
  MoveUpRight,
  Box,
  Layers3,
  ScanLine,
  Cpu,
  FlaskConical,
  BookOpen,
  History,
  Focus,
  RotateCcw,
  Eye,
  EyeOff,
  Maximize2,
  Plus,
  X,
  Settings2,
  Loader2,
  RefreshCw,
  Check,
  Command,
  ArrowDown,
  AlertCircle,
  Download,
  Move3D,
  Navigation,
} from "lucide-react";
import {
  AssemblyHierarchy,
  SimulationDock,
} from "../components/engineering-studio";
import { CinematicOverlay } from "../components/cinematic-ui";
import { useCinema } from "../lib/cinema";
import { useMotionPreference } from "../lib/use-motion-preference";
import { useLab } from "../lib/store";
import { assertRenderable } from "../lib/renderable";
import { api, formatError } from "../lib/api";
import { useModalFocus } from "../lib/use-modal-focus";
import { PanelContent, deriveAssembly } from "../components/lab-panels";
import { Button } from "../components/ui/button";
import type {
  AssemblyStep,
  RobotSpec,
  Project,
  Section,
  BackendHealth,
} from "../lib/types";
const RobotScene = memo(
  dynamic(() => import("../components/robot-scene"), {
    ssr: false,
    loading: () => <div className="scene-loading">INITIALIZING LAB</div>,
  }),
);
const sections: {
  id: Section;
  label: string;
  icon: typeof Box;
  number: string;
}[] = [
  { id: "design", label: "Design", icon: Box, number: "01" },
  { id: "inspect", label: "Inspect", icon: ScanLine, number: "02" },
  { id: "challenge", label: "Challenge", icon: Focus, number: "03" },
  { id: "compute", label: "Compute", icon: Cpu, number: "04" },
  { id: "simulate", label: "Simulate", icon: FlaskConical, number: "05" },
  { id: "learn", label: "Learn", icon: BookOpen, number: "06" },
  { id: "history", label: "Notebook", icon: History, number: "07" },
  { id: "improve", label: "Improve", icon: RotateCcw, number: "08" },
];
export default function Home() {
  const {
    robot,
    entered,
    section,
    selected,
    set,
    setRobot,
    exploded,
    transparent,
    isolate,
    annotations,
    speed,
    camera,
    replay,
    task,
    hardwareId,
    runs,
    attempts,
    cards,
    project,
    driveSpeed,
    changes,
    inspected,
  } = useLab(
    useShallow(({ playhead, playing, renderedRobotId, ...rest }) => rest),
  );
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [generationStatus, setGenerationStatus] = useState<any>(null);
  const [pendingGeneration, setPendingGeneration] = useState<{
    id: string;
    prompt: string;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [connections, setConnections] = useState(false);
  const [generationOpen, setGenerationOpen] = useState(false);
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const reduce = useMotionPreference();
  const phase = useCinema((s) => s.phase);
  useModalFocus(connections || generationOpen, () => {
    setConnections(false);
    if (!busy) setGenerationOpen(false);
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const error = useCallback((s: string) => setMessage(s), []);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      api<{ robot: RobotSpec; assembly: AssemblyStep[] }>("reference/rover"),
      api<typeof health>("health"),
    ])
      .then(([reference, status]) => {
        if (!alive) return;
        setRobot(reference.robot, reference.assembly);
        setHealth(status);
        set({ visualPreview: !!status?.visual_preview });
        try {
          const saved = JSON.parse(
            localStorage.getItem("robotics-current") || "null",
          ) as Project | null;
          if (saved?.robot?.components?.length) {
            setRobot(saved.robot, deriveAssembly(saved.robot));
            set({
              task: saved.task,
              hardwareId: saved.hardware_id,
              runs: saved.simulation_runs || [],
              attempts: saved.quiz_attempts || [],
              cards: saved.flashcard_progress || [],
              driveSpeed: saved.controller_settings?.wheel_speed_rad_s ?? 4,
              changes: saved.design_changes || [],
              inspected: saved.inspected_components || [],
            });
          }
        } catch {}
      })
      .catch((e) => {
        if (alive) error(formatError(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [retry, set, setRobot, error]);
  useEffect(() => {
    if (!robot) return;
    const timer = setTimeout(() => {
      try {
        const p = project();
        localStorage.setItem("robotics-current", JSON.stringify(p));
        const list = JSON.parse(
          localStorage.getItem("robotics-projects") || "[]",
        ) as Project[];
        localStorage.setItem(
          "robotics-projects",
          JSON.stringify(
            [p, ...list.filter((x) => x.id !== p?.id)].slice(0, 8),
          ),
        );
      } catch {
        setMessage(
          "Browser storage is full or unavailable. Export your project to retain it.",
        );
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [
    robot,
    task,
    hardwareId,
    runs,
    attempts,
    cards,
    project,
    driveSpeed,
    changes,
    inspected,
  ]);
  useEffect(() => {
    panelRef.current?.scrollTo({
      top: 0,
      behavior: reduce ? "instant" : "smooth",
    });
    if (section !== "simulate") set({ playing: false });
  }, [section, set, reduce]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 18000);
    return () => clearTimeout(timer);
  }, [message]);
  const reference = async (family: string, cinematic = false) => {
    setBusy(true);
    try {
      const r = await api<{ robot: RobotSpec; assembly: AssemblyStep[] }>(
        "reference/" + family,
      );
      setRobot(r.robot, r.assembly);
      set({ entered: !cinematic, section: "design" });
      if (cinematic) {
        useCinema.getState().start("transform", r.assembly.length);
        if (reduce) useCinema.getState().set({ time: 5, paused: true });
        setMessage(
          "Curated reference construction, not generated from your prompt.",
        );
      }
      setGenerationOpen(false);
    } catch (e) {
      error(formatError(e));
    } finally {
      setBusy(false);
    }
  };
  const acceptGeneration = (r: {
    robot: RobotSpec;
    assembly: AssemblyStep[];
  }) => {
    assertRenderable(r.robot);
    setRobot(r.robot, r.assembly);
    set({
      entered: true,
      section: "design",
      replay: useLab.getState().replay + 1,
    });
    setGenerationOpen(false);
    sessionStorage.removeItem("arise-generation");
    setPendingGeneration(null);
    setGenerationStatus(null);
    window.scrollTo({ top: 0, behavior: "instant" });
    setMessage(
      "Validated AI concept loaded. The 3D assembly is not proof of physics or task completion.",
    );
  };
  const checkGeneration = async (saved = pendingGeneration) => {
    if (!saved || inFlight.current) return;
    try {
      const result = await api<any>("generations/" + saved.id);
      setGenerationStatus(result);
      if (result.status === "succeeded" && result.result)
        acceptGeneration(result.result);
    } catch (e) {
      error(formatError(e));
    }
  };
  useEffect(() => {
    if (loading) return;
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("arise-generation") || "null",
      );
      if (saved?.id && saved?.prompt) {
        setPendingGeneration(saved);
        void checkGeneration(saved);
      }
    } catch {}
  }, [loading]);
  const generate = async (e: React.FormEvent, explicitRetry = false) => {
    e.preventDefault();
    const text =
      explicitRetry && pendingGeneration
        ? pendingGeneration.prompt
        : prompt.trim();
    if (text.length < 8 || inFlight.current || busy || loading) return;
    inFlight.current = true;
    setBusy(true);
    const saved = { id: crypto.randomUUID(), prompt: text };
    setPendingGeneration(saved);
    setGenerationStatus(null);
    sessionStorage.setItem("arise-generation", JSON.stringify(saved));
    try {
      const r = await api<any>("generate", {
        prompt: text,
        request_id: saved.id,
        retry_failed: explicitRetry,
      });
      if (r.robot) acceptGeneration(r);
      else setGenerationStatus(r);
    } catch (e) {
      error(formatError(e));
      try {
        setGenerationStatus(await api<any>("generations/" + saved.id));
      } catch {}
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const enter = (target: Section = "design") => {
    set({ entered: true, section: target });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <main
      className={`world arise-world ${entered ? "in-lab" : "cinematic-world"} phase-${phase}`}
    >
      <header className="topbar">
        <button
          className="brand"
          aria-label="ARISE home"
          onClick={() => {
            set({ entered: false, playing: false });
            useCinema.getState().start("intro");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span className="brand-symbol">
            <span />
            <span />
            <span />
          </span>
          <span>
            ARISE
            <b>IDEAS BECOME MACHINES</b>
          </span>
        </button>
        <nav aria-label="Primary navigation">
          <button
            className={entered && section !== "compute" ? "active" : ""}
            onClick={() => enter()}
          >
            Engineering lab <span>↗</span>
          </button>
          <button
            className={section === "compute" && entered ? "active" : ""}
            onClick={() => enter("compute")}
          >
            Compute atlas <span>↗</span>
          </button>
          <button className="nav-fieldnotes" onClick={() => enter("learn")}>
            Field notes <span>↗</span>
          </button>
        </nav>
        <button
          className="connection-status"
          onClick={() => setConnections(true)}
        >
          <span
            className={
              health?.nebius_configured &&
              health.model_configured &&
              health.pricing_configured
                ? "green-dot"
                : "status-dot"
            }
          />
          <span>
            {health?.visual_preview
              ? "VISUAL PREVIEW"
              : health?.nebius_configured
                ? "AI CONFIGURED"
                : "LOCAL EXPLORATION"}
          </span>
          <Settings2 size={13} />
        </button>
      </header>
      <div
        className="scene-container"
        aria-label="Interactive 3D robot construction laboratory"
      >
        <RobotScene />
        <div className="scene-vignette" />
        <div className="scene-coordinate top-left">
          <span>LAB / 001</span>
          <span>PROCEDURAL ENGINEERING</span>
        </div>
        <div className="scene-coordinate bottom-right">
          <span id="render-fps">RENDER RATE · MEASURING</span>
          <span>Y ↑ / METERS</span>
        </div>
        {!entered && (
          <div className="robot-callout">
            <span>01 — MECHANICAL ASSEMBLY</span>
            <div />
            <small>
              {robot?.provenance === "reference"
                ? "REFERENCE ROVER / CONCEPT MODEL"
                : "CURRENT ROBOT / CONCEPT MODEL"}
            </small>
          </div>
        )}
      </div>
      <CinematicOverlay />
      {health?.visual_preview && (
        <div className="preview-ribbon">
          VISUAL DEVELOPMENT / DETERMINISTIC FIXTURES / PAID INFERENCE BLOCKED
        </div>
      )}
      {!entered ? (
        <>
          <section className="hero legacy-hero">
            <motion.div
              className="hero-copy"
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 0.9 }}
            >
              <div className="eyebrow">
                <span className="tiny-square" /> NVIDIA × NEBIUS{" "}
                <span className="hero-edition">GLOBAL AI HACKATHON</span>
              </div>
              <h1>
                An idea.
                <br />
                Then, <em>a machine.</em>
              </h1>
              <p>
                A new kind of engineering playground.
                <br />
                Imagine a robot. Build its world.
                <br />
                Understand what makes it possible.
              </p>
              <button className="text-link" onClick={() => enter()}>
                Step inside the lab <ArrowUpRight size={18} />
              </button>
              <div className="hero-index">
                <span>01 / 03</span>
                <div>
                  <i />
                </div>
                <span>IMAGINE THE POSSIBLE</span>
              </div>
            </motion.div>
            <div className="hero-side-note">
              <span>IDEA → MATTER → INTELLIGENCE</span>
              <ArrowDown size={14} />
            </div>
          </section>
          <section className="prompt-area" aria-label="Robot creation">
            <div className="prompt-kicker">
              <span className="tiny-square" /> YOUR NEXT INVENTION STARTS HERE
              <span>01 / IMAGINE</span>
            </div>
            <form className="prompt-console" onSubmit={generate}>
              <label htmlFor="robot-prompt">
                What would you like to engineer?
              </label>
              <div className="prompt-input-row">
                <textarea
                  id="robot-prompt"
                  rows={1}
                  placeholder="A rover that sees. An arm that sorts. Something entirely new…"
                  defaultValue={prompt}
                  onInput={(e) => setPrompt(e.currentTarget.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  maxLength={6000}
                  onKeyDown={(e) => {
                    if (e.key !== "Tab" && e.key !== "Escape")
                      e.stopPropagation();
                    if (
                      !e.repeat &&
                      !e.nativeEvent.isComposing &&
                      (e.ctrlKey || e.metaKey) &&
                      e.key === "Enter"
                    )
                      generate(e);
                  }}
                />
                <button
                  type="submit"
                  className="generate-button"
                  aria-label="Generate robot with NVIDIA"
                  disabled={busy || loading || prompt.trim().length < 8}
                >
                  {busy ? (
                    <Loader2 className="spin" size={20} />
                  ) : (
                    <ArrowUpRight size={24} />
                  )}
                </button>
              </div>
              <div className="prompt-bottom">
                <span>
                  <Command size={11} /> + ENTER TO ENGINEER
                </span>
                <span>
                  {health?.visual_preview ? (
                    "PAID INFERENCE BLOCKED IN VISUAL PREVIEW"
                  ) : (
                    <>
                      NEBIUS TOKEN FACTORY <i /> NVIDIA NEMOTRON
                    </>
                  )}
                </span>
              </div>
            </form>
            <div className="prompt-suggestions">
              <button disabled={busy} onClick={() => reference("rover", true)}>
                Preview curated assembly
              </button>
              <span>EXPLORE A REFERENCE</span>
              <button disabled={busy} onClick={() => reference("rover")}>
                Autonomous rover <ArrowUpRight size={12} />
              </button>
              <button disabled={busy} onClick={() => reference("arm")}>
                Articulated arm <ArrowUpRight size={12} />
              </button>
              <span className="reference-note">
                Reference models are curated, not AI outputs.
              </span>
            </div>
          </section>
          <section className="journey">
            <div className="journey-heading">
              <span className="eyebrow">
                FROM FIRST PRINCIPLES TO FIRST MOVEMENT
              </span>
              <p>
                Don’t just build it.
                <br />
                <em>Know why it works.</em>
              </p>
            </div>
            <div className="journey-cards">
              {[
                {
                  n: "01",
                  title: "Make it tangible.",
                  desc: "Watch a specification become a machine, one connected component at a time.",
                  icon: Layers3,
                  target: "design",
                },
                {
                  n: "02",
                  title: "Question every choice.",
                  desc: "Explore mechanics. Trace the data. Find the right compute for the task.",
                  icon: Cpu,
                  target: "compute",
                },
                {
                  n: "03",
                  title: "Put ideas to the test.",
                  desc: "Run real rigid-body physics. Keep the evidence. Learn what to improve.",
                  icon: FlaskConical,
                  target: "simulate",
                },
              ].map(({ n, title, desc, icon: Icon, target }) => (
                <button key={n} onClick={() => enter(target as Section)}>
                  <div>
                    <span>{n}</span>
                    <Icon size={21} />
                  </div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                  <ArrowUpRight size={17} />
                </button>
              ))}
            </div>
          </section>
          <footer className="footer">
            <span>ARISE / ROBOTICS INTELLIGENCE PLATFORM</span>
            <p>Built for curiosity. Grounded in engineering.</p>
            <button onClick={() => setConnections(true)}>
              INTEGRATION STATUS <ArrowUpRight size={12} />
            </button>
          </footer>
        </>
      ) : (
        <>
          <aside className="lab-nav" aria-label="Engineering workflow">
            {sections.map(({ id, label, icon: Icon, number }) => (
              <button
                key={id}
                aria-label={label}
                aria-current={section === id ? "step" : undefined}
                className={section === id ? "active" : ""}
                onClick={() => set({ section: id })}
              >
                <Icon size={17} />
                <span>{label}</span>
                <small>{number}</small>
              </button>
            ))}
            <button
              className="new-project"
              onClick={() => setGenerationOpen(true)}
            >
              <Plus size={17} />
              <span>New idea</span>
            </button>
          </aside>
          <div className="lab-heading">
            <span className="eyebrow">
              PROJECT /{" "}
              {robot?.provenance === "reference"
                ? "REFERENCE STUDY"
                : "GENERATED CONCEPT"}
            </span>
            <h1>{robot?.name || "Loading the laboratory…"}</h1>
            <span className="lab-model-meta">
              {robot?.classification} <i /> {robot?.components.length || 0}{" "}
              components <i /> Y-up · SI units
            </span>
          </div>
          <AssemblyHierarchy />
          <div className="lab-panel" ref={panelRef}>
            <div key={section} className="studio-panel-content">
              <PanelContent onError={error} />
            </div>
          </div>
          <div className="viewport-hint">
            <span className="green-dot" /> LIVE 3D WORKSPACE{" "}
            <span>DRAG TO ORBIT · SCROLL TO ZOOM · RIGHT DRAG TO PAN</span>
          </div>
          <div className="viewport-toolbar" aria-label="3D model controls">
            <button
              title="Exploded view"
              aria-label="Exploded view"
              aria-pressed={exploded}
              onClick={() => set({ exploded: !exploded })}
            >
              <Layers3 size={17} />
              <span>Explode</span>
            </button>
            <button
              title="Transparency mode"
              aria-label="Transparency mode"
              aria-pressed={transparent}
              onClick={() => set({ transparent: !transparent })}
            >
              <Box size={17} />
            </button>
            <button
              title="Isolate selected component"
              aria-label="Isolate selected component"
              aria-pressed={isolate}
              onClick={() => set({ isolate: !isolate })}
              disabled={!selected}
            >
              <Focus size={17} />
            </button>
            <button
              title="Engineering annotations"
              aria-label="Engineering annotations"
              aria-pressed={annotations}
              onClick={() => set({ annotations: !annotations })}
            >
              {annotations ? <Eye size={17} /> : <EyeOff size={17} />}
            </button>
            <span className="toolbar-separator" />
            <button
              title="Replay assembly"
              aria-label="Replay assembly"
              onClick={() =>
                set({ replay: replay + 1, playhead: 0, playing: false })
              }
            >
              <RotateCcw size={17} />
            </button>
            <button
              aria-label="Move selected component in inspection view"
              title="Inspection translation · visual only"
              disabled={!selected || section !== "inspect"}
              aria-pressed={useLab.getState().transformMode === "translate"}
              onClick={() =>
                set({
                  transformMode:
                    useLab.getState().transformMode === "translate"
                      ? "off"
                      : "translate",
                  exploded: false,
                })
              }
            >
              <Move3D size={17} />
            </button>
            <button
              aria-label="Follow robot"
              title="Follow recorded robot motion"
              aria-pressed={useLab.getState().followRobot}
              onClick={() =>
                set({ followRobot: !useLab.getState().followRobot })
              }
            >
              <Navigation size={16} />
            </button>
            <span className="toolbar-separator" />
            <label className="sr-only" htmlFor="camera-view">
              Camera preset
            </label>
            <select
              id="camera-view"
              value={camera}
              onChange={(e) => set({ camera: e.target.value as typeof camera })}
            >
              <option value="orbit">Perspective</option>
              <option value="front">Front</option>
              <option value="top">Top</option>
            </select>
            <button
              title="Reset camera"
              aria-label="Reset camera"
              onClick={() => {
                set({ camera: "front", selected: null });
                setTimeout(() => set({ camera: "orbit" }), 30);
              }}
            >
              <Maximize2 size={16} />
            </button>
          </div>
          <SimulationDock health={health} onError={error} />
        </>
      )}
      {loading && (
        <div className="backend-loading">
          <Loader2 className="spin" size={13} /> Connecting engineering
          services…
        </div>
      )}
      {!loading && !robot && (
        <div className="backend-unavailable">
          <AlertCircle size={18} />
          <p>
            The engineering service could not be reached. On hosted deployments,
            the backend may be restarting or temporarily unavailable. Your
            browser workspace is still accessible; retry the connection.
          </p>
          <Button variant="outline" onClick={() => setRetry(retry + 1)}>
            Retry connection
          </Button>
        </div>
      )}
      {pendingGeneration && !busy && (
        <div
          className="generation-recovery"
          role="region"
          aria-label="Generation recovery"
        >
          <p>
            Generation {generationStatus?.status || "status unknown"}.{" "}
            {generationStatus?.error ||
              "Check the saved request before submitting again."}
          </p>
          <p>
            Billing: {generationStatus?.billing || "not yet confirmed"}.
            Checking status never sends inference.
          </p>
          <button onClick={() => checkGeneration()}>
            Check generation status
          </button>
          {generationStatus?.retry_allowed && (
            <button onClick={(e) => generate(e, true)}>
              Retry failed prompt (may incur cost)
            </button>
          )}
        </div>
      )}
      <AnimatePresence>
        {message && (
          <motion.div
            className="toast"
            role="status"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
          >
            <AlertCircle size={17} />
            <p>{message}</p>
            <button
              aria-label="Dismiss notification"
              onClick={() => setMessage("")}
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {connections && (
        <Connections
          close={() => setConnections(false)}
          health={health}
          onError={error}
        />
      )}
      {generationOpen && (
        <div
          className="modal-backdrop"
          onClick={() => !busy && setGenerationOpen(false)}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-project-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Close new project"
              disabled={busy}
              onClick={() => setGenerationOpen(false)}
            >
              <X size={19} />
            </button>
            <span className="eyebrow">A NEW ENGINEERING STUDY</span>
            <h2 id="new-project-title">
              What comes <em>next?</em>
            </h2>
            <form onSubmit={generate}>
              <label htmlFor="new-prompt">Describe your robot</label>
              <textarea
                id="new-prompt"
                data-autofocus
                maxLength={6000}
                defaultValue={prompt}
                onInput={(e) => setPrompt(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Tab" && e.key !== "Escape")
                    e.stopPropagation();
                  if (
                    !e.repeat &&
                    !e.nativeEvent.isComposing &&
                    (e.ctrlKey || e.metaKey) &&
                    e.key === "Enter"
                  )
                    generate(e);
                }}
                placeholder="Describe the structure, purpose, and environment…"
                autoFocus
              />
              <Button disabled={busy || prompt.trim().length < 8} type="submit">
                {busy ? (
                  <Loader2 className="spin" size={15} />
                ) : (
                  <ArrowUpRight size={16} />
                )}{" "}
                Engineer with NVIDIA
              </Button>
            </form>
            <div className="reference-picker">
              <span>OR EXPLORE A CURATED REFERENCE</span>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => reference("rover")}
              >
                Rover
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => reference("arm")}
              >
                Arm
              </Button>
            </div>
            <p className="fine muted">
              Your current project is saved locally before switching.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
function Connections({
  close,
  health,
  onError,
}: {
  close: () => void;
  health: BackendHealth | null;
  onError: (s: string) => void;
}) {
  const [currentHealth, setCurrentHealth] = useState(health);
  const [token, setToken] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usage, setUsage] = useState<{
    charged_usd: number;
    reserved_usd: number;
    limit_usd: number;
    tokens: number;
  } | null>(null);
  useEffect(() => {
    api<BackendHealth>("health")
      .then(setCurrentHealth)
      .catch(() => {});
    setToken(sessionStorage.getItem("lab-access-token") || "");
    api<typeof usage>("usage")
      .then(setUsage)
      .catch(() => {});
  }, []);
  const discover = async () => {
    setBusy(true);
    sessionStorage.setItem("lab-access-token", token);
    try {
      const r = await api<{ models: string[] }>("models");
      setModels(r.models);
      if (!r.models.length)
        onError(
          "No NVIDIA Nemotron model was returned by the authenticated catalog.",
        );
    } catch (e) {
      onError(formatError(e));
    } finally {
      setBusy(false);
    }
  };
  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api<{ access_token: string }>("auth/login", {
        email,
        password,
      });
      sessionStorage.setItem("supabase-session", r.access_token);
      setPassword("");
      onError("Signed in. Open Notebook to sync your project.");
    } catch (e) {
      onError(formatError(e));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [close]);
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="connections-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close"
          aria-label="Close connections"
          onClick={close}
        >
          <X size={19} />
        </button>
        <span className="eyebrow">SERVICE CONNECTIONS</span>
        <h2 id="connections-title">
          An honest <em>status.</em>
        </h2>
        <div className="spec-rows">
          <div>
            <span>MuJoCo physics</span>
            <b className="green">Available locally</b>
          </div>
          <div>
            <span>Nebius credential</span>
            <b>{currentHealth?.nebius_configured ? "Configured" : "Missing"}</b>
          </div>
          <div>
            <span>Live NVIDIA inference</span>
            <b>
              {currentHealth?.live_inference_verified
                ? "Previously verified"
                : "Not yet verified"}
            </b>
          </div>
          {currentHealth?.inference_verification?.last_success_at && (
            <div>
              <span>Last validated response</span>
              <b>
                {new Date(
                  currentHealth.inference_verification.last_success_at,
                ).toLocaleString()}
              </b>
            </div>
          )}
          <div>
            <span>NVIDIA model ID</span>
            <b>
              {currentHealth?.model_configured ? "Configured" : "Not selected"}
            </b>
          </div>
          <div>
            <span>Token prices</span>
            <b>
              {currentHealth?.pricing_configured
                ? "Configured"
                : "Not configured"}
            </b>
          </div>
          <div>
            <span>Supabase project</span>
            <b>
              {currentHealth?.supabase_configured ? "Configured" : "Missing"}
            </b>
          </div>
        </div>
        <p className="fine muted">
          API keys stay on the backend. Add NEBIUS_API_KEY, a catalog Nemotron
          model ID, and verified token prices in environment settings.
          Verification records a past application-validated response for the
          configured model; it does not guarantee current availability.
        </p>
        <label className="field-label" htmlFor="access-token">
          LAB ACCESS TOKEN (PUBLIC DEPLOYMENTS)
        </label>
        <input
          id="access-token"
          type="password"
          autoComplete="off"
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
            sessionStorage.setItem("lab-access-token", e.target.value);
          }}
        />
        <Button variant="outline" disabled={busy} onClick={discover}>
          {busy ? (
            <Loader2 size={14} className="spin" />
          ) : (
            <RefreshCw size={14} />
          )}{" "}
          Discover NVIDIA models
        </Button>
        {models.map((m) => (
          <code key={m} className="model-id">
            {m}
          </code>
        ))}
        {usage && (
          <div className="usage-card">
            <span className="eyebrow">
              LOCAL APP LEDGER / NOT ACCOUNT BALANCE
            </span>
            <strong>
              ${(usage.charged_usd + usage.reserved_usd).toFixed(4)}{" "}
              <small>/ ${usage.limit_usd.toFixed(2)} ceiling</small>
            </strong>
            <p>
              {usage.tokens} reported tokens · includes uncertain reservations
            </p>
          </div>
        )}
        <form onSubmit={signIn}>
          <h3>Supabase project sync</h3>
          <p className="fine muted">
            Use an existing Supabase email account. Your project is retained
            locally if sync is unavailable.
          </p>
          <label className="sr-only" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="Email address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
          <label className="sr-only" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Button
            variant="outline"
            disabled={busy || !currentHealth?.supabase_configured}
          >
            Sign in to sync <ArrowUpRight size={14} />
          </Button>
        </form>
        <button
          className="signout-link"
          onClick={() => {
            sessionStorage.removeItem("supabase-session");
            onError("Signed out on this browser.");
          }}
        >
          Clear cloud session
        </button>
      </section>
    </div>
  );
}
