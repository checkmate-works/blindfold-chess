#!/bin/bash
# Claude Code cloud environment "Setup script".
#
# Paste the contents of this file into the **Setup script** field of the
# cloud environment at https://claude.ai/code (Environments). It runs as root
# on the session VM before Claude Code launches, and the resulting filesystem
# is snapshotted and reused by later sessions, so anything installed here is
# paid for once rather than on every session start.
#
# Why it exists: the cloud image ships Node.js 20/21/22 only, while this repo
# requires Node 24 (package.json `engines` / volta pin) and pnpm 10. The
# installed toolchain is exposed through /usr/local/bin so that every shell
# Claude opens picks it up without PATH changes.
#
# The script is idempotent and must exit 0: a non-zero exit makes the session
# fail to start. Keep its runtime well under five minutes or the environment
# cache is not built. scripts/claude-cloud/session-start.sh calls this file as
# a fallback when the environment was not configured with it, so it must also
# work when run from the repository checkout.
set -u

NODE_VERSION="${NODE_VERSION:-24.20.0}"
PNPM_VERSION="${PNPM_VERSION:-10.13.1}"
NODE_PREFIX="/opt/node${NODE_VERSION%%.*}"
BIN_DIR="/usr/local/bin"

log() { printf '[claude-cloud setup] %s\n' "$*"; }

install_node() {
  if [ -x "${NODE_PREFIX}/bin/node" ] && [ "$("${NODE_PREFIX}/bin/node" -v)" = "v${NODE_VERSION}" ]; then
    log "Node v${NODE_VERSION} already present at ${NODE_PREFIX}"
    return 0
  fi
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

# Links into /usr/local/bin are a best effort only: on the cloud image the
# default Node's /opt/node22/bin precedes /usr/local/bin on PATH, so the
# SessionStart hook (scripts/claude-cloud/session-start.sh) additionally puts
# ${NODE_PREFIX}/bin at the front of PATH for every command Claude runs.
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
  if [ -x "${NODE_PREFIX}/bin/pnpm" ] && [ "$("${NODE_PREFIX}/bin/pnpm" -v 2>/dev/null)" = "$PNPM_VERSION" ]; then
    log "pnpm ${PNPM_VERSION} already present"
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
