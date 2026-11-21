#!/usr/bin/env bash
# Print the state of a build queued by scripts/testflight.sh and of its
# submission to App Store Connect.
#
#   scripts/testflight-status.sh <build ID>          # one line, then exit
#   scripts/testflight-status.sh <build ID> --watch  # a line per change, exit when done
#
# A line reads `build=<state> submission=<state> buildNumber=<n>`. It is done
# when the submission is FINISHED / ERRORED / CANCELED, or the build is ERRORED /
# CANCELED. A FINISHED submission means App Store Connect has received it; the
# build shows up in TestFlight after Apple's processing (10-30 minutes).
set -euo pipefail
cd "$(dirname "$0")/.."

BUILD_ID="${1:?pass the build ID}"
WATCH=false
[ "${2:-}" = "--watch" ] && WATCH=true

# The submission list carries the build's state too, so one call gets both
status_line() {
  npx -y eas-cli@latest submit:list --platform ios --limit 10 --json 2>/dev/null |
    jq -r --arg id "$BUILD_ID" '
      [.[] | select(.submittedBuild.id == $id)][0]
      | if . == null then "build=UNKNOWN submission=NOT_FOUND buildNumber=?"
        else "build=\(.submittedBuild.status) submission=\(.status) buildNumber=\(.submittedBuild.appBuildVersion)"
        end' ||
    echo "build=UNKNOWN submission=UNKNOWN buildNumber=?"
}

is_done() {
  case "$1" in
    *submission=FINISHED* | *submission=ERRORED* | *submission=CANCELED*) return 0 ;;
    *build=ERRORED* | *build=CANCELED*) return 0 ;;
  esac
  return 1
}

if [ "$WATCH" = false ]; then
  status_line
  exit 0
fi

prev=""
while true; do
  line=$(status_line)
  if [ "$line" != "$prev" ]; then
    echo "$(date +%T) $line"
    prev=$line
  fi
  is_done "$line" && exit 0
  sleep 30
done
