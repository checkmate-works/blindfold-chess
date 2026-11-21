#!/usr/bin/env bash
# Build main's HEAD for iOS on EAS (production profile) and, once built,
# submit it to App Store Connect for TestFlight.
#
#   scripts/testflight.sh [--any-branch]
#
# Queues the build and returns without waiting. The last line prints the build
# ID; follow it with scripts/testflight-status.sh <build ID> [--watch].
# The signing certificate, provisioning profile and App Store Connect API key
# live on EAS's servers, so no Apple sign-in is needed here after the first run.
set -euo pipefail
cd "$(dirname "$0")/.."

EAS=(npx -y eas-cli@latest)
ANY_BRANCH=false
[ "${1:-}" = "--any-branch" ] && ANY_BRANCH=true

fail() {
  echo "testflight: $*" >&2
  exit 1
}

# EAS uploads a snapshot of the git commit. A build meant for testers comes
# from a pushed commit on main, so the commit EAS shows can be found on GitHub.
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ] && [ "$ANY_BRANCH" = false ]; then
  fail "on ${BRANCH}, not main. Pass --any-branch if that is intended"
fi
git diff --quiet HEAD -- . ../../packages ../../pnpm-lock.yaml ||
  fail "uncommitted changes (the build would not match the commit it records)"
git fetch --quiet origin "$BRANCH" 2>/dev/null || true
if [ "$(git rev-parse HEAD)" != "$(git rev-parse "origin/$BRANCH" 2>/dev/null || true)" ]; then
  fail "HEAD does not match origin/$BRANCH (not pushed, or not pulled)"
fi

# Reading app.json and computing the fingerprint use the local expo package
[ -d node_modules/expo ] || fail "dependencies missing. Run pnpm install --frozen-lockfile at the repo root"

"${EAS[@]}" whoami >/dev/null 2>&1 || fail "not logged in to EAS (npx eas-cli login)"

# Without all three, the build has no accounts: resolveBackendConfig in
# src/auth/config.ts returns undefined for a release build missing any of them,
# and the build still passes, so check before spending a build on it.
ENV_NAMES=$("${EAS[@]}" env:list --environment production 2>/dev/null)
for name in EXPO_PUBLIC_SUPABASE_URL EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY EXPO_PUBLIC_API_ORIGIN; do
  echo "$ENV_NAMES" | grep -q "^$name=" || fail "$name is not set in the EAS production environment (README: Release builds)"
done

LOG=$(mktemp)
trap 'rm -f "$LOG"' EXIT
"${EAS[@]}" build --platform ios --profile production --auto-submit \
  --non-interactive --no-wait 2>&1 | tee "$LOG"

BUILD_ID=$(grep -oE '/builds/[0-9a-f-]{36}' "$LOG" | head -1 | cut -d/ -f3)
[ -n "$BUILD_ID" ] || fail "could not read the build ID from the output (see the log above)"
grep -q 'Scheduled iOS submission' "$LOG" || fail "no submission was scheduled (build ${BUILD_ID})"
echo "testflight: build $BUILD_ID"
