# CrimeClient Launcher

Der Launcher für [CrimeClient](https://crime77.duckdns.org/client/), den kostenlosen Fabric-Client für Minecraft 26.3.
Anmelden mit dem Microsoft-Konto, Profil wählen, Spielen drücken: Das CrimeClient-Modpack ist schon eingerichtet.
Dazu ein Shop, in dem man Shards für Cosmetics ausgibt, Skin-Verwaltung und Mods von Modrinth.

**Download:** [crime77.duckdns.org/client](https://crime77.duckdns.org/client/) (Windows 10/11, Beta)

## Herkunft und Lizenz

Dies ist ein Fork des [NoRiskClient-Launchers](https://github.com/NoRiskClient/noriskclient-launcher) (v0.6.29), der
seinerseits auf [LiquidLauncher](https://github.com/CCBlueX/LiquidLauncher) aufbaut. Er steht wie das Original unter der
[GNU General Public License v3.0](LICENSE). Mit NoRisk hat dieses Projekt nichts zu tun; NoRisk unterstützt es nicht.

Geändert gegenüber dem Original (Details in der Git-Historie, Branch `crimeclient`):

- eigene Oberfläche (Startseite, Navigation, Glas-Design, Schriften Inter und Sora), Name, Icon und Datenordner
- eigener Microsoft-Login (direktes OAuth), keine Verbindung zu NoRisk-Servern, kein Selbst-Updater, keine Analytics
- Profile und Modpack kommen von der CrimeClient-API, News aus dem CrimeClient-Changelog
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

`yarn native-deps` lädt beim ersten Start die FFmpeg- und Graphics-Hook-Bündel für die Clip-Aufnahme (Hash-geprüft).

Hinter einem Virenscanner mit HTTPS-Prüfung kann Tauri NSIS nicht selbst herunterladen. Dann `nsis-3.zip` aus
[tauri-apps/binary-releases](https://github.com/tauri-apps/binary-releases/releases/tag/nsis-3) nach
`%LOCALAPPDATA%\tauri\NSIS` entpacken und `nsis_tauri_utils.dll`
([v0.4.2](https://github.com/tauri-apps/nsis-tauri-utils/releases)) nach `NSIS\Plugins\x86-unicode\` und
`NSIS\Plugins\x86-unicode\additional\` legen.

Nur die Oberfläche im Browser, ohne Rust: `npx vite` und `http://localhost:1430` öffnen. Tauri-Befehle beantwortet dann
`src/dev/tauriMock.ts` mit Testdaten (`?noaccount` zeigt den Willkommensbildschirm, `?settings` die Einstellungen).
