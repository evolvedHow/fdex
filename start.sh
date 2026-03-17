#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

# Load .env if present
if [ -f .env ]; then
  set -a; source .env; set +a
fi

PORT="${PORT:-8000}"

echo "Starting fdex backend on port $PORT..."
uv run uvicorn backend.main:app --reload --host 0.0.0.0 --port "$PORT"
