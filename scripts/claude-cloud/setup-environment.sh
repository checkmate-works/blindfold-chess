#!/bin/bash
# Claude Code cloud environment "Setup script".
#
# Paste this file into the **Setup script** field of a cloud environment at
# https://claude.ai/code (environment selector > settings). It runs as root on
# the session VM before Claude Code launches; the resulting filesystem is
# snapshotted and reused by later sessions, so what it installs is paid for
# once rather than on every session start.
#
# It is deliberately repository-agnostic: cloud environments belong to the
# account, not to a repository, so one environment with this script serves
# every repository that needs the same Node major. The repository's own
# SessionStart hook (scripts/claude-cloud/session-start.sh) reads the exact
# requirement from package.json and runs this script as a fallback when the
# environment was not configured with it.
#
# Why it exists: the cloud image ships Node.js 20/21/22 only. Node is installed
# to /opt/node<major> like the preinstalled ones, and linked into
# /usr/local/bin as a best effort; on the image /opt/node22/bin precedes
# /usr/local/bin on PATH, so the SessionStart hook is what actually puts the
# new Node first (through CLAUDE_ENV_FILE) for every command of the session.
#
# Must exit 0 (a non-zero exit fails the session start) and finish well under
# five minutes (or the environment cache is not built). Idempotent.
set -u

NODE_MAJOR="${NODE_MAJOR:-24}"
# Exact version to install; empty resolves the latest release of NODE_MAJOR.
NODE_VERSION="${NODE_VERSION:-}"
# npm version range for the global pnpm. The exact version a repository pins in
# `packageManager` is then fetched by pnpm itself on first use (pnpm 10 manages
# package-manager versions by default), so no repository value is needed here.
PNPM_VERSION="${PNPM_VERSION:-10}"
NODE_PREFIX="/opt/node${NODE_MAJOR}"
BIN_DIR="/usr/local/bin"

log() { printf '[claude-cloud setup] %s\n' "$*"; }

resolve_node_version() {
  if [ -n "$NODE_VERSION" ]; then
    return 0
  fi
  # SHASUMS256.txt of the latest-vNN.x alias lists the release's tarballs.
  NODE_VERSION="$(curl -fsSL "https://nodejs.org/dist/latest-v${NODE_MAJOR}.x/SHASUMS256.txt" 2>/dev/null \
    | sed -n 's/.*node-v\([0-9][0-9.]*\)-linux-x64\.tar\.gz$/\1/p' | head -1)"
  if [ -z "$NODE_VERSION" ]; then
    log "could not resolve the latest Node ${NODE_MAJOR}.x release"
    return 1
  fi
}

install_node() {
  if [ -x "${NODE_PREFIX}/bin/node" ]; then
    local have
    have="$("${NODE_PREFIX}/bin/node" -v)"
    # A pinned version must match exactly; otherwise any release of the major
    # already there is kept (the cache is rebuilt rarely, so do not chase minors).
    if { [ -n "$NODE_VERSION" ] && [ "$have" = "v${NODE_VERSION}" ]; } ||
       { [ -z "$NODE_VERSION" ] && [ "${have%%.*}" = "v${NODE_MAJOR}" ]; }; then
      log "Node ${have} already present at ${NODE_PREFIX}"
      return 0
    fi
  fi
  resolve_node_version || return 1
  local arch
  case "$(uname -m)" in
    x86_64) arch=x64 ;;
    aarch64 | arm64) arch=arm64 ;;
    *) log "unsupported architecture $(uname -m); skipping Node install"; return 1 ;;
  esac
  local tarball="node-v${NODE_VERSION}-linux-${arch}.tar.gz"
  local url="https://nodejs.org/dist/v${NODE_VERSION}/${tarball}"
  local tmp
  tmp="$(mktemp -d)"
  log "downloading ${url}"
  if ! curl -fsSL "$url" -o "${tmp}/${tarball}"; then
    log "download failed"; rm -rf "$tmp"; return 1
  fi
  rm -rf "$NODE_PREFIX" && mkdir -p "$NODE_PREFIX"
  tar -xzf "${tmp}/${tarball}" -C "$NODE_PREFIX" --strip-components=1
  rm -rf "$tmp"
  log "installed Node $("${NODE_PREFIX}/bin/node" -v) to ${NODE_PREFIX}"
}

link_node() {
  mkdir -p "$BIN_DIR"
  local name
  for name in node npm npx corepack; do
    if [ -e "${NODE_PREFIX}/bin/${name}" ]; then
      ln -sfn "${NODE_PREFIX}/bin/${name}" "${BIN_DIR}/${name}"
    fi
  done
  return 0
}

install_pnpm() {
  if [ -x "${NODE_PREFIX}/bin/pnpm" ]; then
    log "pnpm $("${NODE_PREFIX}/bin/pnpm" -v 2>/dev/null) already present"
  else
    log "installing pnpm@${PNPM_VERSION}"
    "${NODE_PREFIX}/bin/npm" install -g "pnpm@${PNPM_VERSION}" --no-fund --no-audit --loglevel=error || return 1
  fi
  local name
  for name in pnpm pnpx; do
    if [ -e "${NODE_PREFIX}/bin/${name}" ]; then
      ln -sfn "${NODE_PREFIX}/bin/${name}" "${BIN_DIR}/${name}"
    fi
  done
  return 0
}

install_node && link_node && install_pnpm || log "toolchain setup incomplete; the session can still start"

log "installed: ${NODE_PREFIX}/bin/node $("${NODE_PREFIX}/bin/node" -v 2>/dev/null), pnpm $("${NODE_PREFIX}/bin/pnpm" -v 2>/dev/null)"
log "on PATH now: $(command -v node) $(node -v 2>/dev/null) (the session hook prepends ${NODE_PREFIX}/bin)"
exit 0
