# Implementation status

Current studio: [workspace, timestamp playback, and execution diagnostics](studio-milestone.md).

Current core workflow: [live generation, input, request recovery, and support matrix](core-workflow.md). Older milestones below are historical.

This tracks the delivered local slice, not a claim that all requested platform features are finished.

The current ARISE cinematic extension is documented in the [milestone report](arise-milestone.md). Historical validation below refers to the preceding integration commit.

| Directive priority | State | Evidence / remaining work |
|---|---|---|
| P0 real NVIDIA inference | Verified | Authenticated Nemotron 3 Super via Token Factory. Model-matched, application-validated responses produce persisted historical status. Provider account balance remains unverified. |
| P0 natural-language robot generation | Small concept verified live | Real browser prompt generated three validated box components, displayed their name, and inspected the actual returned component explanation. Complex configurations remain unverified under the 2,048-token output cap. |
| P0 cinematic landing / construction | Implemented | Original guide and sphere throw, tunnel prompt, specification-derived transformation, ARISE reveal, shared 3D lab, transport and reduced motion. Rendered reference comparison blocked; GPU performance unverified. |
| P0 component education | Implemented | Selection, focus, graph relationships, supplied design dimensions/mass, three explanation levels. Live tutoring depends on Nebius. |
| P0 task interpretation | Adapter + manual workflow | Live task parser is configured but not separately exercised in this validation. Explicit manual workload assumptions work. |
| P0 compute recommendations / comparison | Implemented local heuristic | Memory, power, vision, manipulation, environment, network. No measured inference or price claims. Recommendation SKU set remains limited. The broader educational family explorer includes five examples with selected official fields checked on 2026-10-29; exhaustive compatibility is incomplete. |
| P0 real simulation | Implemented | Actual MuJoCo four-wheel flat-floor drive, state playback, joint/force/contact data, trajectory, results export. Not arbitrary mission execution. |
| P0 public working demo | Not deployed | Production build and deployment configuration prepared. Need selected hosting account/target and live secrets. No paid infrastructure launched. |
| P1 quiz / flashcards | Implemented adapters + UI | Structured output validation, answer tracking and local persistence; live generation for these workflows remains untested. |
| P1 experiment history | Implemented | Local storage and JSON export. Supabase adapter needs project URL, anon key, migration, test account, and UUID normalization for model-generated project IDs. |
| P1 Vera Rubin explorer | Educational 3D schematic | Extensible family explorer, original rack schematic, verified system composition, explicit cloud/onboard distinction. Hardware access and benchmarks are unsupported. |
| P1 additional robot types | Generic validated geometry | Arm and rover references; Nemotron may generate other bounded primitives. Physics registry remains deliberately limited. |
| P2 Isaac / robot learning / GPU benchmarks | Planned | No claims of working integration. |

## Engineering limits

Reference component geometry, masses, friction, and power assumptions are teaching inputs. No actuator sizing, thermal model, torque rating, battery discharge model, calibrated camera, LiDAR stream, payload rating, terrain validation, or safety certification is established. Component inspection explains the available specification; it is not a replacement for CAD/FEA, physical tests, or hardware datasheets.

Hardware catalogs distinguish generic illustrative envelopes from named product reference values. `verified=false` in the original recommendation catalog is retained. Selected manufacturer fields were retrieved for the new educational explorer; see the dated source table in the ARISE report. No current stock, price, commercial availability, or live benchmark is asserted. Broader historical/current NVIDIA families must be expanded only after checking their official documentation.

## Validation

Run commands in README. Live Nebius tests intentionally skip when no credential is available; mocked transport checks cover cache, budget reservation, accounting, and upstream failure handling, not provider success. Browser tests use the real local backend and real MuJoCo solver. Automated screenshots are saved under ignored `test-results/`; view them locally when reviewing design.

## Previous baseline verification

- Backend: **35 passed, 1 skipped**. The skipped test is authenticated live Nebius model discovery. Transport fixtures are explicitly mocked and do not count as live provider verification.
- Frontend components: **6 passed**, including shared task/component state and modal keyboard focus handling.
- Browser end-to-end: **4 passed**, across desktop and mobile Chromium. Covers the real local API/physics path, persistence, distinct arm/rover references, and unavailable NVIDIA generation/results-analysis errors.
- TypeScript: passed. Optimized Next.js Webpack production build: passed.
- Locked setup script: rerun successfully. Combined startup script: exercised successfully.
- Functional readiness smoke: passed against both the development service and a separately started compiled production server. Each smoke ran 500 actual MuJoCo steps for one simulated second.
- Manufacturer page retrieval, authenticated model generation, actual Token Factory balance/prices, live Supabase save/load, hosting deployment, GPU benchmarks, and fresh-task environment restoration remain unverified.


## Application integration validation (2026-10-29)

- A live browser generation passed after two diagnosed failures: the initial output exhausted its token cap, and generic JSON mode then failed the application schema. No automatic retries ran. The fix uses schema-constrained responses and bounded non-thinking structured generation. All reported usage was accounted for, including rejected outputs.
- The successful live call used **2,314 total tokens**, estimated **$0.0010746** at the configured rates. The cumulative local ledger was **$0.0049401 / $1**, with no outstanding reservations. These are app estimates, not verified provider invoices or balance.
- The live test asserted response display, actual generated-component inspection, refreshed historical verification, no API credential in browser traffic, and no direct browser request to the provider. The application never returns the provider credential to the client.
- Focused tests cover pre-dispatch reservations, concurrent admission, settled charges, invalid usage, malformed output, cache behavior, model mismatch, schema validity, persisted status, and additive migration. See test output for current counts.
- Software WebGL now starts without expensive shadows or multisample antialiasing. Adaptive quality progressively lowers pixel ratio under load instead of resetting it to a fixed value. Slow software-rendered interaction remains a validation limitation; the GPU-capable quality path remains unchanged. GPU frame-rate targets are still unverified.
- Supabase is not configured or live-tested. The live model supplied `nemotron-camera-study` as its ID; the current Supabase primary key is UUID. Add a stable UUID mapping/migration before cloud sync. This task deliberately did not modify Supabase functionality.

- Final validation: **59 backend tests**, **6 frontend component tests**, and **6 browser regression cases** passed (browser cases verified across targeted runs). The full 3D/physics desktop and mobile workflows use reduced-motion mode and a 240-second allowance for software WebGL; both passed after initial resource-related timeouts. The separate opt-in **real Nemotron browser test passed** in normal-motion mode. Type checking, production build, and the API/physics readiness smoke also passed.
- Client-source/traffic checks and a scan of 26 production client assets found no provider credential exposure. No public deployment or dedicated GPU provisioning was performed.
- A separate reduced-motion development-page check logged a hydration-attribute warning (without an uncaught page exception). This remains a UI/SSR follow-up before public deployment; this integration task does not claim a warning-free UI or production GPU performance.

## ARISE current milestone

The cinematic extension preserves the historical provider integration described above. Visual development uses deterministic labeled fixtures and a separate server-side paid-inference guard. The reduced-motion hydration warning was resolved with a server-stable media preference snapshot and verified in the current browser journey. Static reduced-motion scenes redraw on interaction instead of continuously; explicit playback remains functional. The improvement workflow persists supported mass/setpoint inputs, predictions, solver measurements, and revision history. See the [current milestone](arise-milestone.md) for the detailed COMPLETE / PARTIAL / BLOCKED assessment, screenshots, source verification, and delivery checks.
