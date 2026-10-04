#!/bin/bash
# SessionStart hook for Claude Code cloud sessions (claude.ai/code, the Claude
# mobile app, `claude --cloud`, routines). Wired up in .claude/settings.json.
#
# Local sessions and GitHub Actions runs exit immediately: the cloud VM is the
# only place where CLAUDE_CODE_REMOTE is "true". There, the hook makes the
# fresh clone workable without anyone at a keyboard:
#
#   1. Node 24 + pnpm 10 first on PATH, for this script and (via
#      CLAUDE_ENV_FILE) for every later command of the session. Falls back to
#      the environment setup script when the environment was not configured
#      with it.
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
# The cloud image keeps its default Node (/opt/node22/bin) ahead of
# /usr/local/bin on PATH, so a Node 24 installed by setup-environment.sh is
# invisible until its bin directory is put first. The hook does that for its
# own commands here, and persists it for every later Bash command of the
# session through CLAUDE_ENV_FILE (see "Persist environment variables" in the
# hooks documentation).
required_node="$(node -p "require('./package.json').volta.node" 2>/dev/null || echo 24.20.0)"
required_pnpm="$(node -p "require('./package.json').packageManager.split('@')[1]" 2>/dev/null || echo 10.13.1)"
node_prefix="/opt/node${required_node%%.*}"

use_installed_node() {
  if [ -x "${node_prefix}/bin/node" ]; then
    export PATH="${node_prefix}/bin:${PATH}"
    hash -r
    if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
      printf 'export PATH="%s/bin:$PATH"\n' "$node_prefix" >> "$CLAUDE_ENV_FILE"
    fi
  fi
}

use_installed_node
if [ "$(node -v 2>/dev/null)" != "v${required_node}" ] || [ "$(pnpm -v 2>/dev/null)" != "$required_pnpm" ]; then
  log "toolchain mismatch (node=$(node -v 2>/dev/null || echo none), pnpm=$(pnpm -v 2>/dev/null || echo none)); running setup-environment.sh"
  NODE_VERSION="$required_node" PNPM_VERSION="$required_pnpm" bash "$ROOT/scripts/claude-cloud/setup-environment.sh" || true
  use_installed_node
fi
if [ "$(node -v 2>/dev/null)" != "v${required_node}" ]; then
  problems+=("Node v${required_node} is not on PATH (found $(node -v 2>/dev/null || echo none)); add scripts/claude-cloud/setup-environment.sh as the environment's Setup script")
fi
if [ "$(pnpm -v 2>/dev/null)" != "$required_pnpm" ]; then
  problems+=("pnpm ${required_pnpm} is not on PATH (found $(pnpm -v 2>/dev/null || echo none))")
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
- The full app can run here, but is not started by default. 'bash scripts/claude-cloud/stack-up.sh' starts local Supabase in Docker, applies migrations and seeds (including dev-seed users), and runs 'next dev' on localhost:3000. It is idempotent; the first run in a fresh VM pulls images and takes a few minutes, so run it in the background.
- When a task changes UI, look at the result: 'bash scripts/claude-cloud/screenshot.sh /ja/<path> [--viewport desktop|mobile|both] [--login alice]', then open each printed PNG with the Read tool so the user sees it in chat. Check both viewports, and show screenshots when proposing or finishing a UI change.
- With the stack up, the database is readable directly: psql postgresql://postgres:postgres@127.0.0.1:54322/postgres
- Still not available: production secrets (OAuth, payments, email, analytics) and anything that calls those services.
- The Maia model (apps/web/engines) is not downloaded; run 'pnpm --filter web download-maia' only if a task needs it.
SUMMARY
if [ ${#problems[@]} -gt 0 ]; then
  printf -- '- Setup problem: %s\n' "${problems[@]}"
fi
exit 0
