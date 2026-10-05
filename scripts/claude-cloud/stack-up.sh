#!/bin/bash
# Bring up the full local stack inside a Claude Code cloud session: Supabase
# in Docker, the schema and seed data, and `next dev`. Generic: repository
# values live in config.sh next to this file.
#
#   bash scripts/claude-cloud/stack-up.sh
#
# Idempotent: whatever is already running is reused, so it is also the way to
# apply a migration added during the session. A fresh VM needs a few minutes
# (the Supabase images are pulled first); a warm one about a minute. Run it in
# the background when the first pull is still ahead.
#
# Cloud-only on purpose: it rewrites $APP_DIR/.env.local, which on a
# developer's machine holds their own settings.
#
# What the cloud VM requires, all found by running the stack there:
#   - The VM cannot raise rlimits, so a container started with an explicit
#     `--ulimit` fails in runc ("error setting rlimit type 7"). The Supabase
#     CLI passes `--ulimit nofile=65536:65536` to edge-runtime only, and that
#     failure stops `supabase start` as a whole (the DB container itself is
#     fine). Hence SUPABASE_EXCLUDE in config.sh keeps edge-runtime out.
#   - Image layers on public.ecr.aws are served from *.cloudfront.net, which
#     the default network allowlist blocks (403). The Supabase CLI pulls from
#     Docker Hub, which is allowed, so nothing to do here as long as that holds;
#     a pull that fails with 403 on cloudfront is this, not a transient error.
#   - The Docker daemon is not always running when the session starts.
set -u

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  echo "stack-up.sh is for Claude Code cloud sessions only (it rewrites .env.local)." >&2
  exit 1
fi

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
HERE="scripts/claude-cloud"
# shellcheck source=config.sh
. "$ROOT/$HERE/config.sh"
WORK=/tmp/claude-cloud
mkdir -p "$WORK"
cd "$ROOT" || exit 1

log() { printf '[stack-up %s] %s\n' "$(date +%H:%M:%S)" "$*"; }
fail() { log "FAILED: $*"; exit 1; }
sb() { (cd "$APP_DIR" && pnpm exec supabase "$@"); }

# --- docker ------------------------------------------------------------------
if ! docker info >/dev/null 2>&1; then
  log "starting the Docker daemon"
  service docker start >/dev/null 2>&1 || (dockerd >"$WORK/dockerd.log" 2>&1 &)
  for _ in $(seq 1 30); do docker info >/dev/null 2>&1 && break; sleep 1; done
  docker info >/dev/null 2>&1 || fail "Docker daemon did not come up (see $WORK/dockerd.log)"
fi

# --- supabase ----------------------------------------------------------------
if sb status >/dev/null 2>&1; then
  log "Supabase already running"
else
  log "starting Supabase (the first run pulls images; this is the slow part)"
  sb start -x "$SUPABASE_EXCLUDE" >"$WORK/supabase-start.log" 2>&1 || {
    tail -n 30 "$WORK/supabase-start.log"
    fail "supabase start"
  }
fi

# --- .env.local --------------------------------------------------------------
# Same as the README's local setup: copy .env.example, then fill in the values
# `supabase status` prints. The values go to the file only.
env_file="$APP_DIR/.env.local"
[ -f "$env_file" ] || cp "$APP_DIR/.env.example" "$env_file" || fail "no $APP_DIR/.env.example to start from"
status="$(sb status -o json)" || fail "supabase status"
STATUS="$status" ENV_FILE="$env_file" ENV_MAP_STR="${ENV_MAP[*]}" node -e '
  const fs = require("fs");
  const s = JSON.parse(process.env.STATUS);
  let text = fs.readFileSync(process.env.ENV_FILE, "utf8");
  for (const pair of process.env.ENV_MAP_STR.split(/\s+/).filter(Boolean)) {
    const [k, field] = pair.split("=");
    const v = s[field];
    if (!v) throw new Error(`supabase status has no field ${field} (for ${k})`);
    const re = new RegExp(`^${k}=.*$`, "m");
    const line = `${k}=${v}`;
    text = re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`;
  }
  fs.writeFileSync(process.env.ENV_FILE, text);
' || fail "filling $env_file"

if declare -F cloud_before_db >/dev/null; then
  cloud_before_db || fail "cloud_before_db (config.sh)"
fi

# --- schema and data ---------------------------------------------------------
log "applying migrations and seeds (${DB_STEPS[*]})"
: >"$WORK/db.log"
for step in "${DB_STEPS[@]}"; do
  pnpm --filter "$PKG_FILTER" "$step" >>"$WORK/db.log" 2>&1 || {
    tail -n 30 "$WORK/db.log"
    fail "$step (full log: $WORK/db.log)"
  }
done

# --- next dev ----------------------------------------------------------------
if curl -fsS -o /dev/null "$APP_URL$HEALTH_PATH" 2>/dev/null; then
  log "next dev already answering"
else
  log "starting next dev (log: $WORK/next-dev.log)"
  (cd "$APP_DIR" && nohup pnpm dev >"$WORK/next-dev.log" 2>&1 &)
  code=""
  for _ in $(seq 1 300); do
    code="$(curl -s -o /dev/null -w '%{http_code}' "$APP_URL$HEALTH_PATH")"
    [ "$code" = 200 ] && break
    sleep 1
  done
  [ "$code" = 200 ] || {
    tail -n 40 "$WORK/next-dev.log"
    fail "next dev did not answer 200 on $HEALTH_PATH (last status: $code)"
  }
fi

project_id="$(sed -n 's/^project_id *= *"\(.*\)"/\1/p' "$APP_DIR/supabase/config.toml")"
first_user="${SEED_USERS%% *}"
cat <<EOF
[stack-up] ready
- App:      $APP_URL (next dev, hot reload; log: $WORK/next-dev.log)
- Database: psql postgresql://postgres:postgres@127.0.0.1:54322/postgres
            (no psql on the VM: docker exec supabase_db_${project_id} psql -U postgres -c '<sql>')
- Sign-in:  dev-seed users ${SEED_USERS// /, } @${SEED_EMAIL_DOMAIN}, password ${SEED_PASSWORD} (e.g. ${first_user}@${SEED_EMAIL_DOMAIN})
- Screens:  bash $HERE/screenshot.sh ${HEALTH_PATH}
EOF
