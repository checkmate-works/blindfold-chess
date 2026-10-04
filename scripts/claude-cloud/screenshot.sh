#!/bin/bash
# Screenshot pages of the local app (localhost:3000) from a Claude Code cloud
# session. Bring the app up with stack-up.sh first.
#
#   bash scripts/claude-cloud/screenshot.sh /ja /ja/articles
#   bash scripts/claude-cloud/screenshot.sh /ja/mypage --login alice --viewport mobile
#
# Options:
#   --viewport desktop|mobile|both   default both (1280x800 / 390x844)
#   --login <user>                   sign in first as a dev-seed user (alice,
#                                    bob, carol, dave, admin) or a full email
#   --full                           capture the full page, not just the viewport
#   --show-consent                   keep the cookie banner (hidden by default)
#   --out <dir>                      default /tmp/claude-cloud/shots
#
# Prints one line per screenshot with the file path. Open the PNG with the
# Read tool to look at it; the cloud session shows it to the user in chat.
#
# The browser is the Playwright headless Chromium preinstalled in the cloud
# image under /opt/pw-browsers (Chrome for Testing downloads are blocked
# there). playwright-core is installed once into /tmp, outside the workspace,
# so the lockfile is untouched.
set -u

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
PW_PREFIX=/tmp/claude-cloud/pw
PW_VERSION=1.58.2

chrome="$(find /opt/pw-browsers -maxdepth 3 -type f \( -name headless_shell -o -name chrome-headless-shell -o -name chrome \) -perm -u+x 2>/dev/null | sort | head -1)"
if [ -z "$chrome" ]; then
  echo "No Chromium under /opt/pw-browsers; screenshot.sh needs the cloud image's preinstalled browser." >&2
  exit 1
fi

if [ ! -d "$PW_PREFIX/node_modules/playwright-core" ]; then
  npm install --prefix "$PW_PREFIX" --no-fund --no-audit --loglevel=error "playwright-core@$PW_VERSION" >&2 || exit 1
fi

if ! curl -fsS -o /dev/null http://localhost:3000/ja 2>/dev/null; then
  echo "The app is not answering on localhost:3000; run scripts/claude-cloud/stack-up.sh first." >&2
  exit 1
fi

CHROME="$chrome" PW_PREFIX="$PW_PREFIX" exec node "$ROOT/scripts/claude-cloud/screenshot.mjs" "$@"
