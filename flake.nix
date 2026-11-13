{
  description = "CrimeClient Launcher, the launcher for CrimeClient (Fabric client for Minecraft 26.3)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  # nix run github:Crime77/crimeclient-launcher
  #
  # Uses the published Linux release (the same .deb as on https://crimeclient.duckdns.org/), not a source build, so
  # `nix run` starts within seconds. After a release, `python tools/update_flake.py <version>` sets version and hash.
  #
  # The launcher runs in an FHS environment (like Steam in nixpkgs): it downloads Java runtimes, the game's native
  # libraries, CrimeClient Rust and yt-dlp/ffmpeg, all built for ordinary Linux distributions, and they need
  # /lib64/ld-linux-x86-64.so.2 and the usual libraries in /usr/lib to start.
  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
      lib = nixpkgs.lib;

      release = {
        version = "0.4.0";
        url = "https://crime77.duckdns.org/client/launcher/CrimeClient-Launcher-0.4.0-amd64.deb";
        hash = "sha256-Zua++nNKpooiKKUYBCRZQctWb1tw8T6O9fM+KzydmAY=";
      };

      meta = {
        description = "Launcher for CrimeClient, the free Fabric client for Minecraft 26.3";
        homepage = "https://crimeclient.duckdns.org/";
        license = lib.licenses.gpl3Only;
        sourceProvenance = [ lib.sourceTypes.binaryNativeCode ];
        platforms = [ "x86_64-linux" ];
        mainProgram = "crimeclient-launcher";
      };

      # The release binary as built for Debian/Ubuntu. It is not patched: it runs inside the FHS environment, just
      # like everything the launcher downloads.
      unwrapped = pkgs.stdenvNoCC.mkDerivation {
        pname = "crimeclient-launcher-unwrapped";
        inherit (release) version;
        src = pkgs.fetchurl { inherit (release) url hash; };
        nativeBuildInputs = [ pkgs.dpkg ];
        unpackPhase = ''
          runHook preUnpack
          dpkg-deb -x "$src" .
          runHook postUnpack
        '';
        dontConfigure = true;
        dontBuild = true;
        dontFixup = true;
        installPhase = ''
          runHook preInstall
          install -Dm755 usr/bin/noriskclient-launcher-v3 "$out/bin/noriskclient-launcher-v3"
          cp -r usr/share "$out/share"
          runHook postInstall
        '';
        inherit meta;
      };

      # gsettings schemas for GTK (file chooser and other dialogs)
      schemas = lib.concatMapStringsSep ":" (p: "${p}/share/gsettings-schemas/${p.name}") [
        pkgs.gsettings-desktop-schemas
        pkgs.gtk3
      ];

      fhs = pkgs.buildFHSEnv {
        pname = "crimeclient-launcher-fhs";
        inherit (release) version;
        targetPkgs = p: with p; [
          # the launcher itself (Tauri: GTK 3 and WebKitGTK 4.1, tray icon)
          webkitgtk_4_1
          gtk3
          glib
          glib-networking
          libsoup_3
          cairo
          gdk-pixbuf
          librsvg
          pango
          harfbuzz
          atk
          openssl
          xz
          dbus
          libayatana-appindicator
          gsettings-desktop-schemas
          adwaita-icon-theme
          hicolor-icon-theme
          shared-mime-info
          # crimeclient:// handler and opening links
          xdg-utils
          desktop-file-utils
          # Minecraft (Java and LWJGL) and CrimeClient Rust (wgpu with Vulkan, cpal, gilrs)
          stdenv.cc.cc.lib
          zlib
          libGL
          libglvnd
          vulkan-loader
          libdrm
          alsa-lib
          libpulseaudio
          pipewire
          openal
          flite
          udev
          fontconfig
          freetype
          expat
          libx11
          libxcursor
          libxrandr
          libxi
          libxxf86vm
          libxext
          libxrender
          libxtst
          libxcb
          libxkbcommon
          wayland
        ];
        runScript = "${unwrapped}/bin/noriskclient-launcher-v3";
        profile = ''
          # WebKitGTK's DMA-BUF renderer shows a blank window on many NVIDIA and some Wayland setups
          export WEBKIT_DISABLE_DMABUF_RENDERER="''${WEBKIT_DISABLE_DMABUF_RENDERER:-1}"
          export GIO_EXTRA_MODULES="${pkgs.glib-networking}/lib/gio/modules''${GIO_EXTRA_MODULES:+:$GIO_EXTRA_MODULES}"
          export GDK_PIXBUF_MODULE_FILE="${pkgs.librsvg}/lib/gdk-pixbuf-2.0/2.10.0/loaders.cache"
          export XDG_DATA_DIRS="${schemas}:/usr/share''${XDG_DATA_DIRS:+:$XDG_DATA_DIRS}"
          # Nix brings new versions; the launcher must not try to replace itself in the read-only store
          export CRIMECLIENT_NO_SELF_UPDATE=1
        '';
        inherit meta;
      };

      launcher = pkgs.runCommand "crimeclient-launcher-${release.version}"
        {
          inherit (release) version;
          passthru = { inherit unwrapped fhs; };
          inherit meta;
        }
        ''
          mkdir -p "$out/bin" "$out/share/applications"
          # The launcher registers its crimeclient:// handler with $APPIMAGE as the command when it is set, so links
          # come back through this script and the FHS environment instead of the bare binary.
          cat > "$out/bin/crimeclient-launcher" <<EOF
          #!${pkgs.runtimeShell}
          export APPIMAGE="$out/bin/crimeclient-launcher"
          exec ${fhs}/bin/crimeclient-launcher-fhs "\$@"
          EOF
          chmod +x "$out/bin/crimeclient-launcher"

          for icon in ${unwrapped}/share/icons/hicolor/*/apps/noriskclient-launcher-v3.png; do
            size=$(basename "$(dirname "$(dirname "$icon")")")
            install -Dm644 "$icon" "$out/share/icons/hicolor/$size/apps/crimeclient-launcher.png"
          done

          cat > "$out/share/applications/crimeclient-launcher.desktop" <<EOF
          [Desktop Entry]
          Type=Application
          Name=CrimeClient Launcher
          Comment=Launcher for CrimeClient, the Fabric client for Minecraft 26.3
          Exec=$out/bin/crimeclient-launcher %u
          Icon=crimeclient-launcher
          Terminal=false
          Categories=Game;
          MimeType=x-scheme-handler/crimeclient;
          EOF
        '';
    in
    {
      packages.${system} = {
        default = launcher;
        crimeclient-launcher = launcher;
      };

      apps.${system}.default = {
        type = "app";
        program = "${launcher}/bin/crimeclient-launcher";
        meta.description = meta.description;
      };
    };
}
