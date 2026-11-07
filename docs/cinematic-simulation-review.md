# Cinematic simulation follow-up

Implemented locally on `feature/robotics-platform`, reviewed November 7, 2026 (IST), using the existing app at `http://localhost:3000`. This continues the existing simulation hub and React Three Fiber architecture. No dependencies were added.

## Result

Each experience now has nine chapters. Titles remain above the viewport, with the existing large explanation, vocabulary, playback controls, progress, inspection tools, takeaways and official references.

- **Vera Rubin:** rack establishing view, staggered tray separation, a magnified compute tray, conceptual HBM4 layers and CPU memory, NVLink/networking, power shelves and bus bar, cold plates and circulating coolant, an example request/result path, and reassembly. Published rack counts remain separate from illustrative component placement.
- **Jetson Thor T5000:** module overview, patterned wafer and separated device/interconnect layers, a generic switching transistor, an animated AND gate with input/output values and truth table, magnified CPU coordination, GPU work groups, working memory, an example sensor/AI path, and reassembly. Semiconductor concepts are explicitly distinguished from the product's documented features.
- **Microduck:** complete original robot, staggered mechanical separation, detailed joint housings and linked legs, camera/ToF/IMU sensing, a conceptual RK3566 board, CPU/Mali GPU/NPU roles, the feedback loop, an in-place walking cycle with planted-foot markers, and reassembly. The original robot-lab Microduck remains available too.

Camera shots move between establishing views and focused details. Orbit or zoom interrupts an automatic camera move; Reset view returns to the current chapter's shot. Portrait framing accounts for wide boards and the taller robot. Selected component names use screen-sized sprites with leaders, kept in a clear strip above the model. Logic values have smaller, separate callouts.

## Files

| File                                          | Purpose                                                                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/components/simulation-scene.tsx`    | Existing rack/module/robot builders, lighting, step-specific cameras and scene integration.                                        |
| `frontend/components/simulation-geometry.tsx` | Extracted shared materials, instancing, part staging, labels, joints and signal paths.                                             |
| `frontend/components/simulation-details.tsx`  | Compute-tray cutaway, wafer/device layers, switching/logic examples, circuit detail, sensor returns and foot-placement kinematics. |
| `frontend/lib/simulation-direction.ts`        | Camera positions, targets, view descriptions and signal legends for the 27 chapters.                                               |
| `frontend/lib/simulation-lessons.ts`          | Added chapters, beginner explanations, terminology, conceptual limits and primary-source links.                                    |
| `frontend/app/simulation/page.tsx`            | View descriptions, model-scope badges, inspection resets and playback-clock correction.                                            |
| `frontend/app/simulation/simulation.css`      | Larger viewport and readable view/signal annotations.                                                                              |
| `docs/cinematic-simulation-review.md`         | This implementation and review record.                                                                                             |

## Browser review

Reviewed the hub and every chapter in all three experiences at desktop 1440×1050 and portrait 390×844. Captured and visually inspected chapter contact sheets, individual close-ups, explanations and control states. No horizontal page overflow or graphics fallback appeared in the final inspected mobile chapters.

Used Previous, Next, direct chapter selection, Play/Pause, Restart and all three speeds in each experience. Observed automatic advancement at 4× and stable progress after Pause. Representative equal-duration Rubin playback samples produced progress values approximately 0.00867, 0.01735 and 0.03470 at 1×, 2× and 4×. Fixed the initial animation-frame delta, which could previously become slightly negative and pass an invalid parameter to a signal curve.

Used part selection, orbit, mouse-wheel zoom, zoom buttons, exploded inspection, wireframe and Reset view in all three scenes. Inspected before/orbit/reset captures. Visually followed transistor switching, AND input/output changes, alternating feet and support markers, and the final separated-to-assembled transitions. Final chapters expose three takeaways and three primary-source links per experience.

Reviewed reduced-motion captures over time: geometry remains still while lesson playback can advance. Verified the reduced-motion legend. Reopened the unchanged landing page, confirmed the prompt-only GridScan and absence of video elements, and submitted Microduck in the original robot lab; assembly reached 100% with a live 3D scene.

Final reviewed browser visits reported no console errors. Local captures are ignored files under `.runtime/`, including `final-desktop-*-sheet.png`, `final-mobile-*-sheet.png`, `cinematic-controls-sheet.png`, `cinematic-closing-sheet.png` and `cinematic-reduced-sheet.png`.

No automated test suites were added or run. No production build, commit, staging, push or deployment was performed. SHA-256 comparisons preserved the pre-existing landing page/CSS, GridScan files, original robot scene, Next environment file, `.gitignore` and submission ZIP.

## Primary references and limits

Product details were checked against [NVIDIA Vera Rubin NVL72](https://www.nvidia.com/en-us/data-center/vera-rubin-nvl72/), the [DGX Vera Rubin hardware guide](https://docs.nvidia.com/dgx/dgxvr-user-guide/hardware.html), [NVIDIA's Rubin platform explanation](https://developer.nvidia.com/blog/inside-the-nvidia-rubin-platform-six-new-chips-one-ai-supercomputer/), [NVIDIA Jetson Thor specifications](https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-thor/), [Pollen Robotics' Microduck specifications](https://store.pollen-robotics.com/products/microduck) and [press kit](https://pollen-robotics.com/microduck/press-kit/), and [Rockchip's RK3566 description](https://www.rock-chips.com/a/en/products/RK35_Series/2021/0113/1274.html). The fabrication chapter links to [ASML's general explanation](https://www.asml.com/en/technology/all-about-microchips/how-microchips-are-made).

Geometry, dimensions, internal placement, circuit traces and signal timing are educational illustrations. Work-group tiles and semiconductor layers represent general ideas; they do not reproduce private layouts, masks or a specific fabrication process. These scenes render locally and do not benchmark hardware or execute live inference.

Microduck uses inverse kinematics for an in-place stepping cycle and visual foot placement. It does not solve ground forces, friction, motor torque or balance, and does not run a trained walking policy or live sensor processing. Physical-device performance and mobile GPU frame rates were not benchmarked; review used the local browser at desktop and mobile viewport sizes.
