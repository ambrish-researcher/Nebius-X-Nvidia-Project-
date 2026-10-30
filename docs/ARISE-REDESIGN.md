# ARISE local cinematic rebuild

Implemented on `feature/robotics-platform`. Existing `.gitignore` and `frontend/.gitignore` edits are intentionally excluded from this change.

## Experience

The active page replaces the previous dashboard and ball sequence with a brief ARISE loader, a cinematic prompt, procedural assembly, robot tasks, compute guidance and student learning. Three deterministic templates work without the backend: humanoid, drone and Microduck. Ambiguous and unrelated robot prompts are rejected.

The React Three Fiber scene supports orbit, zoom, camera reset, component selection, exploded view, wireframe and replay. Component buttons select the same geometry used by scene picking. Six assembly stages progress without an AI request. Task demos use actual mesh transforms: humanoid arm raise/wave/head turn; drone takeoff/hover/land; Microduck head turn/nod/leg articulation. Reports describe the programmed parameters and the limits of kinematic animation.

The learning panel includes component roles, assembly steps, software architecture, a scored three-question quiz with explanations and retry, and Ask ARISE. The tutor uses the existing authenticated `/api/ai` contract (`data.answer`), bounds prompts to 1,200 characters and waits at most 20 seconds. It makes no automatic paid retries. Failed requests remain visible alongside explicitly labeled local explanations. An aborted request may still have reached the provider; do not assume timeout means no usage.

FastAPI, authentication, generation tracking, database and deployment configuration remain in place. The new deterministic templates do not use the old arbitrary AI geometry-generation flow.

## Running locally on Windows

```powershell
npm.cmd ci
npm.cmd run dev -- --port 3100
```

In another terminal, using Python 3.11 and the existing requirements:

```powershell
uv run --python 3.11 --with-requirements backend/requirements.txt python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:3100. Port 3000 was already serving another application during verification. The frontend's existing local API rewrite targets port 8000 unless `BACKEND_URL` is configured.

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
$env:E2E_BASE_URL='http://127.0.0.1:3100'
npm.cmd run test:e2e
uv run --python 3.11 --with-requirements backend/requirements.txt python -m pytest backend/tests -q
```

The default browser suite is `e2e/cinematic.spec.ts`; older specs target the retired interface and are retained as historical coverage. Chrome is detected at the standard Windows installation path; override `CHROMIUM_PATH` where needed. For production browser verification, finish the build before starting `next start`; restart the server after rebuilding to avoid stale asset references.

## Verification and boundaries

- TypeScript validation and frontend production build passed.
- Frontend unit suite: 39 passed, covering three-robot resolution, rejection, geometry identifiers and kinematic transforms, alongside existing unit coverage.
- Backend suite: 78 passed, 1 skipped. Includes API validation, generation failures, authentication guards, unconfigured database responses and simulation diagnostics. One dependency deprecation warning remains.
- All three frontend template payloads validated against the backend `RobotSpecification`. Tutor requests returned explicit 503 responses with no configured provider. Database readiness returned explicit 503 with no configured database.
- Browser suite: 6 passed against the final clean production build (desktop and mobile). Covers component buttons, inspection controls, replay, all nine demos, quiz checking/retry, failed and successful mocked tutor contracts, session tokens, and WebGL-unavailable access. Screenshots are in `test-results/`.

No deployment or push is part of this local-only rebuild. No paid inference was performed. Live Nebius credentials and Supabase configuration were absent, so live inference, cloud login and real database persistence are not verified. Mocked AI contract checks do not establish live provider success. Browser tasks are prescribed kinematics, not physics simulation or validated hardware behavior. Microduck geometry, mass, power assumptions and joint subsets are educational interpretations, not official hardware specifications. WebGL failure leaves text learning and component inspection available; it cannot display 3D motion.

## Reference inspection

Opened frames around 00:30, 00:34, 00:39, 00:46, 00:51 and 00:55 from the supplied local recording. Extracted reference images are local QA artifacts, not website backgrounds. The implementation uses original procedural geometry and runtime rendering.

- Visual direction: https://lusion.co/
- Microduck identity and simulation context: https://huggingface.co/blog/nvidia/microduck-isaac-lab-sim-to-real
- NVIDIA's Microduck workflow: https://developer.nvidia.com/blog/using-ai-agents-to-teach-robots-like-microduck-to-walk-in-simulation/
- Jetson guidance: https://docs.nvidia.com/jetson/orin-nano-devkit/user-guide/index.html

Hardware guidance makes no benchmark, certified compatibility or flight-time claims. CPU/controller and GPU responsibilities are discussed separately; component power, memory, cooling and integration still require project-specific validation.
