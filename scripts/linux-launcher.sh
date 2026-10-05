#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
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
