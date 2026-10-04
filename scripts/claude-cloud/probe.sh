#!/bin/bash
# Feasibility probe: can a Claude Code cloud session run the full local stack
# (Supabase in Docker + `next dev`) and screenshot it with a headless browser?
#
# Run it inside a cloud session after the SessionStart hook has finished:
#
#   bash scripts/claude-cloud/probe.sh            # every stage, in order
#   bash scripts/claude-cloud/probe.sh browser    # one stage (see STAGES below)
#
# The full run takes well over ten minutes on a fresh VM (the first
# `supabase start` pulls every Supabase image), so start it as a background
# command rather than waiting on it in the foreground.
#
# Each stage is timed and recorded as PASS or FAIL in $PROBE_DIR/report.txt;
# a failing stage is reported and the run continues, so one run answers as
# many questions as possible. The stack is left running afterwards so the
# session can keep poking at it. Nothing here is needed outside the probe:
# whatever proves to work gets folded into session-start.sh.
#
# Every host this script downloads from is on the cloud environment's default
# "Trusted" allowlist: public.ecr.aws (Supabase images), registry.npmjs.org,
# storage.googleapis.com (Chrome for Testing) and archive.ubuntu.com.
set -u

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
PROBE_DIR="${PROBE_DIR:-/tmp/claude-cloud-probe}"
REPORT="$PROBE_DIR/report.txt"
APP_URL="http://localhost:3000"
mkdir -p "$PROBE_DIR/shots" "$PROBE_DIR/logs"
cd "$ROOT" || exit 1

log() { printf '[probe %s] %s\n' "$(date +%H:%M:%S)" "$*"; }
record() { printf '%-10s %-4s %5ss  %s\n' "$1" "$2" "$3" "$4" | tee -a "$REPORT"; }

as_root() {
  if [ "$(id -u)" = 0 ]; then "$@"; else sudo -n "$@"; fi
}

run_stage() {
  local name="$1" start rc
  start=$(date +%s)
  log "--- stage: $name"
  "stage_$name" >"$PROBE_DIR/logs/$name.log" 2>&1
  rc=$?
  tail -n 15 "$PROBE_DIR/logs/$name.log"
  if [ $rc -eq 0 ]; then
    record "$name" PASS $(($(date +%s) - start)) "$(cat "$PROBE_DIR/$name.note" 2>/dev/null)"
  else
    record "$name" FAIL $(($(date +%s) - start)) "see $PROBE_DIR/logs/$name.log"
  fi
  return $rc
}
note() { printf '%s' "$*" > "$PROBE_DIR/${FUNCNAME[1]#stage_}.note"; }

# --- stages ------------------------------------------------------------------

stage_env() {
  echo "CLAUDE_CODE_REMOTE=${CLAUDE_CODE_REMOTE:-unset} uid=$(id -u)"
  uname -a
  echo "cpus=$(nproc)"; free -h; df -h / /tmp
  echo "node=$(node -v) pnpm=$(pnpm -v)"
  command -v sudo && sudo -n true && echo "sudo: passwordless"
  note "uid=$(id -u) cpus=$(nproc) node=$(node -v)"
}

stage_docker() {
  if ! docker info >/dev/null 2>&1; then
    echo "docker daemon not reachable; trying to start it"
    as_root service docker start || (as_root dockerd >"$PROBE_DIR/logs/dockerd.log" 2>&1 &)
    for _ in $(seq 1 30); do docker info >/dev/null 2>&1 && break; sleep 1; done
  fi
  docker info --format 'server={{.ServerVersion}} driver={{.Driver}} cgroup={{.CgroupVersion}}' || return 1
  docker run --rm public.ecr.aws/docker/library/hello-world || return 1
  note "$(docker info --format 'docker {{.ServerVersion}}, {{.Driver}}')"
}

stage_supabase() {
  pnpm supabase --version || return 1
  timeout 1500 pnpm supabase start || return 1
  docker system df
  note "$(docker ps --format '{{.Names}}' | grep -c supabase) supabase containers running"
}

# Mirrors the README's local setup: copy .env.example, then fill in the three
# values that `supabase status` prints. Values are written to the file only,
# never echoed.
stage_envfile() {
  local env="apps/web/.env.local" status
  [ -f "$env" ] || cp apps/web/.env.example "$env"
  status="$(pnpm -s supabase status -o json 2>/dev/null)" || return 1
  STATUS="$status" ENV_FILE="$env" node -e '
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
      const line = `${k}=${v}`;
      const re = new RegExp(`^${k}=.*$`, "m");
      text = re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`;
    }
    fs.writeFileSync(process.env.ENV_FILE, text);
    console.log("filled:", Object.keys(want).join(", "));
  ' || return 1
  note "apps/web/.env.local filled from supabase status"
}

stage_db() {
  pnpm --filter web db:run-migrate || return 1
  pnpm --filter web db:seed || return 1
  pnpm --filter web db:seed:dev || return 1
  # White-box access: read the database directly.
  local q="select (select count(*) from auth.users) as users, (select count(*) from public.profiles) as profiles"
  if command -v psql >/dev/null; then
    psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "$q" || return 1
  else
    docker exec "$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -1)" \
      psql -U postgres -c "$q" || return 1
  fi
  note "migrate + seed + dev-seed done, psql readable"
}

stage_app() {
  if ! curl -fsS -o /dev/null "$APP_URL"; then
    (cd apps/web && nohup pnpm dev >"$PROBE_DIR/logs/next-dev.log" 2>&1 &)
  fi
  local code=""
  for _ in $(seq 1 180); do
    code="$(curl -s -o /dev/null -w '%{http_code}' "$APP_URL/ja")"
    [ "$code" = 200 ] && break
    sleep 1
  done
  echo "GET /ja -> $code"
  [ "$code" = 200 ] || { tail -n 40 "$PROBE_DIR/logs/next-dev.log"; return 1; }
  note "next dev answers 200 on /ja"
}

# Ubuntu 24.04's apt "chromium" is a snap shim that does not run in this VM,
# so the browser comes from Chrome for Testing (storage.googleapis.com) and
# its shared libraries and a Japanese font from archive.ubuntu.com.
stage_browser() {
  local out bin missing
  out="$(npx -y @puppeteer/browsers install chrome-headless-shell@stable --path "$PROBE_DIR/browsers")" || return 1
  echo "$out"
  bin="$(printf '%s\n' "$out" | tail -n 1 | awk '{print $NF}')"
  [ -x "$bin" ] || return 1
  echo "$bin" > "$PROBE_DIR/chrome-path"
  missing="$(ldd "$bin" | awk '/not found/ {print $1}')"
  as_root apt-get update -qq || return 1
  if [ -n "$missing" ]; then
    echo "missing libs: $missing"
    as_root env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
      libnss3 libnspr4 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libdrm2 \
      libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
      libasound2t64 libpango-1.0-0 libcairo2 || return 1
  fi
  if ! fc-list :lang=ja 2>/dev/null | grep -q .; then
    as_root env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq fonts-noto-cjk || return 1
  fi
  ldd "$bin" | grep 'not found' && return 1
  "$bin" --version || true
  note "$("$bin" --version 2>/dev/null | head -1), ja font: $(fc-list :lang=ja | wc -l) faces"
}

stage_shot() {
  local chrome
  chrome="$(cat "$PROBE_DIR/chrome-path" 2>/dev/null)" || return 1
  [ -d "$PROBE_DIR/pw/node_modules/playwright-core" ] ||
    npm install --prefix "$PROBE_DIR/pw" --no-fund --no-audit playwright-core@1.58.2 || return 1
  CHROME="$chrome" BASE="$APP_URL" OUT="$PROBE_DIR/shots" \
    NODE_PATH="$PROBE_DIR/pw/node_modules" node -e '
    const { chromium } = require("playwright-core");
    (async () => {
      const browser = await chromium.launch({ executablePath: process.env.CHROME });
      const shots = [
        ["ja-desktop", "/ja", { width: 1280, height: 800 }],
        ["ja-mobile", "/ja", { width: 390, height: 844 }],
        ["en-desktop", "/en", { width: 1280, height: 800 }],
      ];
      for (const [name, path, viewport] of shots) {
        const page = await browser.newPage({ viewport });
        const res = await page.goto(process.env.BASE + path, { waitUntil: "networkidle" });
        await page.screenshot({ path: `${process.env.OUT}/${name}.png`, fullPage: false });
        console.log(name, res && res.status());
        await page.close();
      }
      await browser.close();
    })().catch((e) => { console.error(e); process.exit(1); });
  ' || return 1
  ls -la "$PROBE_DIR/shots"
  note "$(ls "$PROBE_DIR/shots" | wc -l) screenshots in $PROBE_DIR/shots"
}

# --- main --------------------------------------------------------------------

STAGES=(env docker supabase envfile db app browser shot)
if [ $# -gt 0 ]; then STAGES=("$@"); fi

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || log "warning: not a cloud session (CLAUDE_CODE_REMOTE != true)"
: > "$REPORT"
total_start=$(date +%s)
for s in "${STAGES[@]}"; do run_stage "$s"; done

cat <<EOF

=== probe report ($(($(date +%s) - total_start))s total) ===
$(cat "$REPORT")

Logs: $PROBE_DIR/logs/   Screenshots: $PROBE_DIR/shots/
The Supabase stack and next dev are still running.
EOF
