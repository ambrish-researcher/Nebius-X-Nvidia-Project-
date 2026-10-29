# Nebius-X-Nvidia-Project-

**Robotics Intelligence Platform** — an immersive engineering laboratory for turning robot ideas into inspectable 3D concepts, understanding compute trade-offs, and testing supported dynamics.

The repository name is unchanged. The application uses the directive's internal identifier, `robotics-intelligence-platform`.

## What works locally

- Continuous dark industrial 3D workspace: procedural component geometry, dependency-driven assembly, orbit/zoom/pan, exploded and transparent views, component isolation, focus, annotations, replay, speed, and camera presets.
- Distinct, clearly labeled rover and articulated-arm **reference designs**. These are not AI output.
- Pydantic robot specifications with bounded geometry, unique identifiers, valid joint relationships, and acyclic assembly dependencies.
- Task inputs and deterministic memory, compute power, vision, manipulation, environment, and network checks. CPU control workloads are not automatically assigned a GPU.
- CPU, microcontroller, Jetson Orin Nano, AGX Orin, and H100 comparison. Power envelopes and memory capacities are reference inputs; no fabricated latency, price, TOPS-derived FPS, or GPU speedup.
- **Real MuJoCo 3.3.7** four-wheel-rover drive experiment. The model uses the current specification's components, masses, and geometry. Playback, trajectory, joint states, actuator forces, contact counts, and JSON export come from actual solver state.
- Browser project history, experiment history, quiz attempts, and flashcard review state.

## Implemented integrations that still need live verification

**Nebius Token Factory / NVIDIA Nemotron:** backend-only authenticated model discovery, JSON responses, Pydantic validation, timeout, no automatic paid retry, persistent response cache, token usage, and a SQLite budget ledger. Generation, task interpretation, tutor, recommendations, result analysis, quiz, and flashcard workflows have adapters. An unavailable provider returns a visible error; there is no scripted AI fallback.

**Supabase:** email sign-in and user-JWT REST persistence with row-level security. Browser persistence works independently. Cloud sync requires a project and migration.

**Not complete:** authenticated Nemotron inference, provider credit verification, Supabase integration testing, and a public deployment. No credentials were available. Public AI requests additionally require a lab access token. This is a functional local prototype, not a completed P0 hackathon submission.

## Run

Requires Node.js 20.9+ (validated with 24), Python 3.12, a modern browser, and network access to npm/PyPI. GPU and MuJoCo rendering are not required on the backend.

```bash
./scripts/setup.sh
# Optional: copy .env.example to .env, then enter real values securely.
./scripts/dev.sh
```

The frontend listens on port 3000 and the backend on 8000. The Next.js `/api/*` rewrite targets the backend, keeping keys off the client. For separate processes:

```bash
.venv/bin/python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
# In another terminal, from the repository root:
npm run dev
```

The default reference workflow works without paid AI. Open the lab, inspect a component, set a task in Challenge, compare compute candidates, then run a flat-floor drive experiment in Simulate. Learn contains the live-provider-dependent tutor, quizzes, and flashcards.

## Enable real NVIDIA inference

1. Allow `api.tokenfactory.nebius.com` through the environment's HTTPS policy and configure `NEBIUS_API_KEY` securely on the backend. Never use a `NEXT_PUBLIC_` API key.
2. Use Connections → Discover NVIDIA models, or authenticated `GET /api/models`. Select an actual returned Nemotron ID as `NEBIUS_MODEL_ID`; no default model is invented.
3. Verify the model's current input/output token prices in the account, then configure `NEBIUS_INPUT_USD_PER_MILLION` and `NEBIUS_OUTPUT_USD_PER_MILLION`. Paid calls are blocked until prices are configured. Check the **Token Factory** balance independently; AI Cloud credit is not assumed interchangeable.
4. Set `NEBIUS_BUDGET_LIMIT_USD` (hard-capped by the application at $25), `NEBIUS_MAX_OUTPUT_TOKENS=2048`, and `NEBIUS_REQUEST_TIMEOUT=60`.
5. Restart the backend. Run the live catalog test and one real generation. Validate output and actual account usage before a demonstration.

The ledger is a **local application spend guard, not the provider balance**. Reservations are transactional and conservative. A failed/uncertain request retains its reservation and blocks an identical paid retry until operator reconciliation. Cache hits avoid a second inference charge. Keep `.runtime/usage.sqlite` on persistent storage; do not run multiple independent backend replicas with separate budgets. No cloud infrastructure is provisioned by this project.

## Supabase persistence

Apply [supabase/001_projects.sql](supabase/001_projects.sql) once in your project's SQL editor, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` on the backend, and allow the specific project hostname in the network policy. Create an email/password account using Supabase's supported auth flow. Sign in using Connections; Notebook offers cloud sync and retrieval. User JWTs are verified against Supabase Auth; REST writes use that JWT and RLS, never a service-role bypass. Tokens remain in session storage; no password is persisted. Expired sessions require sign-in again.

## Validate

```bash
.venv/bin/python -m pytest backend/tests -q
npm test
npm run typecheck
npm run build
.venv/bin/python scripts/smoke.py
# With both services running and Chromium installed:
npm run test:e2e
```

`CHROMIUM_PATH` selects an installed Chromium executable; the cloud image has `/usr/bin/chromium`. Browser tests cover desktop/mobile reference workflows, real physics, local persistence, distinct geometry families, and explicit unavailable-AI behavior. The live catalog test is skipped without a credential; mocked transport tests do **not** establish real inference.

The production build uses Next.js's supported Webpack builder because Turbopack's CSS-worker socket is restricted in this cloud execution environment.

## Evidence and limits

A local reference run simulated 3.0 s in 1,500 steps, traveling approximately 1.36 m with maximum tilt below 0.001 rad. This is a physics-model result using illustrative friction and masses, not physical hardware validation or task completion. Actual run timing is recorded per experiment. Hardware selection intentionally does not alter the trajectory unless a real inference measurement is supplied in a future adapter.

The in-app FPS indicator samples actual frame intervals. Software-rendered cloud Chromium was slow (roughly 2–4 FPS before adaptive quality changes); 60 FPS on GPU hardware has **not** been verified. Geometry and rendering are original procedural assets; no Lusion source, branding, or assets are copied. No external HDRI, font service, or model CDN is needed.

See [architecture](docs/architecture.md), [implementation status](docs/status.md), [deployment instructions](docs/deployment.md), and the [three-minute demo plan](docs/demo.md). MIT licensed.
