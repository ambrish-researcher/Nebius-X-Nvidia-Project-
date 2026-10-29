# ARISE cinematic implementation milestone

This milestone extends the existing application on `feature/robotics-platform` from `8578e12aded7dd50fcc571b47d819d25be5a0895`. It does not replace the backend, physics adapter, project history, cost ledger, or real Nemotron integration.

## Reference and visual evidence

**BLOCKED — rendered Lusion audit and exact frame comparison.** Real Chromium navigation to `https://lusion.co/` with the inherited HTTPS proxy and TLS verification failed with `net::ERR_TUNNEL_CONNECTION_FAILED`. The managed network policy excludes the host. No reference recording or extracted frames were available locally. No Lusion animation was observed or reverse engineered. The written scene progression guides this original implementation. See [reference gap mapping](arise-visual-gap.md).

The supplied composition principles map to ARISE as follows: a character and sphere establish a focal subject, large white type occupies negative space, a receding geometric tunnel connects the prompt to construction, specification components demonstrate assembly, a black typographic reveal creates a pause, and the same stage continues into engineering, compute, learning, and revision. These are interpretations of the written brief, not findings from an accessible rendered reference.

Automated captures are saved under ignored `test-results/arise-{desktop,mobile}-*.png`. The screenshot sequence includes intro, sphere throw, tunnel, construction, assembled robot, ARISE reveal, engineering inspection, compute, learning, and improvement. Reveal captures use the actual viewport; the other captures include the full page where appropriate. They demonstrate the application itself. They cannot establish frame matching to an unavailable reference.

## Implementation status

| Area | Status | Delivered scope and limit |
|---|---|---|
| Robot introduction | COMPLETE | Original procedural guide cups the sphere and throws it toward the camera. The guide is labeled illustrative and distinct from the generated engineering design. |
| Prompt and tunnel | COMPLETE | Existing validated generation route preserved. Protected visual mode uses a labeled rover/arm reference fixture. The tunnel and camera transition share the existing R3F canvas. |
| Component transformation | COMPLETE | Parts emerge from the sphere, spread, and settle into specification positions in dependency order. Pause, replay, seek, playback speed, and labels explain the construction. Timeline duration accommodates deep dependency graphs. |
| ARISE and robot reveal | COMPLETE | Oversized white typography on black, skippable transition, then the assembled robot in the functional engineering lab. |
| Typography and animation | COMPLETE | Responsive display type, enlarged explanations, cinematic transport, reduced-motion snapshots with explicit playback, and client-safe media preference hydration. Desktop camera framing reserves room for the reading panel. |
| Engineering inspection | PARTIAL | Component selection, connection explanations, three levels, alternatives, limitations, focus, isolation, exploded view, and transparency. Transparency is a conceptual X-ray, not a new cutaway CAD model. A comprehensive component failure library and rated hardware engineering models remain incomplete. |
| Tasks and simulation | COMPLETE within adapter scope | Existing manual task feasibility and workload checks preserved. Actual MuJoCo rigid-body results, joint states, trajectory, playback, and export. Only structurally supported four-wheel flat-floor rovers run physics; no arbitrary mission execution. |
| Revision and evidence | COMPLETE within adapter scope | Edit bounded component mass and wheel-speed setpoint, record a prediction before the run, retain measurements, compare run inputs/results, preserve a decision log, and return to inspection. No invented payload ratings or GPU speedups. |
| Hardware catalog | PARTIAL | Extensible family explorer covers all requested NVIDIA product names. Five documented examples expose selected verified fields; exhaustive per-SKU specifications and full framework compatibility matrices remain incomplete. |
| Compute lab | PARTIAL | Original interactive board/rack schematics, conceptual data flow, memory/precision/deployment lessons, existing deterministic candidate checks and comparisons. Not physical CAD, GPU execution, or performance benchmarking. |
| Learning | COMPLETE within existing workflows | Tutor adapter, component-based quiz/flashcard fixtures, answer explanations, self-review progress, task challenges, and measured experiment context. Live paid generation of every educational workflow remains unverified. |
| Session summary | COMPLETE | Current robot, actual inspections, task, measured runs, selected compute, quiz results, reviewed concepts, and next experiment guidance. |
| Public deployment / Supabase | NOT IMPLEMENTED live | Existing adapter and migration retained. No public release or cloud service was created. |

## Hardware source verification

Official pages were fetched successfully on **2026-10-29**. Only values actually recorded from those pages are added to the educational catalog:

| Example | Recorded facts | Official source |
|---|---|---|
| GeForce RTX 5090 | Blackwell; 32 GB GDDR7; 575 W reference total graphics power | [NVIDIA](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/) |
| Jetson AGX Orin 64GB | Ampere; 64 GB LPDDR5; 204.8 GB/s; 15–60 W module modes | [NVIDIA](https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-orin/) |
| Jetson T5000 | Blackwell; 128 GB LPDDR5X; 273 GB/s; 40–130 W module modes | [NVIDIA](https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-thor/) |
| H100 SXM | Hopper; 80 GB GPU memory; 3.35 TB/s; configurable TDP up to 700 W | [NVIDIA](https://www.nvidia.com/en-us/data-center/h100/) |
| Vera Rubin NVL72 | Rack-scale platform with 72 Rubin GPUs and 36 Vera CPUs; NVLink 6 | [NVIDIA](https://www.nvidia.com/en-us/data-center/technologies/rubin/) |

These are manufacturer specifications, not app measurements or purchasing advice. No stock, provider availability, price, inference latency, or rack power quote is verified. A guessed RTX PRO 6000 product URL returned HTTP 404; no numeric values were taken from it. The family links use NVIDIA's broader product documentation. The existing recommendation SKU set remains intentionally limited; family exploration never silently changes the selected simulation hardware.

## Integration truth

**INTEGRATED:** NVIDIA Nemotron through the existing Nebius Token Factory backend adapter, historically verified live before this visual milestone. MuJoCo is integrated CPU physics. Three.js/R3F render the original procedural assets.

**EDUCATIONAL DEMONSTRATION:** CUDA, TensorRT, JetPack, Isaac ROS, Omniverse, PhysX, Cosmos, GR00T, and the hardware architecture schematics. No GPU framework is installed or executed by this milestone.

**PLANNED:** Isaac Sim and Isaac Lab execution, live Supabase validation. **UNSUPPORTED:** measured NVIDIA GPU benchmarking and arbitrary navigation/manipulation tasks in the current physics adapter.

## Cost and security

Start visual development with `ARISE_VISUAL_DEV=1 ./scripts/dev.sh`. Backend inference settings reject requests before budget reservation or provider dispatch, even if a browser bypasses fixture mode. The browser receives only the preview boolean and labeled fixtures; the server credential remains private. Normal backend mode retains the existing live routes and transactional $1 estimated-spend guard.

The local ledger before visual work was **$0.0049401**, 5 requests, 9,067 tokens, no outstanding reservation. No paid inference is authorized for this milestone. Catalog documentation and model-discovery GETs do not constitute inference or provision hardware.

Do not use separate backend replicas with independent SQLite ledgers for public use. Provider balance, price correctness, and spending by other applications are outside the local guard.

## Performance and delivery limits

Cloud Chromium uses software WebGL. Continuous desktop rendering showed roughly **2–3 FPS** at adaptively reduced resolution; portrait captures showed about **8 FPS**, with visible aliasing. Reduced-motion views now render on demand while static. A browser test instruments real WebGL draw calls, confirms no additional draws during an idle sample, then verifies direct component raycasting and a changed camera image. Simulation playback and explicit cinematic play resume continuous rendering. This is an idle-work reduction, not a GPU frame-rate benchmark. GPU-accelerated browser frame rates, battery use, and low-end mobile hardware performance remain unverified. No arbitrary 60 FPS claim is made. The renderer reduces DPR and disables costly shadows/antialiasing on detected software renderers; unsupported WebGL retains engineering controls and a visible fallback.

Production readiness still requires GPU-device visual/performance checks, a reachable reference for fidelity review, hosting selection and production access controls, persistent shared budget design before scaling, and Supabase setup. Before Supabase sync for generated designs, map model-supplied slug identifiers to stable UUIDs to match the existing SQL primary key. Then configure the project/Auth, apply RLS migration, and test owned-project save/load plus cross-user denial. No deployment is authorized here.

The validation outcomes below describe this local milestone. The final commit and verified GitHub branch are reported at delivery.

## Validation results

- **COMPLETE:** 65 backend tests passed, including existing model/schema/budget/security checks and new protected-preview, bounded-controller, actual solver-motion, and project-state tests. One upstream Starlette/AnyIO deprecation warning remains.
- **COMPLETE:** 15 frontend tests passed. Focused coverage includes deterministic/reversible sphere and component poses, camera-path proximity during the sphere throw in both aspect ratios, deep dependency-graph timing, specification-based fixtures, no-fetch fixture behavior, measured-result interpretation, and inspection/controller persistence.
- **COMPLETE:** Type checking and optimized Next.js Webpack production build passed. The build needs the managed environment's process permissions; an initial sandboxed TypeScript child-process configuration read failed, then the permitted build completed.
- **COMPLETE:** Full optimized production browser suite: **14 passed, 4 intentionally skipped**. Skips are the two opt-in paid-inference cases and the mobile duplicates of desktop normal-motion/raycasting checks. No paid-inference test was enabled.
- **COMPLETE:** After manual screenshot review found a mobile stage/lesson overlap, all six affected mobile cases passed again with explicit element-bound overlap assertions (one normal-motion mobile duplicate skipped). The 3D viewport, controls, and reading panel now follow one another in normal flow.
- **COMPLETE:** Real desktop raycasting selects a component; camera changes alter the actual WebGL screenshot. An instrumented reduced-motion idle sample issues no additional WebGL draw calls; interaction still redraws the scene.
- **COMPLETE:** Real production API smoke: 500 MuJoCo steps for 1 simulated second; displacement about 0.259 m, no task-completion or GPU-benchmark claim. Each run records its own measured wall time.
- **COMPLETE:** Desktop/mobile cinematic captures contain no uncaught page errors or hydration warnings. Prompt/fixture routes do not dispatch paid inference. Page overflow is checked for each capture, and mobile stage/control/lesson overlap is checked explicitly.
- **COMPLETE:** Source and 25 compiled client JavaScript assets were scanned against configured credential values; no matches or tracked credential/database files were found. `.env.example` remains a placeholder template.
- **COMPLETE:** All existing tracked files remain present. The feature branch is the delivery target; `main` remains at `74ceeb61aa0edb6e271ed41d36734f707f08e330`.

An early development-server browser run was invalidated by a hot reload during camera edits. Final workflow validation uses the compiled production server, with explicit mocks/fixtures for all paid AI paths. These results establish application behavior, not live provider success for every workflow, a complete accessibility certification, public deployment, or exact reference fidelity.

The final camera calibration and answered-choice contrast were followed by a fresh cinematic walkthrough on both viewports plus desktop normal-motion playback: **3 passed, 1 intentional mobile duplicate skipped**. All major ARISE scene captures were refreshed. The final source tree contains 64 tracked files; configured credential comparisons found no matches in source or the 25 compiled client assets. Estimated inference spend remains **$0.0049401**, 5 requests, 9,067 tokens, reserved **$0**: this visual milestone sent no paid inference.
