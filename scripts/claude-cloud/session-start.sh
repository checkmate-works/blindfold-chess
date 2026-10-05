#!/bin/bash
# SessionStart hook for Claude Code cloud sessions (claude.ai/code, the Claude
# mobile app, `claude --cloud`, routines). Wired up in .claude/settings.json.
# Generic: repository values live in config.sh next to this file.
#
# Local sessions and GitHub Actions runs exit immediately: the cloud VM is the
# only place where CLAUDE_CODE_REMOTE is "true". There, the hook makes the
# fresh clone workable without anyone at a keyboard:
#
#   1. The Node major from package.json first on PATH, for this script and
#      (via CLAUDE_ENV_FILE) for every later command of the session. Falls
#      back to setup-environment.sh when the environment was not configured
#      with it.
#   2. Git submodules checked out when the clone left them empty.
#   3. Dependencies installed, skipped when node_modules already matches the
#      lockfile (the hook also runs on every resume).
#   4. cloud_after_install from config.sh, if defined.
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
HERE="scripts/claude-cloud"
# shellcheck source=config.sh
. "$ROOT/$HERE/config.sh"

log() { printf '[claude-cloud session-start] %s\n' "$*"; }
problems=()

# --- 1. toolchain -----------------------------------------------------------
# The cloud image keeps its default Node (/opt/node22/bin) ahead of
# /usr/local/bin on PATH, so a Node installed by setup-environment.sh is
# invisible until its bin directory is put first. The hook does that for its
# own commands here, and persists it for every later Bash command of the
# session through CLAUDE_ENV_FILE ("Persist environment variables" in the
# hooks documentation). Only the major is enforced: `engines` ranges are
# majors, and pnpm fetches the exact `packageManager` version by itself.
required_major="$(node -p "
  const p = require('./package.json');
  const e = (p.engines && p.engines.node) || '';
  const m = e.match(/(\d+)/);
  m ? m[1] : (p.volta && p.volta.node ? p.volta.node.split('.')[0] : '')
" 2>/dev/null)"
[ -n "$required_major" ] || required_major=24
node_prefix="/opt/node${required_major}"

node_major() { node -v 2>/dev/null | sed 's/^v\([0-9]*\).*/\1/'; }

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
if [ "$(node_major)" != "$required_major" ] || ! command -v pnpm >/dev/null 2>&1; then
  log "toolchain mismatch (node=$(node -v 2>/dev/null || echo none), pnpm=$(pnpm -v 2>/dev/null || echo none)); running setup-environment.sh"
  NODE_MAJOR="$required_major" bash "$ROOT/$HERE/setup-environment.sh" || true
  use_installed_node
fi
if [ "$(node_major)" != "$required_major" ]; then
  problems+=("Node ${required_major} is not on PATH (found $(node -v 2>/dev/null || echo none)); add $HERE/setup-environment.sh as the environment's Setup script")
fi
if ! command -v pnpm >/dev/null 2>&1; then
  problems+=("pnpm is not on PATH")
fi

# --- 2. submodules ----------------------------------------------------------
# The cloud clone may leave submodules empty. The GitHub proxy only serves
# repositories attached to the session, so a submodule from another repository
# can fail here even when it is public; the summary then says so.
if [ -f .gitmodules ]; then
  while read -r sub; do
    [ -n "$sub" ] || continue
    if [ -z "$(ls -A "$sub" 2>/dev/null)" ]; then
      log "checking out submodule $sub"
      if ! git submodule update --init --depth 1 -- "$sub" >/dev/null 2>&1; then
        problems+=("submodule $sub could not be checked out (the cloud GitHub proxy may refuse repositories not attached to the session); fetch the files you need from raw.githubusercontent.com instead")
      fi
    fi
  done < <(git config --file .gitmodules --get-regexp 'submodule\..*\.path' | awk '{print $2}')
fi

# --- 3. dependencies --------------------------------------------------------
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

# --- 4. repository hook -----------------------------------------------------
if declare -F cloud_after_install >/dev/null; then
  cloud_after_install || problems+=("cloud_after_install (config.sh) failed")
fi

# --- summary handed to Claude ----------------------------------------------
project_id="$(sed -n 's/^project_id *= *"\(.*\)"/\1/p' "$APP_DIR/supabase/config.toml" 2>/dev/null)"
first_user="${SEED_USERS%% *}"
cat <<SUMMARY

Cloud session setup for ${CLOUD_PROJECT_NAME}
- Node $(node -v 2>/dev/null || echo missing), pnpm $(pnpm -v 2>/dev/null || echo missing), dependencies installed from pnpm-lock.yaml.
- Quality gates (run before finishing, fix until green): ${QUALITY_GATES}
- The full app can run here, but is not started by default. 'bash $HERE/stack-up.sh' starts local Supabase in Docker, applies migrations and seeds (including dev-seed users), and runs 'next dev' on ${APP_URL}. It is idempotent; the first run in a fresh VM pulls images and takes a few minutes, so run it in the background.
- When a task changes UI, look at the result: 'bash $HERE/screenshot.sh <path> [--viewport desktop|mobile|both] [--login ${first_user}]', then open each printed PNG with the Read tool so the user sees it in chat. Check both viewports, and show screenshots when proposing or finishing a UI change.
- With the stack up, the database is readable directly: psql postgresql://postgres:postgres@127.0.0.1:54322/postgres (or, without psql on the VM, docker exec supabase_db_${project_id} psql -U postgres -c '<sql>').
- Still not available: production secrets (OAuth, payments, email, analytics) and anything that calls those services.
SUMMARY
if declare -F cloud_extra_summary >/dev/null; then
  cloud_extra_summary
fi
if [ ${#problems[@]} -gt 0 ]; then
  printf -- '- Setup problem: %s\n' "${problems[@]}"
fi
exit 0
