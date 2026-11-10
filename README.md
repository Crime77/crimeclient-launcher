# CrimeClient Launcher

Der Launcher für [CrimeClient](https://crimeclient.duckdns.org/), den kostenlosen Fabric-Client für Minecraft 26.3.
Anmelden mit dem Microsoft-Konto, Profil wählen, Spielen drücken: Das CrimeClient-Modpack ist schon eingerichtet.
Dazu ein Shop, in dem man Shards für Cosmetics ausgibt, Skin-Verwaltung und Mods von Modrinth.

**Download:** [crimeclient.duckdns.org](https://crimeclient.duckdns.org/) (Windows 10/11 und Linux, Beta)

**NixOS:** ohne Installation starten mit

```bash
nix run github:Crime77/crimeclient-launcher
```

Dauerhaft geht es mit `nix profile install github:Crime77/crimeclient-launcher` oder in der NixOS-Konfiguration über
`inputs.crimeclient-launcher.packages.x86_64-linux.default`. Die Flake nimmt das veröffentlichte Linux-Paket und startet
es in einer FHS-Umgebung, damit auch Java, die Spiel-Bibliotheken und CrimeClient Rust laufen, die der Launcher
herunterlädt. Neue Versionen kommen über Nix (`nix run --refresh …`), nicht über den Launcher selbst. Nach einem Release
setzt `python tools/update_flake.py <version>` Version und Hash in `flake.nix`.

## Herkunft und Lizenz

Dies ist ein Fork des [NoRiskClient-Launchers](https://github.com/NoRiskClient/noriskclient-launcher) (v0.6.29), der
seinerseits auf [LiquidLauncher](https://github.com/CCBlueX/LiquidLauncher) aufbaut. Er steht wie das Original unter der
[GNU General Public License v3.0](LICENSE). Mit NoRisk hat dieses Projekt nichts zu tun; NoRisk unterstützt es nicht.

Geändert gegenüber dem Original (Details in der Git-Historie, Branch `crimeclient`):

- eigene Oberfläche (Startseite, Navigation, Glas-Design, Schriften Inter und Sora), Name, Icon und Datenordner
- eigener Microsoft-Login (direktes OAuth), keine Verbindung zu NoRisk-Servern, keine Analytics, kein Freunde-/Chat-System
- Profile und Modpack kommen von der CrimeClient-API, News aus dem CrimeClient-Changelog, der Server auf der
  Startseite aus `launcher/servers.json`
- eigener Selbst-Updater: `latest.json` der CrimeClient-API, signiert mit einem eigenen Schlüssel
  (`CRIMECLIENT_UPDATE_URL` überschreibt die Adresse zum Testen)
- Discord-Status über die CrimeClient-App; CrimeClient im Spiel übergibt seinen Text an den Launcher
- Shard-Shop für CrimeClient-Cosmetics (`src-tauri/src/commands/crime_store_command.rs`, `src/components/tabs/ShopTab.tsx`)
- Fehlerbehebungen: Classpath-Pfade kanonisieren, Skin nach dem ersten Login laden,
  Windows-Zertifikatsspeicher für das Spiel (`-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT`)

Mitgelieferte Fremd-Software und Grafiken: siehe [THIRD_PARTY_ICONS.md](THIRD_PARTY_ICONS.md), die Lizenzdateien unter
`public/fonts/` (Inter, Sora: SIL Open Font License) und die Hinweise, die `scripts/setup-native-deps.mjs` zu FFmpeg
und dem OBS-Graphics-Hook schreibt.

## Selbst bauen (Windows)

Voraussetzungen: Node.js 18+, [Rust](https://rustup.rs) (stable), Visual Studio 2022 Build Tools mit „Desktopentwicklung
mit C++“, [LLVM](https://llvm.org) (für libclang).

```bash
export PATH="$HOME/.cargo/bin:$PATH" LIBCLANG_PATH="C:\Program Files\LLVM\bin"
npx yarn install
npx yarn tauri dev                         # Entwicklung
npx yarn tauri build --bundles nsis        # Installer nach src-tauri/target/release/bundle/nsis/
```

Der Build signiert das Update (`.sig` neben dem Installer) und braucht dafür den privaten Schlüssel, z. B.
`TAURI_SIGNING_PRIVATE_KEY=~/.tauri/crimeclient-launcher.key TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""`. Wer selbst baut,
erzeugt mit `npx tauri signer generate` ein eigenes Paar und trägt den öffentlichen Schlüssel in `tauri.conf.json` ein.

`yarn native-deps` lädt beim ersten Start die FFmpeg- und Graphics-Hook-Bündel für die Clip-Aufnahme (Hash-geprüft).

Hinter einem Virenscanner mit HTTPS-Prüfung kann Tauri NSIS nicht selbst herunterladen. Dann `nsis-3.zip` aus
[tauri-apps/binary-releases](https://github.com/tauri-apps/binary-releases/releases/tag/nsis-3) nach
`%LOCALAPPDATA%\tauri\NSIS` entpacken und `nsis_tauri_utils.dll`
([v0.4.2](https://github.com/tauri-apps/nsis-tauri-utils/releases)) nach `NSIS\Plugins\x86-unicode\` und
`NSIS\Plugins\x86-unicode\additional\` legen.

Nur die Oberfläche im Browser, ohne Rust: `npx vite` und `http://localhost:1430` öffnen. Tauri-Befehle beantwortet dann
`src/dev/tauriMock.ts` mit Testdaten (`?noaccount` zeigt den Willkommensbildschirm, `?settings` die Einstellungen).
