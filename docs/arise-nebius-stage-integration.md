# ARISE stage explanations through Nebius

Implemented locally on `feature/robotics-platform`. No credentials were written into source or browser code.

## Request flow

The explanation panel's **Pause & explain this stage** action holds the current construction stage, then sends its title, educational context, facts and reference links to `POST /api/simulation/explain`. If playback is already paused, the action reads **Explain this stage with NVIDIA**. Construction otherwise starts and progresses independently of AI. Existing built-in explanations remain available as explicitly labeled fallback content.

The backend reads `NEBIUS_API_KEY` from its environment and uses the fixed model `nvidia/nemotron-3-super-120b-a12b`. Both the requested service root `https://api.tokenfactory.nebius.com/` and its `/v1/` form are accepted; completion requests use `https://api.tokenfactory.nebius.com/v1/chat/completions`. No browser request carries the provider key. Existing lab access-token protection, local spending cap, persistent cache and uncertain-charge reservations remain in effect. Current token prices are obtained from the authenticated verbose model catalog; unavailable prices do not silently become free inference. Paid POSTs are never automatically retried.

The API validates the returned model ID and structured explanation before exposing this exact attribution:

> NVIDIA Nemotron 3 Super · served via Nebius Token Factory

The verification disclosure shows the returned model ID, request ID when supplied by the provider, completion ID, UTC verification timestamp, provider timestamp when available, and measured completion-request round-trip latency. These fields persist in the existing usage ledger (`.runtime/usage.sqlite` by default, or the configured PostgreSQL ledger). Cached output is labeled as previously generated and retains the original evidence and timing; a cache hit does not manufacture a new live verification. Stage changes discard the prior panel state, so an old response cannot be attributed to another stage.

## Verification performed

- Typecheck, production build and Python compilation passed. No automated test suite was added or run.
- Operated the real production UI on localhost:3001 against the backend on port 8000: Rubin's upper compute trays, Thor's conceptual logic stage and Microduck's completed walking/control example.
- Each request returned HTTP 503 with `source: fallback` because the backend key is not yet configured. The UI preserved its local explanation, displayed the fallback label, and showed the missing-configuration message without claiming NVIDIA generation.
- Verified pause-on-request, resume to the next stage, clearing the previous error on stage change, and mobile readability at 390×844 without horizontal overflow. Reviewed desktop at 1440×900.
- The ledger contains the added metadata columns. No successful live response, returned model ID, provider request ID, success timestamp or live latency has been observed in this review. They remain unverified until the backend starts with the user's environment variable and a real request succeeds. No fabricated success response was used for verification.

The local, credential-free review record is `.runtime/stage-nemotron-verification.json`. After setting `NEBIUS_API_KEY`, restart the backend from the environment that holds it and use the stage action. The response disclosure and persistent ledger will record evidence from the actual response automatically.

## Files changed

- `backend/app/ai.py`: accepted service root, fixed-model support, authenticated catalog pricing and persisted response evidence.
- `backend/app/postgres_ledger.py`: additive metadata-column migration matching SQLite.
- `backend/app/stage_explanations.py`: bounded stage context and validated explanation schema.
- `backend/app/main.py`: protected stage route and standard local environment-file loading.
- `frontend/components/stage-explanation.tsx`: on-demand stage request, fallback content and verification disclosure.
- `frontend/app/simulation/page.tsx`, `frontend/app/simulation/simulation.css`: explanation-panel integration and theme styling.

Official references: [Nebius chat-completion API](https://docs.tokenfactory.nebius.com/api-reference/inference/create-chat-completion), [verbose model catalog](https://docs.tokenfactory.nebius.com/api-reference/examples/list-of-models), and [Nebius's Nemotron 3 Super model example](https://github.com/nebius/token-factory-cookbook/blob/main/models/nemotron/nemotron3-super-120B.md).
