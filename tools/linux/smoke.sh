#!/usr/bin/env bash
# Starts a built AppImage in the build container under Xvfb for 25 s and saves a screenshot and the log:
#   bash tools/linux/smoke.sh <file.AppImage> [out-dir]
# It shows the welcome screen (no account); it proves the binary, WebKitGTK and the frontend load on Linux.
set -euo pipefail

APP="$(realpath "$1")"
OUT="$(realpath "${2:-$(dirname "$APP")}")"
IMAGE=crimeclient-launcher-linux

nice -n 15 docker run --rm --cpus=2 --memory=4g \
    -e HOST_UID="$(id -u)" -e HOST_GID="$(id -g)" \
    -v "$APP":/app/launcher.AppImage:ro -v "$OUT":/out \
    "$IMAGE" bash -uo pipefail -c '
        export HOME=/tmp/home XDG_RUNTIME_DIR=/tmp/run WEBKIT_DISABLE_DMABUF_RENDERER=1 LIBGL_ALWAYS_SOFTWARE=1
        mkdir -p "$HOME" "$XDG_RUNTIME_DIR" && chmod 700 "$XDG_RUNTIME_DIR"
        Xvfb :99 -screen 0 1440x900x24 >/dev/null 2>&1 & sleep 2
        export DISPLAY=:99
        dbus-launch --exit-with-session /app/launcher.AppImage > /out/smoke.log 2>&1 &
        sleep 25
        import -window root /out/smoke.png
        find "$HOME" -name "*.log" -path "*logs*" -exec tail -n 80 {} \; > /out/smoke-launcher.log 2>/dev/null || true
        chown "$HOST_UID:$HOST_GID" /out/smoke*
        echo "screenshot: /out/smoke.png"
    '
