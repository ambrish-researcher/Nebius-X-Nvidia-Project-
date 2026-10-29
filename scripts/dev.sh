#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .runtime
export NEXT_TELEMETRY_DISABLED=1
.venv/bin/python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 &
backend_pid=$!
trap 'kill "$backend_pid" 2>/dev/null || true' EXIT INT TERM
npm run dev
