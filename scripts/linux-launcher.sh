#!/bin/sh
set -eu

# Debian runs this script through /usr/bin and update-alternatives symlinks.
SCRIPT_PATH=$(readlink -f -- "$0")
SCRIPT_DIR=$(dirname -- "$SCRIPT_PATH")
REAL_EXECUTABLE="$SCRIPT_DIR/githome-bin"
HAS_OZONE_PLATFORM=0

for arg do
  case "$arg" in
    --ozone-platform|--ozone-platform=*) HAS_OZONE_PLATFORM=1 ;;
  esac
done

if [ "$HAS_OZONE_PLATFORM" -eq 0 ] && {
  [ "${XDG_SESSION_TYPE:-}" = "wayland" ] ||
    [ -n "${WAYLAND_DISPLAY:-}" ]
}; then
  set -- --ozone-platform=wayland "$@"
fi

exec "$REAL_EXECUTABLE" "$@"
