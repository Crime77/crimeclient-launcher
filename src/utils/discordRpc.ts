import { invoke } from "@tauri-apps/api/core";

/** What the Discord activity says on each launcher page; the pages pass the English key. */
const PAGE_TEXT: Record<string, string> = {
  "Idling": "Im Launcher",
  "Browsing Mods": "Sucht Mods",
  "Browsing Modpacks": "Sucht Modpacks",
  "Browsing Resource Packs": "Sucht Ressourcenpakete",
  "Browsing Shaders": "Sucht Shader",
  "Browsing Data Packs": "Sucht Datenpakete",
  "Viewing a Mod": "Schaut sich eine Mod an",
  "Editing a Profile": "Bearbeitet ein Profil",
  "Managing Profiles": "Verwaltet Profile",
  "Browsing Clips": "Schaut Clips",
  "Browsing Skins": "Sucht Skins",
  "Configuring Settings": "In den Einstellungen",
};

export function setDiscordState(state: string) {
  invoke("set_discord_state", { stateType: PAGE_TEXT[state] ?? state }).catch(() => {});
}
