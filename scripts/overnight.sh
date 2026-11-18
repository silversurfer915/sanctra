#!/usr/bin/env bash
# Overnight supervisor for the Sanctra redesign.
#
# Cron runs this every 15 min. It never edits code itself:
#   · agy busy        → exit silently
#   · dirty tree      → build+lint; green = commit + deploy, red = revert task
#   · queue has work  → launch the next agy task in the background
#
# Deterministic on purpose: no LLM in the loop, no token burn while the user
# sleeps. Morning summary is a separate cron job.
set -uo pipefail
cd "$HOME/workspace/sanctra" || exit 1
LOG="$HOME/sanctra-overnight.log"
QUEUE="docs/agy-queue.md"
say() { echo "$(date '+%F %T') $*" | tee -a "$LOG"; }

# 1 · one agent at a time
if pgrep -f "agy -p" >/dev/null 2>&1; then
  exit 0
fi

# 2 · verify whatever the last turn left behind
if [ -n "$(git status --porcelain)" ]; then
  if npm run build > /tmp/sanctra-gate.log 2>&1 && npm run lint >> /tmp/sanctra-gate.log 2>&1; then
    CURRENT=$(grep -m1 '^- \[~\]' "$QUEUE" | sed 's/^- \[~\] //')
    git add -A
    git commit -q -m "design(overnight): ${CURRENT:-agy pass}" || true
    git push -q origin main && gh workflow run deploy.yml --ref main \
      && say "green → committed + deploy triggered · ${CURRENT:-agy pass}" \
      || say "green but push/deploy failed · ${CURRENT:-agy pass}"
    if [ -n "$CURRENT" ]; then
      python3 - "$QUEUE" "$CURRENT" <<'PY'
import sys, pathlib
q, task = sys.argv[1], sys.argv[2]
p = pathlib.Path(q); t = p.read_text()
p.write_text(t.replace(f"- [~] {task}", f"- [x] {task}", 1))
PY
    fi
  else
    git checkout -- . 2>/dev/null
    git clean -fdq
    CURRENT=$(grep -m1 '^- \[~\]' "$QUEUE" | sed 's/^- \[~\] //')
    if [ -n "$CURRENT" ]; then
      python3 - "$QUEUE" "$CURRENT" <<'PY'
import sys, pathlib
q, task = sys.argv[1], sys.argv[2]
p = pathlib.Path(q); t = p.read_text()
p.write_text(t.replace(f"- [~] {task}", f"- [!] {task}", 1))
PY
    fi
    say "RED → reverted · ${CURRENT:-unknown task} (see /tmp/sanctra-gate.log)"
  fi
fi

# 3 · start the next task
NEXT=$(grep -m1 '^- \[ \]' "$QUEUE" | sed 's/^- \[ \] //')
if [ -z "$NEXT" ]; then
  say "queue empty — idle"
  exit 0
fi
python3 - "$QUEUE" "$NEXT" <<'PY'
import sys, pathlib
q, task = sys.argv[1], sys.argv[2]
p = pathlib.Path(q); t = p.read_text()
p.write_text(t.replace(f"- [ ] {task}", f"- [~] {task}", 1))
PY
nohup timeout 3000 ./scripts/agy.sh "$NEXT" >> "$HOME/sanctra-agy.log" 2>&1 &
say "started · $NEXT"
