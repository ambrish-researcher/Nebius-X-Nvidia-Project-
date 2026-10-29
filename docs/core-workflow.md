# ARISE core workflow — 30 October 2026 (Asia/Kolkata)

Work extends the ARISE application at `9868fa91ee01585cd566d8551f3f11f655def699` and preserves the newer remote Vercel configuration commit `b603bcb152c08e50d343a7a90560e1ed8bfc3126` on `feature/robotics-platform`. The existing application, cinematic scenes, APIs, learning, history, and budget ledger are retained.

## Input and generation

The reported complete keyboard failure was **not reproduced** in the available baseline Chromium: both normal-motion and reduced-motion pages accepted native typing. This does not establish what caused the failure in the user's original browser.

The implementation removes a concrete source of avoidable input work: every controlled-input update previously re-rendered the entire canvas subtree. The dynamic scene is now memoized and still subscribes to its own scene state. Text editing pauses cinematic progression, input/pointer events stay inside the prompt, and only non-composing, non-repeated Ctrl/Command+Enter submits. Submission waits for initial application loading to complete, so a late reference response cannot overwrite the generated result. Tab, Escape, selection, deletion, and native clipboard paste remain native. The new-project dialog focuses its textarea instead of its close button. Manual cinematic chapter previews pause until Play; long rendering stalls no longer skip a whole chapter in one clock update. An in-flight ref also prevents repeat submission before React updates the disabled button.

Prompt submissions always use the real backend generation route. The former preview-mode regular expression that chose a rover or arm has been removed. A separate **Preview curated assembly** button remains explicitly a curated reference animation. `ARISE_VISUAL_DEV=1` still blocks provider requests on the backend; it never turns an arbitrary user prompt into a preset.

The provider emits a compact, schema-constrained design: purpose, proposed capabilities, declared Y-up coordinates, sized/positioned parts, mounting parents, materials/colors, joints and drive limits, mobility, control architecture, public engineering rationale, constraints, and limitations. Validation expands this into the application's shared RobotSpecification. Server validation checks shapes, finite bounds, IDs, graph topology, joint references, axes/limits, and DOF consistency; a defensive browser boundary also rejects unsupported assemblies. Missing optional descriptions/materials are explicitly unspecified. The optional power envelope has a 30 W schema default as a teaching assumption; it is not a verified consumption or product rating.

After validation, generation opens the engineering workspace directly and assembles the actual returned components. It does not require waiting through the cinematic brand reveal. Cinematic playback remains available separately.

## Actual model verification

These were **real** authenticated Nebius Token Factory requests to the configured `nvidia/nemotron-3-super-120b-a12b`. All five finished normally and passed schema validation:

| Prompt category | Actual returned design | Parts | Joints | Physics support |
|---|---|---:|---:|---|
| Obstacle-avoiding rover | Autonomous Obstacle-Avoiding Rover | 10 | 4 | Compiled and executed flat-floor wheel drive |
| Six-axis arm | FixedBaseSixAxisArm | 9 | 6 | Conceptual assembly; arm controller/adapter unavailable |
| Quadruped inspection | Quadruped Inspection Robot | 12 | 8 | Conceptual assembly; gait/controller unavailable |
| Warehouse mobile manipulator | WarehouseMobileManipulator | 12 | 8 | Conceptual assembly; combined base/arm adapter unavailable |
| Custom tracks + sampling arm + sensors | Amphibious Inspection Robot | 12 | 7 | Conceptual assembly; tracks, waterproofing, and manipulation unvalidated |

An initial rover trial used Z as height despite the prose instruction. The backend correctly refused physics support. Its charge was retained in the ledger, and the response was archived locally. The schema was strengthened with an explicit Y-up field and coordinate descriptions, then a **clarified** rover prompt succeeded. No ambiguous charge was cleared or automatically retried.

The five designs were then submitted through the real frontend/backend using native keyboard editing and clipboard paste. The backend returned its validated real-response cache without another inference charge. Offline browser regressions replay copies of these real responses from `e2e/fixtures/generated`; replay tests do not count as new provider verification.

## Construction and physics boundaries

All returned parts are rendered from their own dimensions, positions, rotations, and appearance. Mounting dependencies drive assembly and inspection. Wheel decoration is restricted to named wheels; cylindrical arm/leg actuators are not automatically displayed as tires. Camera distance accounts for actual component extents. Box/cylinder/sphere assemblies can represent wheeled robots, arms, legged robots, mobile manipulators, and aerial concepts. Arbitrary meshes, soft bodies, complex CAD mechanisms, and multiple joints on one link are unsupported and rejected or require separate modeled links. Drone generation is supported by the contract but was not live-tested in this five-prompt matrix; flight simulation is not implemented.

The workspace distinguishes **schema-valid concept**, **actual WebGL rendering**, **compiled MuJoCo model**, and **recorded solver experiment**. Compilation does not execute a simulation. Recorded-run labels identify the mass inputs they refer to. A concept can remain useful for inspection while its simulation action is disabled with a reason.

The supported adapter remains four cylindrical wheel actuators on a box chassis, with lateral hinges and a flat floor. It honors bounded wheel velocity/force settings, bounded versus continuous wheel joints, fixed-component collision rotations, and specification-ordered joint-angle/force playback even when the model lists components and joints in different orders. Other configurations do not silently enter this controller. The generated rover's actual six-second run recorded 3,000 steps, approximately **2.154 m displacement**, and maximum tilt about **0.00061 rad**. These are solver measurements, not physical-world validation, obstacle avoidance, perception, or task completion. `task_completed` remains null and hardware is not benchmarked. Reduced motion leaves playback paused; explicit playback remains available.

## Request recovery and billing

- Client-generated IDs are persisted in session storage; server jobs bind an ID to its prompt and retry flag. Reusing an ID with another payload returns 409.
- `GET /api/generations/{id}` is protected by the existing lab-access-token policy and never dispatches inference. Reload/status checks can recover a completed result, including the narrow worker-crash window after validated ledger persistence.
- Pending requests are not resent. Stale worker state becomes uncertain. Unknown provider usage keeps its original reservation; identical unresolved prompts cannot be forked under another ID. Unlinked legacy generation reservations conservatively block new generation until operator billing reconciliation.
- Only a failed request with known billing, or a request never dispatched, exposes the explicit **Retry failed prompt (may incur cost)** action. Retrying uses a new ID and a linked ledger attempt, preserving all earlier charges. Admission remains transactional. An uncertain child retry blocks further forks; a successful retry becomes the reusable cached result.
- Neither the application nor this work clears uncertain reservations based on elapsed time. Provider-wide invoice/balance reconciliation still requires an operator. No provider idempotency guarantee is invented.

The original $1 estimated-spend cap and verified-price configuration remain intact. The ledger moved from **$0.0049401** to **$0.0170304**, with **$0 outstanding reservations**, **11 total recorded requests**, and **30,428 total tokens**. This task added six paid requests including the initial coordinate trial, estimated **$0.0120903**. Provider invoices and external spending are outside the local ledger. No dedicated GPU or public deployment was created.

## Validation and remaining limits

Backend: **78 tests passed**. Frontend: **17 tests passed**. Type checking and production build passed. Six desktop browser cases passed against the real backend cache, including all five prompts and native keyboard/modal behavior. A complete browser suite run passed **32 cases**, with **4 intentional skips** (two opt-in paid generation tests and mobile duplicates of desktop cinematic/raycast checks). It covers native typing, cursor editing, real clipboard paste, shortcut submission, repeated held keys, all five recorded real design responses, real supported physics/playback, reload/status recovery with only one POST, explicit retry IDs, existing learning/history, and WebGL fallback. An initial cinematic timing race was fixed and rechecked before this complete passing run.

Exact original-browser failure reproduction, physical hardware validation, locomotion/manipulation/flight controllers, arbitrary mesh generation, actual GPU performance, complete CAD quality, Supabase live validation, and public deployment remain unverified or unimplemented. Source and compiled client assets must remain free of provider credentials. All runtime records and the spend database stay ignored by Git.

Final verification after the joint-order correction: all **five desktop browser flows passed again against the real backend cache**, including real solver execution, explicit playback, timeline scrubbing, and camera reset for the generated rover. After adding the initial-reference race guard and its regression test, **8 focused browser checks passed** across desktop and mobile: cached real rover generation/simulation, native keyboard/modal focus, held-shortcut suppression, and reference-load race prevention. This verifies 34 distinct active browser cases across the complete and focused runs; the expanded suite was not rerun as a single complete invocation. A final local smoke check also passed with a real 500-step MuJoCo run. These checks left token usage and charges unchanged.

The final source and compiled-client scan found no configured secret values, private keys, or tracked credential/runtime database paths. The newer remote Vercel commit was incorporated by fast-forward; no application changes were overwritten. Changes are prepared for a local commit on `feature/robotics-platform`; no push, deployment, infrastructure provisioning, or change to `main` is part of this delivery.
