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
# --watch exits 0 on a FINISHED submission and 1 when the build or the
# submission ended as ERRORED / CANCELED.
set -euo pipefail
cd "$(dirname "$0")/.."

BUILD_ID="${1:?pass the build ID}"
WATCH=false
[ "${2:-}" = "--watch" ] && WATCH=true

EAS=(npx -y eas-cli@latest)

# The build and its submission are read separately. A build that fails never
# gets the submission --auto-submit scheduled for it, so the submission list
# alone would show NOT_FOUND forever and --watch would never stop.
build_fields() {
  "${EAS[@]}" build:view "$BUILD_ID" --json 2>/dev/null |
    jq -r '(if type == "array" then .[0] else . end)
      | "build=\(.status // "UNKNOWN") buildNumber=\(.appBuildVersion // "?")"' ||
    echo "build=UNKNOWN buildNumber=?"
}

submission_state() {
  "${EAS[@]}" submit:list --platform ios --limit 10 --json 2>/dev/null |
    jq -r --arg id "$BUILD_ID" '
      [.[] | select(.submittedBuild.id == $id)][0]
      | if . == null then "NOT_FOUND" else .status end' ||
    echo "UNKNOWN"
}

status_line() {
  local build submission
  build=$(build_fields)
  submission=$(submission_state)
  # Empty output with a zero exit (eas printed nothing) reads as unknown too
  [ -n "$build" ] || build="build=UNKNOWN buildNumber=?"
  [ -n "$submission" ] || submission="UNKNOWN"
  # build_fields yields "build=<state> buildNumber=<n>"; put the submission
  # between the two so the line keeps its documented order.
  echo "${build% buildNumber=*} submission=${submission} buildNumber=${build##*buildNumber=}"
}

# Exit status for a finished line: 0 when App Store Connect received the
# build, 1 when the build or the submission failed or was canceled.
done_status() {
  case "$1" in
    *build=ERRORED* | *build=CANCELED*) return 1 ;;
    *submission=ERRORED* | *submission=CANCELED*) return 1 ;;
  esac
  return 0
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
  if is_done "$line"; then
    done_status "$line" && exit 0
    exit 1
  fi
  sleep 30
done
