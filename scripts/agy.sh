#!/usr/bin/env bash
# Run the Antigravity CLI (agy) locally with the standing design brief.
#
#   scripts/agy.sh "rebuild the Calendar view"
#
# agy is installed at ~/.local/bin/agy and signed in as ponhareeshn@gmail.com.
# Print mode waits for the turn to finish, so run long jobs in the background.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
[ $# -ge 1 ] || { echo "usage: $0 \"<task>\"" >&2; exit 2; }
PROMPT="$(cat docs/AGY-BRIEF.md)

---

## THIS RUN

$*"
exec agy -p "$PROMPT" \
  --dangerously-skip-permissions --mode accept-edits --effort high \
  --add-dir "$ROOT"
