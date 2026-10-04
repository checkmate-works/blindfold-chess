#!/bin/bash
# Bring up the full local stack inside a Claude Code cloud session: Supabase
# in Docker, the schema and seed data, and `next dev` on localhost:3000.
#
#   bash scripts/claude-cloud/stack-up.sh
#
# Idempotent: whatever is already running is reused, so it is also the way to
# apply a migration added during the session. A fresh VM needs a few minutes
# (the Supabase images are pulled first); a warm one about a minute. Run it in
# the background when the first pull is still ahead.
#
# Cloud-only on purpose: it rewrites apps/web/.env.local, which on a
# developer's machine holds their own settings.
#
# What the cloud VM requires, all found by running the stack there:
#   - The VM may not raise rlimits, so a container started with an explicit
#     `--ulimit` fails in runc ("error setting rlimit type 7"). The Supabase
#     CLI passes `--ulimit nofile=65536:65536` to edge-runtime only; the app
#     has no Edge Functions, so that service is excluded. Studio, logflare,
#     vector, imgproxy and postgres-meta are dashboards and log plumbing the
#     app never calls, excluded to save pull time and memory.
#   - The Docker daemon is not always running when the session starts.
set -u

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  echo "stack-up.sh is for Claude Code cloud sessions only (it rewrites apps/web/.env.local)." >&2
  exit 1
fi

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
WORK=/tmp/claude-cloud
APP_URL="http://localhost:3000"
mkdir -p "$WORK"
cd "$ROOT" || exit 1

log() { printf '[stack-up %s] %s\n' "$(date +%H:%M:%S)" "$*"; }
fail() { log "FAILED: $*"; exit 1; }

# --- docker ------------------------------------------------------------------
if ! docker info >/dev/null 2>&1; then
  log "starting the Docker daemon"
  service docker start >/dev/null 2>&1 || (dockerd >"$WORK/dockerd.log" 2>&1 &)
  for _ in $(seq 1 30); do docker info >/dev/null 2>&1 && break; sleep 1; done
  docker info >/dev/null 2>&1 || fail "Docker daemon did not come up (see $WORK/dockerd.log)"
fi

# --- supabase ----------------------------------------------------------------
if pnpm -s supabase status >/dev/null 2>&1; then
  log "Supabase already running"
else
  log "starting Supabase (the first run pulls images; this is the slow part)"
  pnpm supabase start -x edge-runtime,studio,logflare,vector,imgproxy,postgres-meta \
    >"$WORK/supabase-start.log" 2>&1 || {
    tail -n 30 "$WORK/supabase-start.log"
    fail "supabase start"
  }
fi

# --- apps/web/.env.local -----------------------------------------------------
# Same as the README's local setup: copy .env.example, then fill in the three
# values `supabase status` prints. The values go to the file only.
env_file="apps/web/.env.local"
[ -f "$env_file" ] || cp apps/web/.env.example "$env_file"
status="$(pnpm -s supabase status -o json)" || fail "supabase status"
STATUS="$status" ENV_FILE="$env_file" node -e '
  const fs = require("fs");
  const s = JSON.parse(process.env.STATUS);
  const want = {
    NEXT_PUBLIC_SUPABASE_URL: s.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: s.PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: s.SECRET_KEY,
  };
  let text = fs.readFileSync(process.env.ENV_FILE, "utf8");
  for (const [k, v] of Object.entries(want)) {
    if (!v) throw new Error(`supabase status has no value for ${k}`);
    const re = new RegExp(`^${k}=.*$`, "m");
    const line = `${k}=${v}`;
    text = re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`;
  }
  fs.writeFileSync(process.env.ENV_FILE, text);
' || fail "filling $env_file"

# --- schema and data ---------------------------------------------------------
log "applying migrations and seeds"
{
  pnpm --filter web db:run-migrate &&
    pnpm --filter web db:seed &&
    pnpm --filter web db:seed:dev
} >"$WORK/db.log" 2>&1 || {
  tail -n 30 "$WORK/db.log"
  fail "migrate / seed (full log: $WORK/db.log)"
}

# --- next dev ----------------------------------------------------------------
if curl -fsS -o /dev/null "$APP_URL/ja" 2>/dev/null; then
  log "next dev already answering"
else
  log "starting next dev (log: $WORK/next-dev.log)"
  (cd apps/web && nohup pnpm dev >"$WORK/next-dev.log" 2>&1 &)
  code=""
  for _ in $(seq 1 300); do
    code="$(curl -s -o /dev/null -w '%{http_code}' "$APP_URL/ja")"
    [ "$code" = 200 ] && break
    sleep 1
  done
  [ "$code" = 200 ] || {
    tail -n 40 "$WORK/next-dev.log"
    fail "next dev did not answer 200 on /ja (last status: $code)"
  }
fi

cat <<EOF
[stack-up] ready
- App:      $APP_URL (next dev, hot reload; log: $WORK/next-dev.log)
- Database: psql postgresql://postgres:postgres@127.0.0.1:54322/postgres
            (no psql on the VM: docker exec supabase_db_blindfold-chess-web psql -U postgres -c '<sql>')
- Sign-in:  dev-seed users, e.g. alice@example.local / dev-password (admin: admin@example.local)
- Screens:  bash scripts/claude-cloud/screenshot.sh /ja/some/path
EOF
