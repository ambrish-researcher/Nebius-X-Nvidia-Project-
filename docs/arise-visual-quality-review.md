# ARISE visual quality review

Reviewed locally on `feature/robotics-platform`, 7 November 2026. Production preview: http://localhost:3001/simulation. The existing development server was preserved.

## Changes

- `frontend/components/simulation-machined.tsx`: original procedural profiles, drilled/chamfered panels, rack channels, perforated trays and latches, layered processor packages, notched module board, cutaway cover, robot shells, sensor optics, relieved leg links and shaped feet.
- `frontend/components/simulation-resources.tsx`: scene-owned shared geometry/material caches with disposal on scene exit.
- `frontend/components/simulation-geometry.tsx`: shared rounded support geometry, instanced packets/fasteners, sharp camera-facing labels and fixed-position construction reveals. Cached materials rebind to live reveal planes when nested parts remount on restart.
- `frontend/components/simulation-details.tsx`: consolidated circuit traces and fasteners, activity updates only when their logical phase changes, reusable cooling tubes and detailed links using the existing joint pivots and gait.
- `frontend/components/simulation-quality.tsx`: 2x rendering ceiling, sustained-load adaptation with a 1.5x floor, bounded shadow updates and local renderer measurements. No per-frame React state updates.
- `frontend/components/simulation-scene.tsx`: integration, studio key/fill/rim lighting, fitted shadow maps and desktop/portrait camera framing.
- `frontend/components/site-background.tsx`, `frontend/components/grid-scan.css`: retain the supplied GridScan on landing; park its additional WebGL/bloom renderer while a lab owns the viewport.
- `frontend/app/page.tsx`: prewarm simulation code on prompt focus and use client navigation for existing simulation prompt destinations. Construction remains independent of optional tutoring requests.
- `frontend/app/simulation/page.tsx`, `frontend/app/simulation/simulation.css`: larger viewport, substantial scrollable desktop study column, stacked mobile layout, stage headings and inspection content. Restart brings construction back into view.
- `frontend/lib/simulation-construction.ts`, `frontend/lib/simulation-stage-notes.ts`: named stage timing, in-place attachment order and student explanations/definitions. The finished assembly enters its working example automatically.

## Actual checks

`npm.cmd run typecheck` and `npm.cmd run build` passed after the final code edits. No unit, integration or automated browser test suite was added or run. Browser tools were used to operate the real interface and capture frames for visual review.

Manually inspected empty, intermediate and completed states for Rubin, T5000 and Microduck at 1440x900 and 390x844. Reviewed labels, construction order, attached components, text, framing and the automatic working examples. Operated zoom, reset view, inspection, wireframe and restart; checked orbit and reduced-motion presentation. Mobile checks used a resized desktop browser, not a physical phone. No horizontal document overflow was observed.

Found and corrected: a portrait rack callout conflict, a clipped module-board corner on phones, stale reveal-plane bindings on restart, and coincident engraving/trace surfaces. These corrections were rechecked in the running production app.

At 1440x900 the scene column measured 859 CSS pixels and the explanation column 505. Explanation body text measured 17px on desktop and 16px on mobile. The scene's 858x618 CSS-pixel canvas used a 1715x1236 drawing buffer at 2x.

### Measured performance samples

These are short observed renderer-frame samples from this browser during production review, not hardware benchmarks or frame-rate guarantees. Sampling excludes initial warm-up; adaptive resolution can change under sustained load.

| Completed scene | Measured frames/s | DPR | Draw calls | Triangles |
| --- | ---: | ---: | ---: | ---: |
| Vera Rubin | 47.7 | 2 | 123 | 51,248 |
| Jetson Thor T5000 | 55.5 | 2 | 62 | 14,790 |
| Microduck | 67.7 | 2 | 161 | 36,480 |

A separate same-DPR diagnostic on the completed Microduck view measured about 57 frames/s with the background scan running and 88 with it parked, both at 1.5x. This identified an actual competing render workload. Final review retained sharp 2x scene rendering. A Rubin prompt submission reached its first construction stage in 1,374ms in one measured local run.

No scene runtime errors appeared in the final browser-console check. The build retains the existing non-blocking warning about an unrelated parent-directory package lockfile; configuration was left unchanged.

## Scope and provenance

All new geometry is original procedural work. Muse Sim Lab supplied construction-flow guidance; its models and branding were not copied. Lusion informed presentation goals only; no footage, assets or code were reused. Existing manufacturer links remain in each experience.

These remain educational schematics. Internal placement, profiles, signal timing and semiconductor layers are illustrative. T5000 concepts do not reproduce NVIDIA manufacturing or a private floorplan. Microduck uses separate Rockchip-based computing; its walking example is kinematic, without a force/balance solver or live learned policy. The flows do not run actual NVIDIA inference or benchmark hardware.

Existing unrelated edits were retained. `.gitignore`, the existing ZIP, secrets, the legacy robot scene and the original shared theme were not modified. No files were staged, committed or pushed.

## Follow-up: centered composer, shared background and simulation speed

The latest requested background behavior supersedes the earlier decision to park GridScan in the labs. The existing supplied GridScan now runs as one fixed, full-viewport background on the opening screen, hub and simulation routes. Its five shader sources remain identical to the pre-follow-up source; a 30-draws-per-second budget limits its competing render workload. Webcam, preview and gyro remain disabled. Reduced-motion preferences stop the scan, including preference changes made while the page is open.

Changed files in this follow-up:

- `frontend/app/page.tsx`, `frontend/app/globals.css`: centered composer contents and a centered, labeled action; transparent landing surface and readable dark foreground panels.
- `frontend/components/site-background.tsx`, `frontend/components/grid-scan.tsx`, `frontend/components/grid-scan.css`: shared background on every route, bounded draw cadence and live reduced-motion handling.
- `frontend/app/simulation/page.tsx`, `frontend/app/simulation/simulation.css`: accessible 1×/2×/3× and Pause/Resume controls above the viewport, with responsive layout.
- `frontend/components/simulation-geometry.tsx`, `frontend/components/simulation-scene.tsx`, `frontend/components/simulation-quality.tsx`: shared playback state, camera flights driven by the simulation clock, paused demand rendering, and wall-clock shadow budgets. Quality sampling excludes paused frames and continues across short construction stages. Framing reserves space for the controls.

Typecheck and production build passed. The production review uncovered an old generated webpack CSS cache that omitted the latest global styles. That cache was moved into the ignored runtime review directory and a fresh production build restored the expected styling; the existing development server was preserved. No automated test suite was added or run.

Reviewed the opening composer and hub, plus empty, intermediate and completed construction states for all three scenes at 1440×900 and 390×844. The composer input and action shared the same horizontal center. The background remained fixed to the viewport after scrolling and continued animating with the simulation paused. No video elements or horizontal document overflow were observed. Explanations remained 17px on desktop and 16px on mobile. Mobile checks used a resized browser, not a physical phone.

Observed simulation-clock advances over approximately 1.41 real seconds were 1.409 seconds at 1×, 2.830 seconds at 2×, zero while paused, and 4.226 seconds after resuming at 3×. Changing speed did not reset construction. Also operated inspection, zoom, reset view and restart; restart returned to the empty stage while retaining the chosen rate. Completed rack, module and robot examples retained their attached parts. The camera remained fixed during pause and continued its interrupted transition on resume.

The earlier performance table records the previous background configuration, not a guarantee for this follow-up. Foreground rendering keeps its existing adaptive 1.5×–2× pixel-ratio range. No frame-rate guarantee is made. All protected pre-existing file hashes, including `.gitignore`, the ZIP, the legacy robot scene and the generated Next type-reference file, remained unchanged. Work stays local on `feature/robotics-platform`; nothing was staged, committed or pushed.
