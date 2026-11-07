"use client";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  RotateCcw,
  Layers3,
  ScanLine,
  Focus,
  Check,
  X,
} from "lucide-react";
import {
  ROBOTS,
  STAGES,
  QUIZ,
  resolveRobot,
  asRobotSpec,
  type RobotKind,
} from "../lib/arise";
import { api, formatError } from "../lib/api";
import { resolveExperience } from "../lib/simulation-lessons";
import { useMotionPreference } from "../lib/use-motion-preference";
import { useModalFocus } from "../lib/use-modal-focus";
import type { BackendHealth } from "../lib/types";
const Scene = dynamic(() => import("../components/arise-scene"), {
  ssr: false,
});
type Step = "imagine" | "assemble" | "task" | "compute" | "learn";
const steps: Step[] = ["imagine", "assemble", "task", "compute", "learn"];
export default function Home() {
  const router = useRouter();
  function prepareSimulation() {
    router.prefetch("/simulation");
    void import("../components/simulation-scene").catch(() => {});
  }
  const [loaded, setLoaded] = useState(false),
    [kind, setKind] = useState<RobotKind>("humanoid"),
    [step, setStep] = useState<Step>("imagine");
  const [rendering, setRendering] = useState(false);
  const [prompt, setPrompt] = useState(""),
    [error, setError] = useState(""),
    [assembling, setAssembling] = useState(false),
    [stage, setStage] = useState(0),
    [replay, setReplay] = useState(0);
  const [selected, setSelected] = useState("torso"),
    [exploded, setExploded] = useState(false),
    [wireframe, setWireframe] = useState(false),
    [cameraReset, setCameraReset] = useState(0);
  const [task, setTask] = useState(""),
    [taskInput, setTaskInput] = useState(""),
    [taskStart, setTaskStart] = useState(0),
    [taskStatus, setTaskStatus] = useState<"idle" | "running" | "completed">(
      "idle",
    );
  const [health, setHealth] = useState<BackendHealth | null>(null),
    [settings, setSettings] = useState(false),
    [token, setToken] = useState("");
  const [answers, setAnswers] = useState<Record<number, number>>({}),
    [checked, setChecked] = useState(false),
    [question, setQuestion] = useState(""),
    [reply, setReply] = useState(""),
    [asking, setAsking] = useState(false),
    [live, setLive] = useState(false);
  const reduced = useMotionPreference();
  const robot = ROBOTS[kind];
  const part = robot.parts.find((p) => p.id === selected) || robot.parts[0];
  useModalFocus(settings, () => setSettings(false));
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), reduced ? 0 : 1100);
    return () => clearTimeout(t);
  }, [reduced]);
  useEffect(() => {
    api<BackendHealth>("health", undefined, 5000)
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);
  useEffect(() => {
    if (!assembling) return;
    const start = performance.now();
    const timer = setInterval(
      () =>
        setStage(Math.min(5, Math.floor((performance.now() - start) / 1000))),
      100,
    );
    return () => clearInterval(timer);
  }, [assembling, replay]);
  useEffect(() => {
    if (!assembling) return;
    // Leave component study reachable if the renderer crashes during assembly.
    const timer = setTimeout(() => {
      setAssembling(false);
      setStage(5);
    }, 8000);
    return () => clearTimeout(timer);
  }, [assembling, replay]);
  useEffect(() => {
    if (taskStatus !== "running") return;
    const timer = setTimeout(() => setTaskStatus("completed"), 3000);
    return () => clearTimeout(timer);
  }, [taskStatus, taskStart]);
  const complete = useCallback(() => {
    setAssembling(false);
    setStage(5);
  }, []);
  function build(text: string) {
    const experience = resolveExperience(text);
    if (experience && experience !== "microduck") {
      router.push(`/simulation?scene=${experience}`);
      return;
    }
    const next = resolveRobot(text);
    if (!next) {
      setError(
        "Choose a humanoid, drone or Microduck. Please name one supported robot.",
      );
      return;
    }
    setKind(next);
    setSelected(ROBOTS[next].parts[0].id);
    setStep("assemble");
    setAssembling(true);
    setStage(0);
    setReplay((r) => r + 1);
    setTask("");
    setTaskStatus("idle");
    setError("");
    setExploded(false);
    setWireframe(false);
    setAnswers({});
    setChecked(false);
    setReply("");
  }
  function run(name: string) {
    if (!rendering) {
      setError(
        "3D rendering is unavailable. Reload to restore the scene before running a motion demonstration. Component lessons remain available.",
      );
      return;
    }
    const found = robot.tasks.find(
      (t) => t.toLowerCase() === name.trim().toLowerCase(),
    );
    if (!found) {
      setError(`Supported tasks: ${robot.tasks.join(", ")}.`);
      return;
    }
    setError("");
    setTask(found);
    setTaskStart(performance.now());
    setTaskStatus("running");
  }
  async function ask(e: FormEvent) {
    e.preventDefault();
    if (question.trim().length < 3 || asking) return;
    setAsking(true);
    setLive(false);
    setReply("");
    try {
      const data = await api<{ data: unknown }>(
        "ai",
        {
          workflow: "tutor",
          robot: asRobotSpec(kind),
          prompt: question.trim().slice(0, 1200),
          level: "beginner",
        },
        20_000,
      );
      const output = data.data;
      const text =
        typeof output === "string"
          ? output
          : output && typeof output === "object"
            ? Object.values(output)
                .filter((v) => typeof v === "string")
                .join("\n\n")
            : "";
      if (!text) throw new Error("The AI returned no readable explanation.");
      setReply(text);
      setLive(true);
    } catch (e) {
      const q = question.toLowerCase();
      const local =
        q.includes("gpu") || q.includes("compute")
          ? "The CPU coordinates sensors, communication and planning. A GPU can accelerate neural-network inference; a separate microcontroller should enforce time-critical motor limits. This browser animation does not require NVIDIA hardware."
          : q.includes("power") || q.includes("battery")
            ? "A battery supplies motor and compute power. Size the power system for peak current, voltage, cooling and operating time. This educational model does not measure energy consumption."
            : `${part.name}: ${part.role} The control loop reads sensors, computes a target and commands an actuator. This model uses prescribed joint angles, not physical simulation; motion does not establish stability or safety.`;
      setReply(
        `Live AI unavailable: ${formatError(e)}\n\nLocal learning note: ${local}`,
      );
    } finally {
      setAsking(false);
    }
  }
  return (
    <main
      className={`arise ${step === "imagine" ? "is-landing" : "is-workspace"}`}
    >
      {!loaded && (
        <div className="arise-loader" aria-label="Loading ARISE">
          <div className="loader-mark">
            <i />
            <i />
            <i />
          </div>
          <span>ARISE</span>
          <small>INITIALIZING POSSIBILITY</small>
        </div>
      )}
      <header className="arise-header">
        <button
          className="arise-wordmark"
          aria-label="ARISE home"
          onClick={() => {
            setStep("imagine");
            setTask("");
            setTaskStatus("idle");
            setError("");
          }}
        >
          ARISE<span>®</span>
        </button>
        <span className="header-caption">
          A ROBOTICS EXPLORATION
          <br />
          BY THE CURIOUS, FOR THE CURIOUS.
        </span>
        <div className="header-actions">
          <a className="header-simulation" href="/simulation">
            Simulation <ArrowUpRight size={15} />
          </a>
          <span className="local-status">
            <i />
            {health ? "LAB CONNECTED" : "LOCAL LAB"}
          </span>
          <button
            className="round-button"
            aria-label="Connection settings"
            onClick={() => setSettings(true)}
          >
            ···
          </button>
          <button
            className="pill-button"
            onClick={() =>
              document
                .getElementById("experience-panel")
                ?.scrollIntoView({ behavior: reduced ? "instant" : "smooth" })
            }
          >
            EXPLORE <ArrowUpRight size={15} />
          </button>
        </div>
      </header>
      {step !== "imagine" && (
        <div className="arise-stage">
          <Scene
            onAvailability={setRendering}
            kind={kind}
            assembling={assembling}
            replay={replay}
            exploded={exploded}
            wireframe={wireframe || (assembling && stage === 1)}
            selected={selected}
            onSelect={setSelected}
            task={task}
            taskStart={taskStart}
            cameraReset={cameraReset}
            reduced={reduced}
            onComplete={complete}
          />
          <div className="stage-shade" />
        </div>
      )}
      {step === "imagine" ? (
        <>
          <section className="landing-copy">
            <div className="overline">
              <i /> HUMAN CURIOSITY. MACHINE POSSIBILITY.
            </div>
            <h1>
              Give your
              <br />
              ideas <em>motion.</em>
            </h1>
            <p>
              Imagine it. Assemble it. Understand it.
              <br />A new dimension of learning robotics.
            </p>
          </section>
          <section className="landing-prompt" id="experience-panel">
            <div className="prompt-heading">
              <span>WHAT WILL YOU BRING TO LIFE?</span>
              <span>YOUR IDEA → YOUR LAB</span>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                build(prompt);
              }}
            >
              <label className="sr-only" htmlFor="arise-prompt">
                Describe your robot
              </label>
              <input
                id="arise-prompt"
                onFocus={prepareSimulation}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A humanoid. A drone. A little curiosity."
                maxLength={200}
                autoComplete="off"
              />
              <button aria-label="Build robot" type="submit">
                Build &amp; explore
                <ArrowUpRight size={25} />
              </button>
            </form>
            <p className="local-note">
              Instant local assembly · Optional NVIDIA Nemotron tutoring via
              Nebius
            </p>
            <a className="simulation-entry" href="/simulation">
              <span>
                <b>A RACK. A MODULE. A ROBOT.</b>
                <strong>Step inside the Simulation lab</strong>
                <small>Vera Rubin · Jetson Thor T5000 · Microduck</small>
              </span>
              <ArrowUpRight size={25} />
            </a>
          </section>
          <div className="landing-bottom">
            <span>ENGINEERED TO SPARK CURIOSITY</span>
            <span>
              IMAGINE <b>✛</b> EXPLORE <b>✛</b> UNDERSTAND
            </span>
            <span>EST. 2026</span>
          </div>
        </>
      ) : (
        <>
          <nav className="journey" aria-label="Learning workflow">
            {steps.map((s, i) => (
              <button
                key={s}
                className={step === s ? "active" : ""}
                disabled={
                  (assembling && s !== "assemble") ||
                  (s === "compute" && taskStatus !== "completed") ||
                  (s === "learn" && taskStatus !== "completed")
                }
                onClick={() => {
                  setStep(s);
                  setError("");
                }}
              >
                <small>0{i + 1}</small>
                {["Imagine", "Assemble", "Move", "Compute", "Understand"][i]}
              </button>
            ))}
          </nav>
          <div className="workspace-title">
            <div className="overline">{robot.subtitle}</div>
            <h1>
              {robot.name}
              <span> / 0{Object.keys(ROBOTS).indexOf(kind) + 1}</span>
            </h1>
            <p>
              {kind === "microduck"
                ? "Educational interpretation · Pollen Robotics / Hugging Face biped"
                : `${robot.parts.length} individual components · Procedural educational model`}
            </p>
          </div>
          <div
            className="scene-tools"
            role="group"
            aria-label="3D inspection controls"
          >
            <button
              aria-pressed={exploded}
              onClick={() => setExploded((v) => !v)}
              title="Exploded view"
            >
              <Layers3 size={17} />
              <span>Explode</span>
            </button>
            <button
              aria-pressed={wireframe}
              onClick={() => setWireframe((v) => !v)}
              title="Wireframe"
            >
              <ScanLine size={17} />
              <span>Wireframe</span>
            </button>
            <button
              onClick={() => setCameraReset((v) => v + 1)}
              title="Reset camera"
            >
              <Focus size={17} />
              <span>Reset</span>
            </button>
            <button
              onClick={() => {
                setAssembling(true);
                setStage(0);
                setReplay((r) => r + 1);
                setTask("");
                setTaskStatus("idle");
                setStep("assemble");
              }}
              title="Replay assembly"
            >
              <RotateCcw size={17} />
              <span>Replay</span>
            </button>
          </div>
          <section
            className="experience-panel"
            id="experience-panel"
            aria-label="Engineering workspace"
          >
            {step === "assemble" && (
              <>
                <div className="panel-eyebrow">
                  01 / FROM PARTS TO POSSIBILITY
                </div>
                <h2>
                  {assembling
                    ? "Becoming a machine."
                    : "Every part has a purpose."}
                </h2>
                <div className="assembly-progress" role="status">
                  <span>{STAGES[stage]}</span>
                  <span>
                    {assembling ? `${Math.round((stage / 6) * 100)}%` : "100%"}
                  </span>
                  <div>
                    <i
                      style={{
                        width: assembling
                          ? `${((stage + 1) / 6) * 100}%`
                          : "100%",
                      }}
                    />
                  </div>
                </div>
                <p>
                  Watch each part find its place. Then select a component to
                  discover what it does.
                </p>
                <ComponentList
                  parts={robot.parts}
                  selected={selected}
                  onSelect={setSelected}
                />
                <div className="part-explanation">
                  <small>SELECTED / {part.id}</small>
                  <h3>{part.name}</h3>
                  <p>{part.role}</p>
                </div>
                <button
                  className="primary-action"
                  disabled={assembling}
                  onClick={() => setStep("task")}
                >
                  Give it a task <ArrowRight size={17} />
                </button>
              </>
            )}
            {step === "task" && (
              <>
                <div className="panel-eyebrow">02 / INTENT INTO MOVEMENT</div>
                <h2>
                  A little motion.
                  <br />A lot to discover.
                </h2>
                <p>
                  Choose a demonstration or type one of the supported tasks.
                </p>
                <div className="task-options">
                  {robot.tasks.map((t) => (
                    <button
                      key={t}
                      disabled={taskStatus === "running"}
                      onClick={() => run(t)}
                      className={task === t ? "active" : ""}
                    >
                      {t}
                      <ArrowUpRight size={16} />
                    </button>
                  ))}
                </div>
                <form
                  className="task-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(taskInput);
                  }}
                >
                  <label className="sr-only" htmlFor="task-prompt">
                    Robot task
                  </label>
                  <input
                    id="task-prompt"
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    placeholder={`Try “${robot.tasks[0]}”`}
                    maxLength={100}
                  />
                  <button
                    disabled={taskStatus === "running"}
                    aria-label="Run task"
                  >
                    <ArrowRight size={18} />
                  </button>
                </form>
                <div className="task-report" role="status">
                  <span className="report-label">KINEMATIC DEMONSTRATION</span>
                  <h3>
                    {taskStatus === "idle"
                      ? "Ready when you are."
                      : taskStatus === "running"
                        ? `${task} — executing…`
                        : `${task} — completed`}
                  </h3>
                  {taskStatus !== "idle" && (
                    <>
                      <dl>
                        <div>
                          <dt>Duration</dt>
                          <dd>3 seconds</dd>
                        </div>
                        <div>
                          <dt>Controller</dt>
                          <dd>Smooth prescribed transforms</dd>
                        </div>
                        <div>
                          <dt>Motion</dt>
                          <dd>
                            {kind === "drone"
                              ? "Vertical offset 0–1 scene unit; rotor 30 rad/s"
                              : task === "Raise arm"
                                ? "Shoulder target −1.6 rad"
                                : task === "Wave"
                                  ? "Shoulder sweep + 0.28 rad oscillation"
                                  : task === "Nod"
                                    ? "Pitch ±0.25 rad"
                                    : task === "Leg articulation"
                                      ? "Hip ±0.35 rad"
                                      : "Yaw ±0.6 rad"}
                          </dd>
                        </div>
                      </dl>
                      <p>
                        {taskStatus === "completed"
                          ? "The programmed transformation reached its endpoint."
                          : "Applying the selected transform to the model."}{" "}
                        No dynamics, contact, thrust, balance or real-world
                        safety validation.
                      </p>
                    </>
                  )}
                </div>
                <button
                  className="primary-action"
                  disabled={taskStatus !== "completed"}
                  onClick={() => setStep("compute")}
                >
                  Find the right compute <ArrowRight size={17} />
                </button>
              </>
            )}
            {step === "compute" && (
              <>
                <div className="panel-eyebrow">
                  03 / THE INTELLIGENCE INSIDE
                </div>
                <h2>
                  Right-sized
                  <br />
                  for your idea.
                </h2>
                <p>
                  These are learning recommendations, not measured compatibility
                  or performance results.
                </p>
                <div className="hardware-feature">
                  <span>ONBOARD PERCEPTION / OPTIONAL</span>
                  <h3>
                    NVIDIA Jetson
                    <br />
                    Orin Nano
                  </h3>
                  <p>
                    A candidate for compact neural-network inference. A
                    dedicated microcontroller still handles real-time motor
                    control{kind === "drone" ? " and flight stabilization" : ""}
                    .
                  </p>
                  <a
                    href="https://docs.nvidia.com/jetson/orin-nano-devkit/user-guide/index.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Explore NVIDIA documentation ↗
                  </a>
                </div>
                <div className="compute-split">
                  <article>
                    <small>CPU + MICROCONTROLLER</small>
                    <p>Sensors, communication, scheduling and motor limits.</p>
                  </article>
                  <article>
                    <small>GPU</small>
                    <p>
                      Parallel neural inference, vision and supported simulation
                      workloads.
                    </p>
                  </article>
                </div>
                <details>
                  <summary>Memory, power & simulation</summary>
                  <p>
                    Model weights, activations and sensor buffers must fit
                    available memory. Check peak board power, voltage, cooling,
                    battery mass and runtime before integration. An RTX
                    workstation can run supported Isaac Sim / Isaac Lab
                    workflows; verify the current system requirements. This
                    browser scene is not Isaac Sim and does not benchmark
                    hardware.
                  </p>
                </details>
                {kind === "microduck" && (
                  <a
                    className="source-link"
                    href="https://huggingface.co/blog/nvidia/microduck-isaac-lab-sim-to-real"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Microduck identity & Isaac Lab reference ↗
                  </a>
                )}
                <button
                  className="primary-action"
                  onClick={() => setStep("learn")}
                >
                  Understand your machine <ArrowRight size={17} />
                </button>
              </>
            )}
            {step === "learn" && (
              <>
                <div className="panel-eyebrow">04 / CURIOSITY, REWARDED</div>
                <h2>
                  Go beneath
                  <br />
                  the surface.
                </h2>
                <details open>
                  <summary>Robot architecture</summary>
                  <ComponentList
                    parts={robot.parts}
                    selected={selected}
                    onSelect={setSelected}
                  />
                  <div className="part-explanation">
                    <h3>{part.name}</h3>
                    <p>{part.role}</p>
                  </div>
                </details>
                <details>
                  <summary>Assembly field guide</summary>
                  <ol>
                    {STAGES.map((s, i) => (
                      <li key={s}>
                        <strong>{s}</strong>
                        <p>
                          {
                            [
                              "Locate the parts around the assembly origin.",
                              "Inspect the geometry before materials are applied.",
                              "Connect the frame and load-bearing links.",
                              "Fit actuators, sensors and control electronics.",
                              "Inspect surfaces and identify the highlighted part.",
                              "Orbit the completed robot and check each component.",
                            ][i]
                          }
                        </p>
                      </li>
                    ))}
                  </ol>
                </details>
                <details>
                  <summary>Software architecture</summary>
                  <p>
                    Sensors → communication → state estimation → controller →
                    actuators. AI inference can supply perception or high-level
                    goals; the motor controller enforces local limits. Physical
                    simulation additionally needs masses, inertia, contact and
                    actuator models. This scene demonstrates kinematics only.
                  </p>
                </details>
                <details open>
                  <summary>Check your understanding</summary>
                  <div className="quiz">
                    {QUIZ.map((q, i) => (
                      <fieldset key={q.question}>
                        <legend>
                          {i + 1}. {q.question}
                        </legend>
                        {q.choices.map((choice, j) => (
                          <label key={choice}>
                            <input
                              type="radio"
                              name={`quiz-${i}`}
                              checked={answers[i] === j}
                              disabled={checked}
                              onChange={() =>
                                setAnswers((a) => ({ ...a, [i]: j }))
                              }
                            />
                            {choice}
                            {checked && j === q.answer && <Check size={14} />}
                          </label>
                        ))}
                        {checked && (
                          <p
                            className={
                              answers[i] === q.answer ? "correct" : "incorrect"
                            }
                          >
                            {answers[i] === q.answer ? "Correct. " : "Review. "}
                            {q.explanation}
                          </p>
                        )}
                      </fieldset>
                    ))}
                    {checked ? (
                      <>
                        <strong role="status">
                          Score:{" "}
                          {
                            QUIZ.filter((q, i) => answers[i] === q.answer)
                              .length
                          }{" "}
                          / {QUIZ.length}
                        </strong>
                        <button
                          className="secondary-action"
                          onClick={() => {
                            setChecked(false);
                            setAnswers({});
                          }}
                        >
                          Try again <RotateCcw size={14} />
                        </button>
                      </>
                    ) : (
                      <button
                        className="secondary-action"
                        disabled={Object.keys(answers).length !== QUIZ.length}
                        onClick={() => setChecked(true)}
                      >
                        Check answers <Check size={14} />
                      </button>
                    )}
                  </div>
                </details>
                <div className="ask-arise">
                  <div className="panel-eyebrow">
                    ASK ARISE / KEEP ASKING WHY
                  </div>
                  <form onSubmit={ask}>
                    <label className="sr-only" htmlFor="student-question">
                      Ask a robotics question
                    </label>
                    <input
                      id="student-question"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="What makes this robot move?"
                      maxLength={1200}
                    />
                    <button
                      disabled={asking || question.trim().length < 3}
                      aria-label="Ask ARISE"
                    >
                      <ArrowUpRight size={20} />
                    </button>
                  </form>
                  {asking && <p role="status">Asking the tutor…</p>}
                  {reply && (
                    <div className="tutor-reply" role="status">
                      <small>
                        {live
                          ? "LIVE AI RESPONSE"
                          : "LOCAL EXPLANATION · AI REQUEST DID NOT SUCCEED"}
                      </small>
                      <p>{reply}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
          <div className="viewport-caption">
            <span>
              <i />
              {!rendering
                ? "3D UNAVAILABLE / COMPONENT STUDY"
                : assembling
                  ? "ASSEMBLING"
                  : taskStatus === "running"
                    ? "MOTION IN PROGRESS"
                    : "LIVE 3D ENVIRONMENT"}
            </span>
            <span>DRAG TO ORBIT / SCROLL TO ZOOM</span>
          </div>
        </>
      )}
      {error && (
        <div className="arise-error" role="alert">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {settings && (
        <div className="modal-backdrop" onClick={() => setSettings(false)}>
          <section
            className="connection-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Connection settings"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Close settings"
              onClick={() => setSettings(false)}
            >
              <X size={20} />
            </button>
            <div className="panel-eyebrow">YOUR LOCAL LAB</div>
            <h2>Connected curiosity.</h2>
            <p>
              {health
                ? "Backend reachable."
                : "Backend unavailable. Local assembly, motion and learning work independently."}{" "}
              Live tutoring requires configured Nebius credentials and
              authorized lab access.
            </p>
            <label htmlFor="lab-token">Lab access token</label>
            <input
              id="lab-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
            />
            <button
              className="primary-action"
              onClick={() => {
                if (token.trim())
                  sessionStorage.setItem("lab-access-token", token.trim());
                else sessionStorage.removeItem("lab-access-token");
                setToken("");
                setSettings(false);
              }}
            >
              Save for this session <Check size={16} />
            </button>
            <p>
              No paid requests run automatically. Each tutor submission makes
              one request.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
function ComponentList({
  parts,
  selected,
  onSelect,
}: {
  parts: typeof ROBOTS.humanoid.parts;
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="component-pills" aria-label="Robot components">
      {parts.map((p) => (
        <button
          key={p.id}
          aria-pressed={selected === p.id}
          onClick={() => onSelect(p.id)}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}
