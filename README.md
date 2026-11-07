# ARISE

Interactive engineering explanations in the existing Next.js and FastAPI project. The repository and package names remain unchanged.

## Current application

- `/`: the centered prompt composer and the retained humanoid, drone and Microduck robot-learning flow.
- `/simulation`: the simulation hub, linking to Vera Rubin, Jetson Thor T5000 and Microduck.
- `/simulation?scene=rubin`, `?scene=thor`, `?scene=microduck`: real-time 3D construction from an empty stage. Named assemblies attach in order, remain assembled and enter an educational working example. Stage explanations, 1x / 2x / 3x speed, Pause/Resume, orbit, zoom, inspection and restart are available.
- The supplied green-and-black GridScan runs behind the pages. No background video, prerecorded simulation or webcam preview is used.

The simulation hub is the direct entry to all three staged builds. The opening screen's existing Microduck prompt also retains its separate robot-task flow. These are intentional current features.

Scenes are educational schematics. Vera Rubin is a rack-scale computing platform; its illustrated internal arrangement is not a private service drawing. Thor's fabrication and chip layers explain general concepts rather than NVIDIA's manufacturing process. Microduck uses separate Rockchip-based computing; its motion is kinematic, without a balance/force solver or a live learned policy. The animated data paths do not run actual NVIDIA workloads or benchmark hardware.

## Install and run

Use Node.js 20.9 or newer and Python 3.11 or newer. The existing backend CI configuration uses Python 3.12. Run commands from the repository root. Dependency versions are recorded in `package-lock.json` and `backend/requirements.lock`.

Windows PowerShell:

```powershell
npm.cmd ci
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.lock
```

Start the backend:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

In another terminal, start the frontend:

```powershell
npm.cmd run dev
```

Open http://localhost:3000/simulation. On Linux/macOS, `./scripts/setup.sh` installs dependencies and `./scripts/dev.sh` starts both services.

Production validation and preview:

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run start -- --port 3001
```

The typecheck command generates Next.js declarations first, so it also works when the generated `frontend/next-env.d.ts` and `.next` folder are absent in a clean checkout. Development and production builds generate them as well. Restart a production preview after rebuilding to avoid serving old asset references.

The frontend proxies `/api/*` to `http://127.0.0.1:8000` unless `BACKEND_URL` is supplied to Next.js. The hub, 3D construction and built-in explanations work without a provider key. The backend's `/api/health` endpoint is a local liveness check.

## Optional NVIDIA stage explanations

Supply `NEBIUS_API_KEY` only in the backend environment, then restart the backend. Do not put it in browser code or a `NEXT_PUBLIC_` variable. The backend can also load local `.env.local` or `.env` settings; keep those files out of Git.

**Pause & explain this stage** sends the current educational context through `POST /api/simulation/explain` to the fixed model `nvidia/nemotron-3-super-120b-a12b`, using `https://api.tokenfactory.nebius.com/v1/chat/completions`. The requested service root without `/v1/` is also accepted as configuration.

Only a validated response with the exact returned model ID receives the attribution **NVIDIA Nemotron 3 Super · served via Nebius Token Factory**. The panel and ledger retain model identity, available request/completion identifiers, UTC timestamps and measured latency. Cached responses retain their original evidence. Missing configuration or failed requests show an explicitly labeled built-in fallback; construction never waits on optional inference by itself.

The existing local inference budget is capped at $1. Prices are read from the authenticated verbose model catalog for stage requests. Paid POSTs are not automatically retried; uncertain charges retain their reservations. Keep `.runtime/usage.sqlite` private and persistent when inference is enabled. It is a local spend guard, not a verified account balance. Public deployments require `LAB_ACCESS_TOKEN` for paid routes. The older `/api/ai` tutor additionally uses its existing model and pricing settings.

The last recorded stage-integration review verified fallback behavior without a configured backend key, not a successful live model response. See [stage integration and verification](docs/arise-nebius-stage-integration.md) for that boundary.

## Project files and documentation

| Path | Purpose |
| --- | --- |
| `frontend/app/` | Active Next.js pages, shared layout, styles and error handling. |
| `frontend/components/arise-scene.tsx`, `frontend/lib/arise.ts` | Retained opening robot-learning flow. |
| `frontend/components/simulation-*.tsx`, `frontend/lib/simulation-*.ts` | Staged geometry, shared resources, construction, camera direction and educational text. |
| `frontend/components/grid-scan.*`, `site-background.tsx`, `stage-explanation.tsx` | Background and optional model explanation UI. |
| `backend/app/` | FastAPI routes, validated data, Nebius client, ledger, retained generation and physics capabilities. |
| `package.json`, `package-lock.json`, `frontend/*config*` | Frontend dependency, type and build configuration. |
| `backend/requirements.lock`, `backend/requirements.txt`, `backend/Dockerfile` | Backend dependencies and container definition. |
| `scripts/`, `vercel.json`, `.dockerignore`, `.github/` | Existing run, deployment and CI configuration. |
| `supabase/001_projects.sql` | Optional retained persistence schema; no Supabase deployment is implied. |

Current references:

- [Repository cleanup, retained files and ambiguity review](docs/arise-repository-audit.md)
- [Construction visuals and local review](docs/arise-visual-quality-review.md)
- [Simulation presentation review](docs/cinematic-simulation-review.md)
- [Nebius stage integration](docs/arise-nebius-stage-integration.md)
- [Deployment configuration](docs/deployment.md)

Other milestone and redesign documents record earlier ARISE versions. Older engineering-panel modules and tests are retained where their dependencies or intended retirement are ambiguous; they do not define the active routes. See the repository audit before removing them. Existing test suites remain in the project; they were not run for this cleanup.

Local environment files, API keys, dependencies, build output, virtual environments, runtime ledgers, browser captures and the existing submission ZIP are not source deliverables. The cleanup preserves existing `.gitignore` edits without committing them.

Project code uses the [repository license](LICENSE). The supplied GridScan carries its [included third-party license](frontend/components/grid-scan.LICENSE.md).
