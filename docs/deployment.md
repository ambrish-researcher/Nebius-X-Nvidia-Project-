# Deployment

No public deployment or paid infrastructure has been created. Choose and authorize hosting before publishing. Test paid inference against actual Token Factory credits separately; do not provision a GPU VM for this CPU physics service.

## Frontend / Vercel

Import the existing GitHub repository and set **Root Directory = frontend**. Allow files outside the root directory. `frontend/vercel.json` installs the root lockfile with `npm ci --prefix ..`, builds the application from the parent script, and publishes `.next`. Node 24 is supported by the locally validated stack. Set backend-only `BACKEND_URL` to the Python service's HTTPS URL **before building**, because Next.js rewrites are generated at build time. Do not put the Nebius credential in Vercel public variables.

The Vercel configuration has not been exercised against a hosting account. Validate Next.js root detection and output-directory settings during the first deployment. The app does not require remote image, model, HDRI, or font hosts.

## Python service

Use a Python 3.12 container host or equivalent process hosting. The repository includes `backend/Dockerfile`; the build context is the repository root. The container is supplied for deployment and has not been built in this session. It installs the locked requirements and starts Uvicorn on port 8000. Supply secrets at runtime. A single small CPU instance is sufficient for the supported dynamics experiments; no GPU is required.

Persist `/app/.runtime` or set `LAB_DATA_DIR` to persistent storage so inference budgets and cache survive restarts. Use one backend instance until a shared transactional budget store is implemented. Set:

- `LAB_ENV=production` and a strong `LAB_ACCESS_TOKEN` to protect model discovery and paid inference. The presenter enters this token in Connections; never publish it in source or frontend bundles.
- `NEBIUS_API_KEY`, a catalog-verified `NEBIUS_MODEL_ID`, base URL, current token prices, maximum output tokens, timeout, and budget ceiling.
- `CORS_ORIGINS` to the exact allowed frontend origins if accessing the backend directly.
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` for the optional storage adapter. Apply the migration and configure Auth independently.

The access token is a minimal single-lab demo gate, not production multiuser identity or a complete abuse-prevention service. Add production authentication, rate limiting, admission control, monitoring, backups, and service-level incident handling before wider use. Never expose a development backend with a paid API key to the Internet.

## Release checks

1. Backend health returns healthy and physics is available; frontend API rewrite reaches it over HTTPS.
2. Run an authenticated model catalog query and choose an actual Nemotron model.
3. Verify account price and Token Factory credit; run one paid generation and inspect its schema, geometry, usage, and provider billing.
4. Perform reference → inspection → workload → comparison → real physics → local history in the deployed browser.
5. Check a generated robot separately. Unsupported physics must remain explicit.
6. Sign in with an owned Supabase account and verify save/load plus denial of cross-user access.
7. Verify desktop/mobile, browser console, keyboard access, reduced motion, and actual GPU frame rate.
8. Record only demonstrated results in the hackathon submission.
