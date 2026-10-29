"use client";
import {
  hardwareFamilies,
  documentedExamples,
  hardwareCheckedAt,
  computeConcepts,
} from "../lib/hardware-atlas";
import { useLab } from "../lib/store";
import { ArrowUpRight } from "lucide-react";
export function HardwareAtlas() {
  const id = useLab((s) => s.atlasFamily);
  const concept = useLab((s) => s.atlasConcept);
  const setConcept = (atlasConcept: string) =>
    useLab.getState().set({ atlasConcept });
  const setId = (id: string) => useLab.getState().set({ atlasFamily: id });
  const family = hardwareFamilies.find((h) => h.id === id)!;
  return (
    <section
      className="hardware-atlas"
      aria-label="NVIDIA architecture explorer"
    >
      <div className="eyebrow">
        BEYOND A PRODUCT NAME / EDUCATIONAL EXPLORER
      </div>
      <div className="atlas-grid">
        {hardwareFamilies.map((h) => (
          <button
            key={h.id}
            className={id === h.id ? "active" : ""}
            aria-pressed={id === h.id}
            onClick={() => setId(h.id)}
          >
            {h.name}
            <small>{h.kind}</small>
          </button>
        ))}
      </div>
      <div className="atlas-detail">
        <span className="eyebrow">{family.kind}</span>
        <h3>{family.products}</h3>
        <p>{family.purpose}</p>
        <p>{family.tradeoff}</p>
        <a href={family.source} target="_blank" rel="noreferrer">
          Official NVIDIA reference <ArrowUpRight size={12} />
        </a>
      </div>
      {documentedExamples
        .filter((h) => h.family === id)
        .map((h) => (
          <details className="catalog-example" key={h.id}>
            <summary>{h.name} / documented example</summary>
            <dl>
              <dt>Architecture</dt>
              <dd>{h.architecture}</dd>
              <dt>Memory</dt>
              <dd>{h.memory}</dd>
              <dt>Bandwidth</dt>
              <dd>{h.bandwidth}</dd>
              <dt>Power</dt>
              <dd>{h.power}</dd>
            </dl>
            <p>{h.scope}</p>
            <a href={h.source} target="_blank" rel="noreferrer">
              NVIDIA specification · checked {hardwareCheckedAt}
            </a>
          </details>
        ))}
      <div className="compute-concepts" aria-label="GPU computing concepts">
        <div className="eyebrow">FOLLOW THE DATA</div>
        <div className="concept-tabs">
          {computeConcepts.map((c) => (
            <button
              key={c.id}
              aria-pressed={concept === c.id}
              onClick={() => setConcept(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
        <p>{computeConcepts.find((c) => c.id === concept)?.explanation}</p>
      </div>
      <p className="fine muted">
        The 3D board and moving signal are original educational schematics, not
        to scale and not measured hardware activity. Family exploration does not
        change the robot’s selected compatible SKU. Use the workload checks
        below for candidate selection. No unverified numeric specifications or
        benchmarks are added here.
      </p>
    </section>
  );
}
