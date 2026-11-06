# Build image for the Linux launcher (AppImage + deb). Ubuntu 22.04 keeps glibc at 2.35, so the AppImage also runs
# on older distributions. Used by tools/linux/build.sh; the same packages as Tauri's Linux prerequisites.
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential ca-certificates curl wget file git pkg-config xz-utils \
        libwebkit2gtk-4.1-dev libgtk-3-dev libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev patchelf \
        xdg-utils xvfb xauth dbus-x11 x11-apps imagemagick \
    && rm -rf /var/lib/apt/lists/*

# the versions of the Windows build machine
ARG NODE_VERSION=24.20.0
ARG RUST_VERSION=1.99.1
RUN curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
        | tar -xJ -C /usr/local --strip-components=1 \
    && npm install -g yarn@1.22.22

ENV RUSTUP_HOME=/usr/local/rustup CARGO_HOME=/usr/local/cargo PATH=/usr/local/cargo/bin:$PATH
RUN curl -fsSL https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain "${RUST_VERSION}" \
    && chmod -R a+rwX /usr/local/cargo /usr/local/rustup

# linuxdeploy (AppImage bundling) is itself an AppImage; containers have no FUSE
ENV APPIMAGE_EXTRACT_AND_RUN=1 NO_STRIP=true
WORKDIR /src
