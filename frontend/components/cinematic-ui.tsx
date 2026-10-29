"use client";
import { useEffect } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
} from "lucide-react";
import { useCinema, type CinemaPhase } from "../lib/cinema";
import { useLab } from "../lib/store";
import { useMotionPreference } from "../lib/use-motion-preference";
export function CinematicOverlay() {
  const phase = useCinema((s) => s.phase),
    entered = useLab((s) => s.entered),
    robot = useLab((s) => s.robot),
    reduced = useMotionPreference();
  useEffect(() => {
    if (reduced && !entered && useCinema.getState().phase === "intro") {
      useCinema.getState().start("prompt");
      useCinema.getState().set({ paused: true });
    }
  }, [reduced, entered]);
  if (entered) return null;
  const jump = (p: CinemaPhase) => {
    useCinema.getState().start(p, useLab.getState().assembly.length);
    // A chapter preview is an inspection point; playback is an explicit action.
    useCinema.getState().set({
      paused: true,
      time: p === "intro" ? 1.5 : p === "transform" ? 5 : 0,
    });
  };
  return (
    <>
      <div className={`cinema-copy cinema-copy-${phase}`}>
        {phase === "intro" && (
          <>
            <div className="eyebrow">A NEW WAY TO UNDERSTAND MACHINES</div>
            <h1 className="intro-arise">ARISE</h1>
            <p className="arise-tagline">
              THE FUTURE OF KNOWLEDGE AND UNDERSTANDING IN A SINGLE PROMPT
            </p>
            <p>
              One spark. A thousand possibilities.
              <br />
              An engineering world waiting to unfold.
            </p>
            <div className="intro-actions">
              <button
                onClick={() => {
                  useCinema.getState().start("prompt");
                  document
                    .getElementById("robot-prompt")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              >
                BEGIN CREATION <ArrowUpRight size={18} />
              </button>
              <button
                onClick={() =>
                  useLab.getState().set({ entered: true, section: "design" })
                }
              >
                EXPLORE ARISE <ArrowUpRight size={18} />
              </button>
            </div>
            <span className="guide-disclaimer">
              ORIGINAL ARISE GUIDE / ILLUSTRATIVE AVATAR
            </span>
          </>
        )}
        {phase === "prompt" && (
          <>
            <div className="eyebrow">01 — THE IDEA IS YOURS</div>
            <h1>
              WHAT IF
              <br />
              BECOMES
              <br />
              <span>WHAT’S NEXT.</span>
            </h1>
            <p>
              Describe a machine. Follow the thought.
              <br />
              Discover the engineering behind it.
            </p>
            <ArrowDown size={20} />
          </>
        )}
        {phase === "transform" && (
          <>
            <div className="eyebrow">02 — AN IDEA TAKES SHAPE</div>
            <h1>
              NOT MAGIC.
              <br />
              <span>MECHANICS.</span>
            </h1>
            <p>
              Each component belongs to your robot.
              <br />
              Every connection has a purpose.
            </p>
            <span className="cinema-fact">
              SPECIFICATION → DEPENDENCIES → ASSEMBLY
            </span>
            <AssemblyReadout />
          </>
        )}
      </div>
      {phase === "reveal" && (
        <div className="arise-reveal" role="status">
          <p>IDEAS BECOME MACHINES.</p>
          <strong>ARISE</strong>
          <button
            onClick={() =>
              useLab.getState().set({ entered: true, section: "design" })
            }
          >
            Enter your engineering world <ArrowUpRight size={20} />
          </button>
        </div>
      )}
      <div className="cinema-chapters" aria-label="Cinematic chapters">
        {(["intro", "prompt", "transform", "reveal"] as const).map((p, i) => (
          <button
            key={p}
            aria-label={`Preview ${p} sequence`}
            aria-pressed={phase === p}
            onClick={() => jump(p)}
            disabled={(p === "transform" || p === "reveal") && !robot}
          >
            <span>0{i + 1}</span>
            {["Spark", "Imagine", "Construct", "ARISE"][i]}
          </button>
        ))}
      </div>
      <CinematicTransport />
    </>
  );
}
function AssemblyReadout() {
  const time = useCinema((s) => s.time);
  const robot = useLab((s) => s.robot),
    steps = useLab((s) => s.assembly);
  const index = Math.max(
    0,
    Math.min(steps.length - 1, Math.floor((time - 3.1) / 0.6)),
  );
  const step = steps[index];
  const parts =
    robot?.components.filter((c) => step?.component_ids.includes(c.id)) || [];
  return (
    <div className="assembly-readout" aria-label="Current assembly components">
      <span className="eyebrow">
        {time < 2.6
          ? "THE SPHERE BECOMES YOUR DESIGN"
          : `ASSEMBLY ${index + 1} / ${steps.length}`}
      </span>
      <strong>{parts[0]?.name}</strong>
      {parts.length > 1 && (
        <small>+ {parts.length - 1} connected components in this stage</small>
      )}
      <p>{parts[0]?.function}</p>
    </div>
  );
}
function CinematicTransport() {
  const { phase, time, duration, paused, rate, set, start, seek } = useCinema();
  return (
    <div className="cinema-transport" aria-label="Cinematic playback">
      <button
        aria-label={paused ? "Play cinematic" : "Pause cinematic"}
        onClick={() => set({ paused: !paused })}
      >
        {paused ? <Play size={14} /> : <Pause size={14} />}
      </button>
      <button
        aria-label="Replay cinematic sequence"
        onClick={() => start(phase, useLab.getState().assembly.length)}
      >
        <RotateCcw size={14} />
      </button>
      {duration > 0 && (
        <input
          type="range"
          aria-label="Cinematic timeline"
          min={0}
          max={duration}
          step={0.05}
          value={time}
          onChange={(e) => seek(+e.target.value)}
        />
      )}
      <span>
        {time.toFixed(1)} / {duration || "∞"} s
      </span>
      <select
        aria-label="Cinematic speed"
        value={rate}
        onChange={(e) => set({ rate: +e.target.value })}
      >
        {[0.5, 1, 2].map((r) => (
          <option key={r} value={r}>
            {r}×
          </option>
        ))}
      </select>
      <button
        aria-label="Skip cinematic"
        onClick={() => {
          if (phase === "intro") start("prompt");
          else useLab.getState().set({ entered: true, section: "design" });
        }}
      >
        <SkipForward size={14} />
      </button>
    </div>
  );
}
