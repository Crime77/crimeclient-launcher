#!/usr/bin/env bash
# Builds the Linux launcher (AppImage + deb) in a container, on mini next to the CraftAttack server, so throttled.
#
#   bash tools/linux/build.sh [out-dir]          (run from the source tree, e.g. a fresh `git archive HEAD`)
#
# Unsigned: createUpdaterArtifacts is off in tauri.linux.conf.json and the updater key stays on the Windows PC;
# sign the AppImage there (`yarn tauri signer sign`) before publishing. Caches (cargo, target, node_modules) live
# in docker volumes, so a fresh source tree each time still builds incrementally.
set -euo pipefail

SRC="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${1:-$SRC/dist-linux}"
IMAGE=crimeclient-launcher-linux
mkdir -p "$OUT"

nice -n 15 docker build -t "$IMAGE" "$SRC/tools/linux"

nice -n 15 docker run --rm --cpus=4 --memory=8g \
    -e CARGO_BUILD_JOBS=4 -e CARGO_TARGET_DIR=/target \
    -e HOST_UID="$(id -u)" -e HOST_GID="$(id -g)" \
    -v "$SRC":/src \
    -v "$OUT":/out \
    -v crimeclient-launcher-cargo-registry:/usr/local/cargo/registry \
    -v crimeclient-launcher-cargo-git:/usr/local/cargo/git \
    -v crimeclient-launcher-target:/target \
    -v crimeclient-launcher-node-modules:/src/node_modules \
    -v crimeclient-launcher-yarn-cache:/root/.cache/yarn \
    "$IMAGE" bash -euo pipefail -c '
        yarn install --frozen-lockfile --network-timeout 600000
        yarn tauri build --bundles appimage,deb
        bundle=/target/release/bundle
        cp -f "$bundle"/appimage/*.AppImage "$bundle"/deb/*.deb /out/
        chown "$HOST_UID:$HOST_GID" /out/*
        ls -la /out
    '
