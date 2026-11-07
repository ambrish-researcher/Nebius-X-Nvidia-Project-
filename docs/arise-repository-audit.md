# Current ARISE repository audit

Audited locally on `feature/robotics-platform`, 7 November 2026. No branch switch, reset or discard was used. This report describes the cleanup after commit `db9319e`.

## Active project and required files

The active frontend entries are `frontend/app/page.tsx`, `frontend/app/simulation/page.tsx`, `frontend/app/layout.tsx` and `frontend/app/error.tsx`. The shared CSS and `frontend/app/icon.svg` remain. The opening robot flow uses `arise-scene.tsx` and `lib/arise.ts`; the three dedicated staged builds use the `simulation-*` components and data modules. GridScan, its license, the shared background and stage explanation component are referenced by the current routes.

The pre-cleanup TypeScript import audit resolved every local static import, re-export and string-literal dynamic import; 29 files were reachable from current route/layout roots. The backend AST audit followed imports, including lazy imports, from `backend/app/main.py` and reached all ten modules in `backend/app/`. No backend module was classified as an obsolete duplicate.

The root package manifest and lockfile, frontend Next/PostCSS/TypeScript configuration, backend requirement manifests, Dockerfile, setup/run scripts, deployment configuration, optional migration/schema utilities and existing test/CI files are retained. Procedural geometry and embedded shaders are source assets; no separate model ZIP or generated browser capture is required to run the current app. No byte-identical duplicate tracked files were found.

## Confirmed removals

| File | Evidence and action |
| --- | --- |
| `frontend/components/robot-scene.tsx` | Old dashboard/ball-sequence renderer. No current route, other retained source, test, configuration or documentation imports/references its file or exported component. Its only cinematic scene imports belonged to the same retired renderer island. Removed. |
| `frontend/components/cinematic-scene.tsx` | Exports `CinematicWorld` and `ComputeSculpture`; only the removed `robot-scene.tsx` imported them. Current scene rendering uses `simulation-scene.tsx` and `arise-scene.tsx`. Removed. |
| `frontend/components/cinematic-ui.tsx` | Old cinematic overlay and playback UI. No tracked source or test imports its module or exported `CinematicOverlay`. Removed. |
| `frontend/next-env.d.ts` | Next.js-generated declarations, with development/build-dependent paths. Removed from Git tracking only; the pre-existing local copy is preserved. `npm run typecheck` now runs `next typegen frontend` before TypeScript, so a fresh checkout can regenerate declarations. |

No generated folders, dependency trees, real environment files, ZIPs or browser captures were tracked. Their existing local copies were left in place and are excluded from staging. `frontend/AGENTS.md` is retained as repository guidance, despite being maintained by Next.js tooling.

## Ambiguous retirement candidates retained for review

These files are outside the current route import graph but are still imported by retained tests or other retained engineering modules. Being absent from the current UI is insufficient to remove that coverage and its dependencies without a separate retirement decision:

```text
frontend/components/design-evidence.tsx
frontend/components/engineering-studio.tsx
frontend/components/hardware-atlas.tsx
frontend/components/improvement-panel.tsx
frontend/components/lab-panels.tsx
frontend/components/playback-clock.tsx
frontend/components/ui/button.tsx
frontend/lib/cinema.ts
frontend/lib/hardware-atlas.ts
frontend/lib/playback.ts
frontend/lib/renderable.ts
frontend/lib/renderer.ts
frontend/lib/simulation.ts
frontend/lib/utils.ts
```

In particular, `frontend/tests/workflow.test.tsx` imports `lab-panels.tsx`, `frontend/tests/simulation.test.tsx` imports playback/simulation/renderer modules, and `frontend/tests/cinema.test.ts` imports cinema and hardware data. Those transitive dependencies were preserved. This audit did not execute those tests.

The browser configuration currently selects `e2e/cinematic.spec.ts`. Other specifications (`arise`, `generation`, `lab`, `nebius-live`, `scene`, `studio`) and `e2e/fixtures/generated/` remain for explicit/manual selection and historical coverage; fixture data is not disposable runtime output. Their intended retirement is ambiguous. Older milestone, workflow and redesign documents also remain as historical evidence. The README now clearly separates the current application from those older capabilities.

The existing backend migration utility, production smoke utility, GitHub workflow, Vercel settings and optional Supabase schema are retained. Local import reachability alone cannot establish that an operator/deployment utility is obsolete.

## Validation and publication boundary

The cleanup's staged set contains only the confirmed removals above, the typecheck bootstrap change, the updated README and this audit. `.gitignore` changes, `frontend/.gitignore`, the existing `ARISE_Complete_Project.zip`, environment files, credentials and generated local folders remain outside the commit. The generated declaration file is untracked without deleting its local contents.

`npm.cmd run typecheck` and `npm.cmd run build` passed after removing the three disconnected renderer files. A second import audit still found 29 runtime-reachable frontend files and no missing local imports; every remaining frontend module outside that graph is reachable from retained tests. The package manifest and lockfile dependency sets match. All 21 checked entry/configuration/asset/license files remain present. The build retains the existing non-blocking warning about a parent-directory lockfile.

Complete cleanup staging list (`D` removes Git tracking; `M` updates; `A` adds):

```text
M README.md
A docs/arise-repository-audit.md
D frontend/components/cinematic-scene.tsx
D frontend/components/cinematic-ui.tsx
D frontend/components/robot-scene.tsx
D frontend/next-env.d.ts
M package.json
```

No automated tests are requested or run; the cleanup commit uses `[skip ci]` to avoid triggering the existing push-based test workflow. Live NVIDIA output, account access, cloud persistence and deployment availability are outside this cleanup's validation.
