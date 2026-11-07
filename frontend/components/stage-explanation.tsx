"use client";

import { useEffect, useRef, useState } from "react";
import type { ConstructionStage } from "../lib/simulation-construction";
import type { Experience, ExperienceId } from "../lib/simulation-lessons";

const MODEL = "nvidia/nemotron-3-super-120b-a12b";
const ATTRIBUTION = "NVIDIA Nemotron 3 Super · served via Nebius Token Factory";
type StageText = Pick<ConstructionStage, "see" | "how" | "why" | "terms">;
type Evidence = {
  model: string;
  request_id: string | null;
  completion_id: string | null;
  timestamp: string;
  provider_timestamp: string | null;
  latency_ms: number;
};
type Generated = {
  source: "live" | "cached";
  data: StageText;
  evidence: Evidence;
};

function verified(value: unknown): value is Generated {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<Generated>;
  return (
    (result.source === "live" || result.source === "cached") &&
    result.evidence?.model === MODEL &&
    Number.isFinite(result.evidence.latency_ms) &&
    result.evidence.latency_ms >= 0 &&
    Number.isFinite(Date.parse(result.evidence.timestamp)) &&
    typeof result.data?.see === "string" &&
    typeof result.data.how === "string" &&
    typeof result.data.why === "string" &&
    Array.isArray(result.data.terms) &&
    result.data.terms.every(
      (term) =>
        Array.isArray(term) &&
        term.length === 2 &&
        term.every((text) => typeof text === "string"),
    )
  );
}

/** Scoped by scene/stage key in the parent; late responses cannot label another stage. */
export default function StageExplanation({
  scene,
  stage,
  experience,
  playing,
  onPause,
}: {
  scene: ExperienceId;
  stage: ConstructionStage;
  experience: Experience;
  playing: boolean;
  onPause: () => void;
}) {
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);

  async function explain() {
    if (pending.current) return;
    // Hold the selected stage for reading; construction never waits on AI by itself.
    onPause();
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    setError("");
    setGenerated(null);
    const timeout = window.setTimeout(
      () => controller.abort("timeout"),
      95_000,
    );
    try {
      const token = sessionStorage.getItem("lab-access-token");
      const response = await fetch("/api/simulation/explain", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-Lab-Token": token } : {}),
        },
        signal: controller.signal,
        body: JSON.stringify({
          scene,
          stage_id: stage.id,
          stage_title: stage.title,
          system_name: experience.name,
          scope_note: stage.concept
            ? `General semiconductor concept, not NVIDIA's exact manufacturing process or private layout. ${experience.note}`
            : experience.note,
          explanation: {
            see: stage.see,
            how: stage.how,
            why: stage.why,
            terms: stage.terms,
          },
          facts: experience.facts,
          sources: experience.sources.map((source) => source.url),
        }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const detail =
          result &&
          typeof result === "object" &&
          "detail" in result &&
          typeof result.detail === "string"
            ? result.detail
            : `The explanation service returned HTTP ${response.status}.`;
        throw new Error(detail);
      }
      if (!verified(result))
        throw new Error(
          "No validated response from the requested model was received.",
        );
      if (!controller.signal.aborted) setGenerated(result);
    } catch (cause) {
      if (
        !controller.signal.aborted ||
        controller.signal.reason === "timeout"
      ) {
        setError(
          controller.signal.reason === "timeout"
            ? "The request timed out; its outcome is unknown. No automatic retry was sent."
            : cause instanceof Error
              ? cause.message
              : "The explanation service could not be reached.",
        );
      }
    } finally {
      window.clearTimeout(timeout);
      if (!controller.signal.aborted || controller.signal.reason === "timeout")
        setLoading(false);
      if (pending.current === controller) pending.current = null;
    }
  }

  const text = generated?.data ?? stage;
  return (
    <div className="sim-stage-explanation">
      <div className="sim-ai-provenance" aria-live="polite" aria-atomic="true">
        <strong>
          {generated ? ATTRIBUTION : "Fallback · built-in stage explanation"}
        </strong>
        <p>
          {loading
            ? "Requesting an explanation for this stage. The built-in fallback remains below."
            : generated
              ? generated.source === "cached"
                ? "Previously generated response · original verification details retained."
                : "Live response verified against the requested model."
              : "This text is local educational content; no successful model response is being claimed."}
        </p>
        {error && <p className="sim-ai-error">{error}</p>}
        {!generated && (
          <button onClick={explain} disabled={loading}>
            {loading
              ? "Generating explanation…"
              : playing
                ? "Pause & explain this stage"
                : "Explain this stage with NVIDIA"}
          </button>
        )}
        {generated && (
          <details className="sim-ai-evidence">
            <summary>Response verification</summary>
            <dl>
              <div>
                <dt>Returned model</dt>
                <dd>{generated.evidence.model}</dd>
              </div>
              <div>
                <dt>Request ID</dt>
                <dd>
                  {generated.evidence.request_id || "Not supplied by provider"}
                </dd>
              </div>
              <div>
                <dt>Completion ID</dt>
                <dd>
                  {generated.evidence.completion_id ||
                    "Not supplied by provider"}
                </dd>
              </div>
              <div>
                <dt>Verified at (UTC)</dt>
                <dd>
                  <time dateTime={generated.evidence.timestamp}>
                    {generated.evidence.timestamp}
                  </time>
                </dd>
              </div>
              {generated.evidence.provider_timestamp && (
                <div>
                  <dt>Provider timestamp (UTC)</dt>
                  <dd>{generated.evidence.provider_timestamp}</dd>
                </div>
              )}
              <div>
                <dt>API round-trip latency</dt>
                <dd>
                  {(generated.evidence.latency_ms / 1000).toFixed(2)} seconds
                  {generated.source === "cached" ? " (original request)" : ""}
                </dd>
              </div>
            </dl>
          </details>
        )}
      </div>
      <section>
        <h2>What you’re seeing</h2>
        <p>{text.see}</p>
      </section>
      <section>
        <h2>How it works</h2>
        <p>{text.how}</p>
      </section>
      <section>
        <h2>Why it matters</h2>
        <p>{text.why}</p>
      </section>
      <div className="sim-vocabulary">
        <h3>A few useful words</h3>
        <dl>
          {text.terms.map(([word, definition]) => (
            <div key={word}>
              <dt>{word}</dt>
              <dd>{definition}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
