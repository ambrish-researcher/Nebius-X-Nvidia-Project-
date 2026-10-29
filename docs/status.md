# Implementation status

This tracks the delivered local slice, not a claim that all requested platform features are finished.

| Directive priority | State | Evidence / remaining work |
|---|---|---|
| P0 real NVIDIA inference | Blocked externally | Backend adapter, discovery, accounting, validation, and explicit errors implemented. Missing API credential, authenticated catalog/model choice, verified prices, provider balance, and applied network access. |
| P0 natural-language robot generation | Implemented, live path unverified | `/api/generate`; no fake output. Need a successful live model request and generated-model regression examples. |
| P0 cinematic landing / construction | Implemented | Original procedural rover/arm geometry; shared 3D stage, materials, assembly DAG, interactive controls. Software WebGL is slow; GPU performance unverified. |
| P0 component education | Implemented | Selection, focus, graph relationships, supplied design dimensions/mass, three explanation levels. Live tutoring depends on Nebius. |
| P0 task interpretation | Adapter + manual workflow | Live task parser is unavailable without inference. Explicit manual workload assumptions work. |
| P0 compute recommendations / comparison | Implemented local heuristic | Memory, power, vision, manipulation, environment, network. No measured inference or price claims. Limited catalog; manufacturer source retrieval needs current verification. |
| P0 real simulation | Implemented | Actual MuJoCo four-wheel flat-floor drive, state playback, joint/force/contact data, trajectory, results export. Not arbitrary mission execution. |
| P0 public working demo | Not deployed | Production build and deployment configuration prepared. Need selected hosting account/target and live secrets. No paid infrastructure launched. |
| P1 quiz / flashcards | Implemented adapters + UI | Structured output validation, answer tracking and local persistence; live generation pending Nebius. |
| P1 experiment history | Implemented | Local storage and JSON export. Supabase adapter needs project URL, anon key, migration, and test account. |
| P1 Vera Rubin explorer | Educational text only | Manufacturer reference, explicit cloud/onboard distinction. Dedicated 3D architecture explorer remains future work. |
| P1 additional robot types | Generic validated geometry | Arm and rover references; Nemotron may generate other bounded primitives. Physics registry remains deliberately limited. |
| P2 Isaac / robot learning / GPU benchmarks | Planned | No claims of working integration. |

## Engineering limits

Reference component geometry, masses, friction, and power assumptions are teaching inputs. No actuator sizing, thermal model, torque rating, battery discharge model, calibrated camera, LiDAR stream, payload rating, terrain validation, or safety certification is established. Component inspection explains the available specification; it is not a replacement for CAD/FEA, physical tests, or hardware datasheets.

Hardware catalogs distinguish generic illustrative envelopes from named product reference values. `verified=false` records that manufacturer pages were not retrieved/verified during this network-restricted session. No current stock, price, commercial availability, or live benchmark is asserted. Broader historical/current NVIDIA families must be expanded only after checking their official documentation.

## Validation

Run commands in README. Live Nebius tests intentionally skip when no credential is available; mocked transport checks cover cache, budget reservation, accounting, and upstream failure handling, not provider success. Browser tests use the real local backend and real MuJoCo solver. Automated screenshots are saved under ignored `test-results/`; view them locally when reviewing design.

## Current-session verification

- Backend: **35 passed, 1 skipped**. The skipped test is authenticated live Nebius model discovery. Transport fixtures are explicitly mocked and do not count as live provider verification.
- Frontend components: **6 passed**, including shared task/component state and modal keyboard focus handling.
- Browser end-to-end: **4 passed**, across desktop and mobile Chromium. Covers the real local API/physics path, persistence, distinct arm/rover references, and unavailable NVIDIA generation/results-analysis errors.
- TypeScript: passed. Optimized Next.js Webpack production build: passed.
- Locked setup script: rerun successfully. Combined startup script: exercised successfully.
- Functional readiness smoke: passed against both the development service and a separately started compiled production server. Each smoke ran 500 actual MuJoCo steps for one simulated second.
- Manufacturer page retrieval, authenticated model generation, actual Token Factory balance/prices, live Supabase save/load, hosting deployment, GPU benchmarks, and fresh-task environment restoration remain unverified.
