# ARISE engineering studio — 30 October 2026

This milestone extends `7be065a52d50aa17d817b2687867944c1a9c4ec1` on `feature/robotics-platform`. It retains the cinematic landing, validated Nemotron design contract, protected generation/status endpoints, transactional budget ledger, learning, history, and supported MuJoCo adapter. No new library or GPU framework was installed.

## Delivered behavior

- A dedicated center 3D viewport, mounting hierarchy and filters on the left, readable engineering/inspection panels on the right, and a persistent simulation dock below. Narrow screens use a vertical flow with a collapsible assembly list.
- Hierarchy and 3D raycasting share component selection. Properties show the actual geometry, SI dimensions, world position, rotations, mounting relationships, materials, mass inputs, joint axes/ranges, and drive limits. Sensor specifications that are absent from the design remain explicitly unspecified.
- Orbit, right-drag pan, wheel zoom, presets, isolation, transparency, exploded view, assembly replay, and optional camera following. The default physics camera frames the measured trajectory so travel is visible rather than automatically keeping the rover stationary at the center.
- Bounded numeric and draggable 3D translations for inspection. These are clearly labeled **visual only**. They do not edit the validated robot specification, saved geometry, or collision model. Starting a solve clears the offsets. Manufacturing-grade geometry/joint editing remains incomplete.
- A single explicit solve action shared by the Simulate panel and dock. It prevents concurrent duplicate solves, shows the request state, validates returned poses/timestamps, retains prior evidence on failure, and rejects a result if the design changed while execution was pending.
- Time-series playback runs outside the WebGL tree, selected by recorded sample timestamps. Slow rendering can skip displayed samples without stretching the experiment. A WebGL-unavailable browser can still inspect data, execute CPU physics, and operate the timeline. Hiding the tab pauses playback.
- Start sends a new CPU solver request. Play/Pause, timeline scrubbing, Reset, and Replay operate the existing recording without another solve or inference request. Reduced motion starts with playback paused and an explicit Play action. A completed solver run and a completed playback are separate visible states. On narrow screens, successful execution, Play, and Replay reveal the viewport so motion is not left offscreen below a long properties panel.
- A measured XZ trajectory, current XYZ position and raw MuJoCo WXYZ orientation, actual integration steps and solver time, meaningful failure messages, and bounded session logs. Logs are client-observed request/response events, explicitly not a streamed backend console.
- Renderer availability, version/vendor/renderer strings from the active WebGL context, software-renderer classification, measured continuous FPS, and an explicit on-demand rendering state. Hidden renderer information remains unknown. Browser rendering, backend CPU physics, Nebius model inference, and unimplemented local RTX simulation are separate entries.

## Functional fixes

The old playback accumulator was inside the canvas and clamped elapsed render time. That made slow rendering stretch playback and left it stopped when WebGL was unavailable. The DOM playback clock now uses elapsed time and actual sample timestamps. Per-frame state no longer re-renders the page or rebuilds each robot part; Three.js reads the current pose directly. Reduced-motion idle rendering remains demand-driven. Construction elapsed time also no longer stretches on a slow renderer.

The former panel exit animation could retain the outgoing wrapper while its subscribed content changed, then remount the new section after a fast interaction. This could reset a newly selected quiz tab. Panels now switch immediately with an opacity-only fade, disabled for reduced motion. The elapsed-time readout is a labeled non-live element; it does not compete with notification status or announce every sample.

Native prompt input still pauses cinematic progression, keeps input events isolated, and handles non-repeated, non-composing Ctrl/Command+Enter. Normal and reduced-motion Chromium testing uses actual keyboard typing/editing, native clipboard paste, and keyboard submission, rather than synthetic input-event injection. The original complete Windows input lock was not reproduced; the current production-equivalent build is verified locally, not against an unspecified public URL or the user's Windows browser.

## Physics and AI boundaries

The supported adapter is still a box chassis with exactly four lateral cylindrical wheel drives on a flat floor. It uses specification geometry, masses, joint/actuator bounds, gravity, and collision contacts. Fresh results now include the initial state at time zero, regularly sampled actual states, the final state, backend CPU execution metadata, integration timestep, and coordinate-system descriptions. Positions are Y-up XYZ meters; quaternions are raw MuJoCo Z-up WXYZ and are converted for 3D rendering.

Arms, quadrupeds, mobile manipulators, tracks, and aerial concepts remain inspectable assemblies without matching physics controllers. Forward-drive physics does not execute navigation, obstacle avoidance, vision, or arbitrary natural-language missions. `task_completed` stays null and selected NVIDIA hardware is not benchmarked. No CUDA physics, RTX ray tracing, Isaac Sim/Lab execution, or local NVIDIA simulation adapter is implemented.

This milestone does not alter inference, credentials, prices, request recovery, or budget admission. Browser generation regressions explicitly replay the five real, previously verified Nemotron responses. They verify input, distinct geometry, workspace entry, and supported simulation, without claiming a fresh provider response. No additional paid inference is needed for the studio changes.

## Verification

The optimized Next.js production build is served locally with its real FastAPI rewrite. The backend uses `ARISE_VISUAL_DEV=1` during visual regression to independently block paid inference. This is not a public deployment.

- Backend: **79 tests passed**, including actual solver initial/final timestamps, pose validity, CPU execution metadata, existing admission/billing safeguards, and unsupported model checks. An existing Starlette/AnyIO deprecation warning remains.
- Frontend: **24 tests passed**, including irregular sample selection, elapsed-time playback without a canvas, corrupt-state rejection, duplicate-solve protection, preserved evidence on failure, changed-design rejection, and renderer classification.
- Type checking and optimized production build passed.
- Complete browser regression: **41 passed / 5 intentionally skipped**, across desktop and mobile Chromium. The skips are two opt-in paid-provider cases and three desktop-covered mobile duplicates (continuous cinematic playback, direct raycast controls, and continuous FPS sampling). The run includes native keyboard typing/editing and real clipboard paste, five distinct recorded model designs, recovery/retry behavior, learning/history, actual MuJoCo execution, mouse orbit/pan/zoom, native gizmo dragging, timeline controls, explicit failures, and WebGL-unavailable playback.
- Final focused production-browser rechecks after the mobile viewport reveal and render-pass wording change: **11 passed / 1 intentionally skipped**. These revisit generated/reference rover execution, component/gizmo inspection, playback controls, failures, unsupported arms, WebGL fallback, and accurate renderer/FPS reporting on desktop and mobile. They overlap the complete suite and are not counted as 11 additional distinct cases.
- A real local smoke test passed through the frontend rewrite: MuJoCo 3.3.7, **500 integration steps / 1 simulated second / approximately 0.259 m displacement**. Solver wall time is measured per run, not a GPU benchmark.
- Source/client scan: **86 source files and 25 compiled client JavaScript assets**, with no configured secret-value matches, private keys, credential patterns, or tracked environment/runtime database files. The existing placeholder `.env.example` is retained.
- Usage stayed at **11 requests / 30,428 tokens / $0.0170304 estimated charged / $0 reserved**. This milestone added **zero paid inference requests**. Provider invoices and external account spending are not verified by this local ledger.

Desktop/mobile screenshots were reviewed for studio layout, inspected geometry, actual trajectory playback, readable diagnostics, and responsive overflow. Captures are local ignored artifacts under `test-results/studio-*` and `test-results/core-*`; 39 full-suite captures are preserved under `.runtime/studio-validation-full`. Renderer strings were compared with direct active-context reads. A native mouse drag moved the inspection X offset to 0.190 m while leaving the engineering specification unchanged.

## Deployment and remaining limits

See [deployment instructions](deployment.md). The current Vercel configuration lives at the repository root; an older `frontend` root override must be removed. The separately hosted FastAPI service must be reachable through the build-time `BACKEND_URL` rewrite. A landing page by itself does not establish backend connectivity.

Cloud Chromium uses SwiftShader software rendering. Render rate and image quality are constrained, especially at initial shader compilation; hardware GPU frame rate, native mobile Safari, physical robot validation, and the original Windows-browser issue remain unverified. The application measures its rendering rate rather than asserting a target FPS. Supabase live validation, production multiuser access controls, and public deployment remain separate work. No paid infrastructure or dedicated GPU was provisioned.
