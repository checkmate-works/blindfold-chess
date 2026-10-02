#!/bin/bash
# SessionStart hook for Claude Code cloud sessions (claude.ai/code, the Claude
# mobile app, `claude --cloud`, routines). Wired up in .claude/settings.json.
#
# Local sessions and GitHub Actions runs exit immediately: the cloud VM is the
# only place where CLAUDE_CODE_REMOTE is "true". There, the hook makes the
# fresh clone workable without anyone at a keyboard:
#
#   1. Node 24 + pnpm 10 on PATH, falling back to the environment setup script
#      when the cloud environment was not configured with it.
#   2. `pnpm install --frozen-lockfile`, skipped when node_modules already
#      matches the lockfile (the hook also runs on every resume).
#   3. Stockfish engine files copied into apps/web/public, so the engine code
#      paths work the same way they do after a local setup.
#
# Everything the hook prints to stdout is handed to Claude as context, so the
# tail of this script summarises what the session can and cannot do. The hook
# never fails the session: errors are reported in that summary instead.
set -u

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$ROOT" || exit 0

log() { printf '[claude-cloud session-start] %s\n' "$*"; }
problems=()

# --- 1. toolchain -----------------------------------------------------------
required_node="$(node -p "require('./package.json').volta.node" 2>/dev/null || echo 24.20.0)"
required_pnpm="$(node -p "require('./package.json').packageManager.split('@')[1]" 2>/dev/null || echo 10.13.1)"

if [ "$(node -v 2>/dev/null)" != "v${required_node}" ] || [ "$(pnpm -v 2>/dev/null)" != "$required_pnpm" ]; then
  log "toolchain mismatch (node=$(node -v 2>/dev/null || echo none), pnpm=$(pnpm -v 2>/dev/null || echo none)); running setup-environment.sh"
  NODE_VERSION="$required_node" PNPM_VERSION="$required_pnpm" bash "$ROOT/scripts/claude-cloud/setup-environment.sh" || true
  hash -r
fi
if [ "$(node -v 2>/dev/null)" != "v${required_node}" ]; then
  problems+=("Node v${required_node} is not on PATH (found $(node -v 2>/dev/null || echo none)); add scripts/claude-cloud/setup-environment.sh as the environment's Setup script")
fi

# --- 2. dependencies --------------------------------------------------------
stamp="node_modules/.claude-cloud-lockfile.sha"
want="$( (sha256sum pnpm-lock.yaml 2>/dev/null || shasum -a 256 pnpm-lock.yaml) | cut -d' ' -f1)"
if [ -d node_modules ] && [ "$(cat "$stamp" 2>/dev/null)" = "$want" ]; then
  log "dependencies already installed for current lockfile"
else
  log "running pnpm install --frozen-lockfile"
  if HUSKY=0 pnpm install --frozen-lockfile --reporter=append-only; then
    printf '%s' "$want" > "$stamp"
  else
    problems+=("pnpm install --frozen-lockfile failed; run it again and read the error before editing code")
  fi
fi

# --- 3. engine assets -------------------------------------------------------
if [ ! -f apps/web/public/stockfish.wasm ]; then
  log "copying Stockfish engine files"
  pnpm --filter web copy-stockfish >/dev/null 2>&1 || problems+=("pnpm --filter web copy-stockfish failed")
fi

# --- summary handed to Claude ----------------------------------------------
cat <<SUMMARY

Cloud session setup for blindfold-chess
- Node $(node -v 2>/dev/null || echo missing), pnpm $(pnpm -v 2>/dev/null || echo missing), dependencies installed from pnpm-lock.yaml.
- Quality gates (run all three before finishing, fix until green): pnpm lint && pnpm typecheck && pnpm test
- Not available here: a database and the app's secrets. 'pnpm build' needs a Postgres connection and will fail; 'pnpm dev' starts but pages that query the database will error. Verify behaviour with unit tests and typecheck instead, and say so in the PR when a change needs a manual check.
- The Maia model (apps/web/engines) is not downloaded; run 'pnpm --filter web download-maia' only if a task needs it.
SUMMARY
if [ ${#problems[@]} -gt 0 ]; then
  printf -- '- Setup problem: %s\n' "${problems[@]}"
fi
exit 0
