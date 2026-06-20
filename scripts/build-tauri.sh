#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -n "${RUSTUP_TOOLCHAIN:-}" && "${RUSTUP_TOOLCHAIN}" != stable* ]]; then
  echo "Unsetting RUSTUP_TOOLCHAIN=$RUSTUP_TOOLCHAIN (use stable toolchain for Tauri builds)" >&2
  unset RUSTUP_TOOLCHAIN
fi

TARGET="${1:-}"
TAURI_ARGS=()

case "$TARGET" in
  "")
    ;;
  linux)
    ;;
  macos-universal)
    TAURI_ARGS=(--target universal-apple-darwin)
    ;;
  *)
    echo "Usage: $0 [linux|macos-universal]" >&2
    echo "On Windows use: pwsh ./scripts/build-tauri.ps1" >&2
    exit 1
    ;;
esac

if [[ "$(uname -s)" == "Linux" && "$TARGET" != "macos-universal" ]]; then
  if ! pkg-config --exists javascriptcoregtk-4.1 2>/dev/null; then
    echo "Missing Linux dependencies. Install them with:" >&2
    echo "  sudo ./scripts/install-linux-deps.sh" >&2
    exit 1
  fi
fi

pnpm install --frozen-lockfile
pnpm tauri build "${TAURI_ARGS[@]}"
