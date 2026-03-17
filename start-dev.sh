#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

# Load .env if present
if [ -f .env ]; then
  set -a; source .env; set +a
fi

PORT="${PORT:-8000}"

echo "Starting backend on port $PORT and frontend dev server on port 5173..."
echo "Open http://localhost:5173 in your browser"
echo ""

# Start backend in background
uv run uvicorn backend.main:app --reload --host 0.0.0.0 --port "$PORT" &
BACKEND_PID=$!

# Start frontend dev server
cd frontend
npm run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

wait
