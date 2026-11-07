"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Focus,
  Plus,
  Minus,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
} from "lucide-react";
import {
  EXPERIENCE_IDS,
  EXPERIENCES,
  type ExperienceId,
} from "../../lib/simulation-lessons";
import { useMotionPreference } from "../../lib/use-motion-preference";
import StageExplanation from "../../components/stage-explanation";
import { SHOTS } from "../../lib/simulation-direction";
import {
  CONSTRUCTION,
  constructionAt,
  constructionPartStage,
} from "../../lib/simulation-construction";
import "./simulation.css";

const warmScene = () => {
  void import("../../components/simulation-scene").catch(() => {});
};
const Scene = dynamic(() => import("../../components/simulation-scene"), {
  ssr: false,
  loading: () => (
    <p className="sim-scene-loading">Preparing your 3D workspace…</p>
  ),
});

function Glyph({ kind }: { kind: ExperienceId }) {
  return (
    <svg viewBox="0 0 400 220" aria-hidden="true" className="sim-glyph">
      <defs>
        <linearGradient id={`metal-${kind}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#87977c" />
          <stop offset="1" stopColor="#19241b" />
        </linearGradient>
      </defs>
      <ellipse cx="200" cy="198" rx="126" ry="12" fill="#000" opacity=".4" />
      {kind === "rubin" ? (
        <g transform="translate(135 15)">
          <path
            d="M0 10 110 0 130 13 130 182 20 195 0 182Z"
            fill={`url(#metal-${kind})`}
          />
          <path d="M12 20 109 12 109 174 12 183Z" fill="#101a12" />
          {Array.from({ length: 12 }, (_, i) => (
            <g key={i} transform={`translate(17 ${26 + i * 12})`}>
              <path
                d="m0 0 86-7v8L0 8Z"
                fill={i % 3 === 0 ? "#667a51" : "#344332"}
              />
              <path d="m4 2 4-.3v2L4 4Z" fill="#c2f581" />
            </g>
          ))}
          <path d="M119 23v140" stroke="#94bd6c" strokeWidth="3" />
        </g>
      ) : kind === "thor" ? (
        <g transform="translate(200 105) rotate(-20)">
          <path
            d="M-115-45 90-45 119 9 115 65-90 65-119 10Z"
            fill="#263e2a"
            stroke="#60734c"
          />
          <rect
            x="-67"
            y="-27"
            width="127"
            height="70"
            rx="5"
            fill={`url(#metal-${kind})`}
          />
          <rect x="-40" y="-14" width="34" height="38" fill="#bec5a5" />
          <rect x="4" y="-14" width="37" height="38" fill="#8ab85a" />
          {[-1, 1].flatMap((x) =>
            [-1, 1].map((y) => (
              <rect
                key={`${x}${y}`}
                x={x * 83 - 13}
                y={y * 25 - 12}
                width="26"
                height="24"
                rx="2"
                fill="#718169"
              />
            )),
          )}
          {Array.from({ length: 18 }, (_, i) => (
            <path
              key={i}
              d={`M${-82 + i * 10} 65v7`}
              stroke="#c5bb83"
              strokeWidth="3"
            />
          ))}
        </g>
      ) : (
        <g transform="translate(200 108)">
          <path
            d="M-28 27-35 70-27 82M28 27 35 70 27 82"
            fill="none"
            stroke="#adb69f"
            strokeWidth="14"
          />
          <path
            d="M-40 86h33M13 86h33"
            stroke="#748764"
            strokeWidth="13"
            strokeLinecap="round"
          />
          <rect
            x="-35"
            y="-18"
            width="70"
            height="58"
            rx="13"
            fill={`url(#metal-${kind})`}
          />
          <path d="M0-20v-15" stroke="#91ad71" strokeWidth="12" />
          <rect
            x="-51"
            y="-76"
            width="102"
            height="51"
            rx="14"
            fill={`url(#metal-${kind})`}
          />
          <rect x="-40" y="-62" width="80" height="22" rx="8" fill="#0b1911" />
          <circle cx="-23" cy="-50" r="6" fill="#bee797" />
          <circle cx="23" cy="-50" r="6" fill="#bee797" />
          <path d="m-20-29 40 0 4 17-48 0Z" fill="#abc874" />
          <circle cx="-34" cy="53" r="9" fill="#8aac61" />
          <circle cx="34" cy="53" r="9" fill="#8aac61" />
        </g>
      )}
    </svg>
  );
}

export default function SimulationPage() {
  const [kind, setKind] = useState<ExperienceId | null>(null);
  const [stageIndex, setStageIndex] = useState(0),
    [speed, setSpeed] = useState<1 | 2 | 3>(1),
    [playing, setPlaying] = useState(true),
    [ready, setReady] = useState(false),
    [revision, setRevision] = useState(0),
    [reset, setReset] = useState(0),
    [zoom, setZoom] = useState(0),
    [wireframe, setWireframe] = useState(false),
    [inspection, setInspection] = useState("");
  const time = useRef(0),
    stageRef = useRef(0),
    reduced = useMotionPreference();
  const explanationPane = useRef<HTMLElement>(null);
  useEffect(() => {
    explanationPane.current?.scrollTo({ top: 0 });
  }, [stageIndex, inspection]);
  const onReady = useCallback(() => setReady(true), []);
  const restart = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    time.current = 0;
    stageRef.current = 0;
    setStageIndex(0);
    setPlaying(true);
    setInspection("");
    setZoom(0);
    setReset((n) => n + 1);
    setRevision((n) => n + 1);
  }, []);
  useEffect(() => {
    const read = () => {
      const value = new URLSearchParams(location.search).get("scene");
      setKind(
        EXPERIENCE_IDS.includes(value as ExperienceId)
          ? (value as ExperienceId)
          : null,
      );
      setReady(false);
      setWireframe(false);
      restart();
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [restart]);
  useEffect(() => {
    if (!kind || !ready || !playing) return;
    let handle = 0,
      last = performance.now();
    const tick = (now: number) => {
      // Background tabs cannot skip the reader past unseen construction stages.
      const delta = document.hidden
        ? 0
        : Math.max(0, Math.min((now - last) / 1000, 0.1));
      last = now;
      time.current += delta * speed;
      const next = constructionAt(kind, time.current);
      if (next !== stageRef.current) {
        stageRef.current = next;
        setStageIndex(next);
        setInspection("");
      }
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [kind, ready, revision, playing, speed]);
  function choose(id: ExperienceId | null) {
    if (id === kind) {
      restart();
      return;
    }
    if (id) warmScene();
    setKind(id);
    setReady(false);
    setWireframe(false);
    restart();
    history.pushState(null, "", id ? `/simulation?scene=${id}` : "/simulation");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function inspect(id: string) {
    setInspection(id);
  }
  const experience = kind ? EXPERIENCES[kind] : null;
  const stages = kind ? CONSTRUCTION[kind] : [];
  const current = stages[stageIndex];
  const working = !!current?.working;
  const selectedStage = kind ? constructionPartStage(kind, inspection) : -1;
  const explanation = selectedStage > 0 ? stages[selectedStage] : current;
  const shotIndex =
    working && selectedStage > 0 ? explanation.shot : (current?.shot ?? 0);
  const shot = kind ? SHOTS[kind][shotIndex] : null;
  const focus =
    working && selectedStage > 0 ? explanation.focus : (current?.focus ?? "");
  const inspectable = stages.filter(
    (s, i) => i > 0 && i <= stageIndex && !s.concept && !s.working,
  );
  return (
    <main className="sim-page">
      <header className="arise-header sim-header">
        <a href="/" className="arise-wordmark" aria-label="ARISE home">
          ARISE<span>®</span>
        </a>
        <span className="header-caption">
          LOOK CLOSER.
          <br />
          UNDERSTAND MORE.
        </span>
        <nav aria-label="Main navigation">
          <a href="/">Robot lab</a>
          <button
            onClick={() => choose(null)}
            aria-current={!kind ? "page" : undefined}
          >
            Simulation <span className="sim-nav-dot" />
          </button>
        </nav>
      </header>
      {!kind || !experience || !current ? (
        <>
          <section className="sim-hub-heading">
            <div className="overline">
              <i /> ARISE / SIMULATION
            </div>
            <h1>
              Big ideas.
              <br />
              <em>Made understandable.</em>
            </h1>
            <p>
              Three independent worlds of engineering.
              <br />
              Look inside. Move around. Learn one connection at a time.
            </p>
          </section>
          <section className="sim-hub-grid" aria-label="Choose a simulation">
            {EXPERIENCE_IDS.map((id, i) => {
              const e = EXPERIENCES[id];
              return (
                <article className="sim-card" key={id}>
                  <div className="sim-card-visual">
                    <span>
                      0{i + 1} / {e.scale}
                    </span>
                    <Glyph kind={id} />
                    <small>ORIGINAL EDUCATIONAL MODEL</small>
                  </div>
                  <div className="sim-card-body">
                    <span className="sim-kicker">{e.category}</span>
                    <h2>{e.name}</h2>
                    <p>{e.description}</p>
                    <button
                      onPointerEnter={warmScene}
                      onFocus={warmScene}
                      onClick={() => choose(id)}
                      aria-label={`Start ${e.name} simulation`}
                    >
                      Start Simulation <ArrowUpRight size={19} />
                    </button>
                    <span className="sim-card-count">
                      {CONSTRUCTION[id].length - 2} construction stages · Orbit
                      & zoom
                    </span>
                  </div>
                </article>
              );
            })}
          </section>
          <footer className="sim-hub-footer">
            <span className="sim-kicker">A RACK. A MODULE. A ROBOT.</span>
            <p>
              Different systems, different purposes. These experiences do not
              imply that the devices are physically connected.
            </p>
            <a href="/">
              Back to the robot lab <ArrowUpRight size={15} />
            </a>
          </footer>
        </>
      ) : (
        <section className="sim-workspace">
          <div className="sim-breadcrumb">
            <button onClick={() => choose(null)}>
              <ArrowLeft size={15} /> All simulations
            </button>
            <span>{experience.category}</span>
            <span>0{EXPERIENCE_IDS.indexOf(kind) + 1} / 03</span>
          </div>
          <div className="sim-workspace-grid">
            <section
              className="sim-scene-column"
              aria-label={`${experience.name} simulation`}
            >
              <div className="sim-current-step" aria-live="polite">
                <span className="sim-kicker">
                  {experience.name}{" "}
                  <b>
                    {working
                      ? "CONSTRUCTION COMPLETE"
                      : `STAGE ${String(stageIndex).padStart(2, "0")} / ${stages.length - 2}`}
                  </b>
                </span>
                <h1>{current.title}</h1>
                <p>{current.caption}</p>
              </div>
              <div
                className="sim-motion-controls"
                role="group"
                aria-label="Simulation playback"
              >
                <button
                  className="sim-pause-button"
                  disabled={!ready}
                  onClick={() => setPlaying((value) => !value)}
                  aria-label={
                    playing ? "Pause simulation" : "Resume simulation"
                  }
                >
                  {playing ? <Pause size={16} /> : <Play size={16} />}
                  {playing ? "Pause" : "Resume"}
                </button>
                <div
                  className="sim-speed-options"
                  role="group"
                  aria-label="Simulation speed"
                >
                  <span aria-hidden="true">Speed</span>
                  {([1, 2, 3] as const).map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setSpeed(rate)}
                      aria-label={`${rate}× speed`}
                      aria-pressed={speed === rate}
                    >
                      {rate}×
                    </button>
                  ))}
                </div>
              </div>
              <div className="sim-viewport">
                <div className="sim-shot-heading">
                  {working && inspection
                    ? `Attached assembly / ${explanation.title}`
                    : shot?.view}
                </div>
                <Scene
                  key={kind}
                  kind={kind}
                  step={shotIndex}
                  time={time}
                  building={!working}
                  playing={playing}
                  reduced={reduced}
                  reset={reset}
                  wireframe={wireframe}
                  activeBuildPart={current.focus}
                  stageIndex={stageIndex}
                  focus={focus}
                  inspection={inspection}
                  onReady={onReady}
                  zoom={zoom}
                  onInspect={inspect}
                />
                <div className="sim-live">
                  <i /> LIVE 3D / EDUCATIONAL MODEL
                </div>
                {shot?.signal && (working || current.concept) && (
                  <div className="sim-flow-legend">
                    {shot.signal}
                    {reduced ? " / Reduced motion: static signals" : ""}
                  </div>
                )}
              </div>
              <div className="sim-viewport-caption">
                <span>
                  {inspection
                    ? `INSPECTING / ${explanation.title}`
                    : "DRAG TO ORBIT · SCROLL OR PINCH TO ZOOM · CLICK A PART"}
                </span>
                <span>{reduced ? "REDUCED MOTION" : "REAL-TIME GEOMETRY"}</span>
              </div>
              <div
                className="sim-view-tools"
                role="group"
                aria-label="3D inspection controls"
              >
                <button
                  onClick={() => setWireframe((v) => !v)}
                  aria-pressed={wireframe}
                >
                  <ScanLine size={16} /> Wireframe
                </button>
                <button
                  onClick={() => setZoom((z) => z + 1)}
                  aria-label="Zoom in"
                >
                  <Plus size={17} />
                </button>
                <button
                  onClick={() => setZoom((z) => z - 1)}
                  aria-label="Zoom out"
                >
                  <Minus size={17} />
                </button>
                <button onClick={() => setReset((n) => n + 1)}>
                  <Focus size={16} /> Reset view
                </button>
              </div>
              <div className="sim-construction-status" role="status">
                <span>
                  {!ready
                    ? "Preparing the stage"
                    : !playing
                      ? `Paused / ${current.title}`
                      : working
                        ? "Assembly complete / working example active"
                        : current.concept
                          ? "General semiconductor concepts"
                          : `Constructing / ${stageIndex} of ${stages.length - 2} stages`}
                </span>
                <button onClick={restart}>
                  <RotateCcw size={16} /> Restart construction
                </button>
              </div>
              <section
                className="sim-inspection"
                aria-label="Inspect attached components"
              >
                <p>Inspect attached components</p>
                {inspectable.length === 0 ? (
                  <p className="sim-inspection-hint">
                    Parts become available here as they attach.
                  </p>
                ) : (
                  <div className="sim-chapters">
                    {inspectable.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => inspect(s.focus)}
                        aria-pressed={inspection === s.focus}
                      >
                        <span aria-hidden="true">✓</span>
                        {s.title}
                      </button>
                    ))}
                  </div>
                )}
                {working && inspection && (
                  <button
                    className="sim-return-example"
                    onClick={() => setInspection("")}
                  >
                    Return to working example <ArrowRight size={15} />
                  </button>
                )}
              </section>
            </section>
            <aside
              className="sim-explanation"
              ref={explanationPane}
              aria-label="Current step explanation"
              tabIndex={0}
            >
              <span className="sim-kicker">THE IDEA, EXPLAINED</span>
              <h2 className="sim-explanation-stage">{explanation.title}</h2>
              <p className="sim-representation">
                {current.concept
                  ? "General concept / not NVIDIA manufacturing or chip layout"
                  : kind === "rubin"
                    ? "Educational rack schematic / illustrative internals"
                    : kind === "thor"
                      ? "Educational module view / illustrative internal layout"
                      : "Original robot model / illustrative internals"}
              </p>
              <StageExplanation
                key={`${kind}/${explanation.id}`}
                scene={kind}
                stage={explanation}
                experience={experience}
                playing={playing}
                onPause={() => setPlaying(false)}
              />
              {working && (
                <section className="sim-takeaways">
                  <h2>Take it with you.</h2>
                  <ul>
                    {experience.takeaways.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  <button onClick={() => choose(null)}>
                    Explore another system <ArrowRight size={17} />
                  </button>
                </section>
              )}
            </aside>
          </div>
          <section
            className="sim-context"
            aria-label="Model provenance and official sources"
          >
            <div className="sim-facts">
              {experience.facts.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <p>{experience.note}</p>
            <div className="sim-sources">
              <span>MANUFACTURER REFERENCES</span>
              {experience.sources.map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.title}
                  <ArrowUpRight size={14} />
                </a>
              ))}
            </div>
          </section>
        </section>
      )}
    </main>
  );
}
