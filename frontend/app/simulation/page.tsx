"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Focus,
  Layers3,
  Pause,
  Play,
  Plus,
  Minus,
  RotateCcw,
  ScanLine,
} from "lucide-react";
import {
  EXPERIENCE_IDS,
  EXPERIENCES,
  type ExperienceId,
} from "../../lib/simulation-lessons";
import { useMotionPreference } from "../../lib/use-motion-preference";
import "./simulation.css";

const Scene = dynamic(() => import("../../components/simulation-scene"), {
  ssr: false,
  loading: () => (
    <p className="sim-scene-loading">Preparing your 3D workspace…</p>
  ),
});
const STEP_SECONDS = 14;

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
  const [kind, setKind] = useState<ExperienceId | null>(null),
    [step, setStep] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1),
    [progress, setProgress] = useState(0);
  const [reset, setReset] = useState(0),
    [zoom, setZoom] = useState(0),
    [explode, setExplode] = useState(false),
    [wireframe, setWireframe] = useState(false),
    [inspecting, setInspecting] = useState("");
  const elapsed = useRef(0),
    time = useRef(0),
    reduced = useMotionPreference();
  useEffect(() => {
    const read = () => {
      const value = new URLSearchParams(location.search).get("scene");
      setKind(
        EXPERIENCE_IDS.includes(value as ExperienceId)
          ? (value as ExperienceId)
          : null,
      );
      setStep(0);
      setPlaying(false);
      elapsed.current = 0;
      time.current = 0;
      setProgress(0);
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);
  useEffect(() => {
    if (!playing || !kind) return;
    let handle = 0,
      last = performance.now(),
      lastPaint = 0;
    const tick = (now: number) => {
      const delta = document.hidden
        ? 0
        : Math.min((now - last) / 1000, 0.25) * speed;
      last = now;
      elapsed.current += delta;
      time.current += delta;
      if (now - lastPaint > 90) {
        setProgress(Math.min(1, elapsed.current / STEP_SECONDS));
        lastPaint = now;
      }
      if (elapsed.current >= STEP_SECONDS) {
        if (step < EXPERIENCES[kind].steps.length - 1) {
          elapsed.current = 0;
          setProgress(0);
          setStep((s) => s + 1);
          setInspecting("");
        } else {
          setProgress(1);
          setPlaying(false);
        }
        return;
      }
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [playing, speed, kind, step]);
  function choose(id: ExperienceId | null) {
    setKind(id);
    setStep(0);
    setPlaying(false);
    setProgress(0);
    elapsed.current = 0;
    time.current = 0;
    setExplode(false);
    setWireframe(false);
    setInspecting("");
    setReset((n) => n + 1);
    history.pushState(null, "", id ? `/simulation?scene=${id}` : "/simulation");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function move(next: number, reveal = false) {
    setStep(next);
    setPlaying(false);
    elapsed.current = 0;
    time.current = 0;
    setProgress(0);
    setInspecting("");
    if (reveal)
      document
        .querySelector(".sim-current-step")
        ?.scrollIntoView({
          behavior: reduced ? "instant" : "smooth",
          block: "start",
        });
  }
  const experience = kind ? EXPERIENCES[kind] : null,
    current = experience?.steps[step];
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
                      onClick={() => choose(id)}
                      aria-label={`Start ${e.name} simulation`}
                    >
                      Start Simulation <ArrowUpRight size={19} />
                    </button>
                    <span className="sim-card-count">
                      {e.steps.length} guided steps · Orbit & zoom
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
                    STEP {String(step + 1).padStart(2, "0")} /{" "}
                    {experience.steps.length}
                  </b>
                </span>
                <h1>{current.title}</h1>
                <p>{current.caption}</p>
              </div>
              <div className="sim-viewport">
                <Scene
                  key={kind}
                  kind={kind}
                  step={step}
                  time={time}
                  reduced={reduced}
                  reset={reset}
                  wireframe={wireframe}
                  explode={explode}
                  zoom={zoom}
                  onInspect={setInspecting}
                />
                <div className="sim-live">
                  <i /> LIVE 3D / EDUCATIONAL MODEL
                </div>
              </div>
              <div className="sim-viewport-caption">
                <span>
                  {inspecting
                    ? `INSPECTING / ${inspecting}`
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
                  onClick={() => setExplode((v) => !v)}
                  aria-pressed={explode}
                >
                  <Layers3 size={16} /> Explode
                </button>
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
              <div
                className="sim-playback"
                role="group"
                aria-label="Walkthrough playback"
              >
                <button
                  disabled={step === 0}
                  onClick={() => move(step - 1)}
                  aria-label="Previous step"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  className="sim-play-button"
                  onClick={() => {
                    if (progress === 1 && step === experience.steps.length - 1)
                      move(0);
                    setPlaying((v) => !v);
                  }}
                  aria-label={
                    playing ? "Pause walkthrough" : "Play walkthrough"
                  }
                >
                  {playing ? <Pause size={17} /> : <Play size={17} />}{" "}
                  {playing ? "Pause" : "Play"}
                </button>
                <button
                  disabled={step === experience.steps.length - 1}
                  onClick={() => move(step + 1)}
                  aria-label="Next step"
                >
                  <ChevronRight size={20} />
                </button>
                <button
                  onClick={() => {
                    move(0);
                    setReset((n) => n + 1);
                  }}
                  className="sim-restart"
                >
                  <RotateCcw size={16} /> Restart
                </button>
                <label className="sim-speed">
                  Speed
                  <select
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    aria-label="Playback speed"
                  >
                    <option value={1}>1×</option>
                    <option value={2}>2×</option>
                    <option value={4}>4×</option>
                  </select>
                </label>
              </div>
              <div className="sim-timeline">
                <progress
                  value={(step + progress) / experience.steps.length}
                  max={1}
                  aria-label="Walkthrough progress"
                />
                <span>
                  {playing
                    ? `Playing · ${speed}×`
                    : "Paused · explore at your pace"}
                </span>
                <span>
                  {step + 1} of {experience.steps.length}
                </span>
              </div>
              <nav className="sim-chapters" aria-label="Simulation steps">
                {experience.steps.map((s, i) => (
                  <button
                    key={s.title}
                    onClick={() => move(i, true)}
                    aria-current={step === i ? "step" : undefined}
                  >
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    {s.title}
                    {i < step && <span className="sim-visited">↗</span>}
                  </button>
                ))}
              </nav>
            </section>
            <aside
              className="sim-explanation"
              aria-label="Current step explanation"
            >
              <span className="sim-kicker">THE IDEA, EXPLAINED</span>
              <section>
                <h2>What you’re seeing</h2>
                <p>{current.see}</p>
              </section>
              <section>
                <h2>How it works</h2>
                <p>{current.how}</p>
              </section>
              <section>
                <h2>Why it matters</h2>
                <p>{current.why}</p>
              </section>
              <div className="sim-vocabulary">
                <h3>A few useful words</h3>
                <dl>
                  {current.terms.map(([word, definition]) => (
                    <div key={word}>
                      <dt>{word}</dt>
                      <dd>{definition}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              {step === experience.steps.length - 1 && (
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
