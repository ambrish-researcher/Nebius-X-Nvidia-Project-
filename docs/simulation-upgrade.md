# ARISE simulation upgrade

Implemented and manually reviewed on November 7, 2026 (IST), in the existing `feature/robotics-platform` checkout. Review used the already-running Next.js app at `http://localhost:3000`.

## Opening screen

- Centered the existing robot-description form and retained the original robot shortcuts, connection settings and robot-lab workflow.
- The opening screen no longer mounts the robot scene. The scene still mounts when the original robot lab is entered, including its Microduck experience.
- Compared `frontend/app/globals.css` with the same file in the existing submission ZIP. The original palette and background rules matched. Retained `#080b09`, the existing green accent and packaged background gradients; added composition rules without replacing the project or introducing a background asset or video.
- Added a Simulation navigation link and entry point. Vera Rubin and Thor prompts can open their corresponding explainers.

## Simulation hub and scenes

`/simulation` offers three independent experiences:

- Vera Rubin: seven steps covering the rack, separated trays, CPU/GPU roles, interconnects, power/cooling, illustrative data flow and takeaways.
- Jetson Thor T5000: eight steps covering the module, general silicon fabrication, conceptual transistor/logic blocks, CPU, Blackwell GPU, memory, an example sensor workload and takeaways.
- Microduck: eight steps covering the robot, mechanical relationships, motors, camera/depth/IMU sensing, RK3566 computing, CPU/Mali GPU/NPU roles, control flow and an illustrative walking cycle.

All scenes use original procedural Three.js geometry through the existing React Three Fiber stack. Repeated processor markers and small components use instancing. No dependency was added. There is no prerecorded scene or video background.

Each step has a title above the viewport and a large explanation with “What you’re seeing,” “How it works,” “Why it matters,” and short definitions. Controls provide Previous/Next, Play/Pause, Restart, 1×/2×/4× playback, direct step selection, orbit, zoom, camera reset, exploded inspection and wireframe. Native sprite labels remain readable at different zoom levels and stay inside the viewport. Reduced-motion preferences suppress decorative motion and use direct placement; users can still navigate the lessons.

## Manual review performed

- Opened the centered landing page and all three hub cards in the existing app.
- Viewed all three real-time scenes; examined rack separation and CPU/GPU markers, cooling paths, the module and wafer/logic views, and Microduck's sensing, computing and walking views.
- Used Previous/Next, direct chapter navigation, restart, playback, pause, speed selection, exploded view, wireframe, part selection, orbit, zoom and reset-view controls. Observed 4× playback advance a lesson, followed by a paused state.
- Reviewed desktop (1440×1000) and portrait mobile (390×844) layouts. Adjusted portrait module framing and bounded part labels. Checked readable explanations and no horizontal page overflow in the inspected mobile views.
- Used a reduced-motion browser preference while reviewing the lessons.
- Confirmed the opening page contains no Canvas and no video element. Confirmed the original humanoid prompt still opens its robot workspace and a Vera Rubin prompt navigates to its explainer.
- Corrected glossary alignment inherited from the old global styles and removed stale WebGL-loss notifications from disposed scene listeners. Fresh reviewed scene visits reported no console errors after those fixes. Browser screenshot tooling once added a caret style before landing-page hydration; this was a capture-timing artifact, not an application style change.

No automated tests were added or run, as requested. No production build or deployment was run. Review captures are local, ignored files under `.runtime/`, including `arise-opening-centered.png`, `arise-simulation-hub.png`, `arise-rubin-desktop.png` and `arise-rubin-mobile.png`.

## Manufacturer references

Reviewed November 7, 2026. The lessons link directly to these primary sources:

- [NVIDIA Vera Rubin NVL72](https://www.nvidia.com/en-us/data-center/vera-rubin-nvl72/) — system identity and published processor counts.
- [NVIDIA DGX Vera Rubin hardware guide](https://docs.nvidia.com/dgx/dgxvr-user-guide/hardware.html) — compute trays, NVLink switch trays, power and cooling relationships.
- [NVIDIA Jetson Thor](https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-thor/) — T5000 CPU, Blackwell GPU and memory specifications.
- [Pollen Robotics Microduck specifications](https://store.pollen-robotics.com/products/microduck) and [press kit](https://pollen-robotics.com/microduck/press-kit/) — robot identity, motors, sensing, RK3566 and design-file provenance.
- [Rockchip RK3566](https://www.rock-chips.com/a/en/products/RK35_Series/2021/0113/1274.html) — CPU, Mali GPU and neural-processing blocks; software utilization is not inferred from the presence of hardware.

## Limits

The models are schematic educational interpretations, not manufacturer CAD or private board/transistor layouts. Fabrication imagery teaches general principles. Flow markers have illustrative timing and do not benchmark hardware. Microduck's walking cycle prescribes joint transformations without contact forces, balance physics, live sensing or a trained control policy. No optional AI request is needed to run these scenes. Existing backend, authentication, deployment configuration and unrelated robot-lab features were retained.
