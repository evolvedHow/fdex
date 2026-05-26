#!/usr/bin/env bash
# Sync data files from the FDP shared data platform into fdex/data/.
# Run this before `npm run dev` or `npm run build` when the platform data has changed.
#
# Usage:
#   ./scripts/sync_data.sh
#   FDP_WORKSPACE=my_shapes ./scripts/sync_data.sh   # test a workspace
#   ./scripts/sync_data.sh --dry-run                 # preview without copying

set -e

if [ -n "$CI" ]; then
  echo "CI environment — skipping FDP sync (data already in repo)"
  exit 0
fi

cd "$(dirname "$0")/.."

DEST="$(pwd)/data"
FDP_ROOT="${FDP_ROOT:-$(realpath ../fdp)}"

echo "FDP root  : $FDP_ROOT"
echo "Dest      : $DEST"
echo ""

FDP_ROOT="$FDP_ROOT" python -m fdp.cli sync-app fdex --dest "$DEST" "$@"
