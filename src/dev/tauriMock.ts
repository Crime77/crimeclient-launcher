// Dev-only stand-in for the Tauri backend, so the UI can be designed in a normal browser
// (`yarn dev` without `tauri dev`). Never loaded in a Tauri window or a production build.
import { mockConvertFileSrc, mockIPC, mockWindows } from "@tauri-apps/api/mocks";

const account = {
  id: "00000000-0000-0000-0000-000000000001",
  username: "crime77",
  minecraft_username: "crime77",
  active: true,
  access_token: "dev",
};

const settings = {
  java_path: null,
  use_custom_java_path: false,
  use_overwrite_loader_version: false,
  overwrite_loader_version: null,
  memory: { min: 1024, max: 4096 },
  resolution: null,
  fullscreen: false,
  extra_game_args: [],
  custom_jvm_args: null,
  quick_play_path: null,
};

function profile(id: string, name: string, version: string, loader: string, extra: object = {}) {
  return {
    id, name, path: id, game_version: version, loader, loader_version: "0.17.2",
    created: "2026-10-20T12:00:00Z", last_played: "2026-10-24T18:30:00Z", settings,
    state: "installed", mods: [], mod_count: 42, selected_norisk_pack_id: null,
    disabled_norisk_mods_detailed: [], source_standard_profile_id: null, group: null,
    use_shared_minecraft_folder: false, is_standard_version: false, description: null,
    banner: null, background: null, norisk_information: null, modpack_info: null,
    preferred_account_id: null, playtime_seconds: 36000, sync_pack_ids: [], ...extra,
  };
}

const profiles = [
  profile("p-crime", "CrimeClient", "26.3", "fabric"),
  profile("p-craftattack", "CraftAttack", "26.3", "fabric", { playtime_seconds: 120000 }),
  profile("p-vanilla", "Vanilla 1.21.10", "1.21.10", "vanilla", { mod_count: 0, last_played: null }),
];

const config = {
  version: 1, is_experimental: false, auto_check_updates: true, concurrent_downloads: 4,
  enable_discord_presence: true, check_beta_channel: false, profile_grouping_criterion: null,
  open_logs_after_starting: false, concurrent_io_limit: 8,
  hooks: { pre_launch: null, wrapper: null, post_exit: null }, hide_on_process_start: false,
  global_memory_settings: { min: 1024, max: 4096 }, global_custom_jvm_args: null,
  custom_game_directory: null, enable_analytics: false, use_browser_based_login: false,
  cache_natives_extraction: true, referral_state: null, last_played_profile: "p-crime",
  pack_rollout_override: "auto", log_level: "info",
  clips: {
    enabled: false, quality: "standard", width: 1920, height: 1080, fps: 60, bitrate_kbps: 12000,
    codec: "h264", encoder: "auto", capture_audio: true, audio_source: "system", audio_device_id: null,
    game_volume: 1, other_volume: 1, capture_microphone: false, microphone_device_id: null,
    microphone_volume: 1, microphone_denoise: false, excluded_audio_executable: null, output_dir: null,
    max_storage_gb: 10, pre_roll_seconds: 30, post_roll_seconds: 0, hotkey_save: "F8",
    hotkey_toggle: "F9", other_game: null, other_screen: null,
  },
};

// open http://localhost:1430/?noaccount to see the sign-in screen
const signedIn = !location.search.includes("noaccount");

const responses: Record<string, unknown> = {
  get_accounts: signedIn ? [account] : [],
  get_active_account: signedIn ? account : null,
  get_legal_status: { prompt: null, notice: null },
  get_launcher_config: config,
  set_launcher_config: config,
  get_app_version: "0.1.0-dev",
  list_profiles: profiles,
  get_all_profiles_and_last_played: { all_profiles: profiles, last_played_profile_id: "p-crime" },
  get_standard_profiles: { profiles: [] },
  get_processes: [],
  get_system_ram_mb: 16384,
  get_default_memory_max_mb: 4096,
  is_flatpak: false,
  capture_supported: false,
  get_cached_permissions: [],
  get_granted_permissions: [],
  has_permission: false,
  take_pending_deep_links: [],
  get_all_skins: [],
  get_equipped_cosmetics: [],
  get_equipped_cosmetics_cached: [],
  get_sync_packs: [],
  clip_list: [],
  search_mods_unified_command: { results: [], total_hits: 0, offset: 0, limit: 20 },
  search_modrinth_projects: { hits: [], total_hits: 0, offset: 0, limit: 20 },
  get_selected_player_icon: { url: null, plus: false },
  get_selected_player_icon_cached: { url: null, plus: false },
};

// a few real cosmetics so the shop page has something to show
const catalog = [
  { id: "ice_dragons", name: "Eisdrachen", slot: "back", accent: "#7DD3FC" },
  { id: "night_dragon_pet", name: "Nachtdrache", slot: "pet", accent: "#6D28D9" },
  { id: "energy_katana", name: "Energie-Katana", slot: "back", accent: "#22D3EE" },
  { id: "bat_wings", name: "Fledermausflügel", slot: "wings", accent: "#3F3F46" },
  { id: "peach_wings", name: "Pfirsichflügel", slot: "wings", accent: "#FDBA74" },
  { id: "chained_blue_wings", name: "Saphir-Kettenflügel", slot: "wings", accent: "#1E90FF" },
  { id: "bee_pet", name: "Biene", slot: "pet", accent: "#FACC15" },
  { id: "crown_gold", name: "Goldkrone", slot: "head", accent: "#F59E0B" },
  { id: "aura_flames", name: "Flammenaura", slot: "aura", accent: "#F97316" },
  { id: "totem_monster", name: "Monster-Dose", slot: "totem", accent: "#E5E7EB" },
  { id: "cape_crimson", name: "Crimson-Umhang", slot: "cape", accent: "#E8314A" },
  { id: "mace_obsidian", name: "Obsidian-Streitkolben", slot: "mace", accent: "#7C3AED" },
];
const prices: Record<string, number> = { ice_dragons: 1120, night_dragon_pet: 1500, energy_katana: 1500 };
const storeAccount = {
  uuid: account.id, name: "crime77", shards: 2350, rank: "vip", infinite: false, factor: 5,
  owned: ["bat_wings", "bee_pet"],
  streak: { day: 3, claimed: false, rewards: [50, 75, 100, 125, 150, 200, 250], next: 3600 },
};

function storeMock({ method, path, body }: { method: string; path: string; body: { id?: string } | null }) {
  if (path === "store") return { items: catalog.map((c) => ({ id: c.id, price: prices[c.id] ?? 800 })) };
  if (path.startsWith("catalog/")) return catalog;
  // copies, like the real backend which serializes a fresh object every time
  if (path === "account") return structuredClone(storeAccount);
  if (method === "POST" && path === "store/buy" && body?.id) {
    storeAccount.shards -= prices[body.id] ?? 800;
    storeAccount.owned = [...storeAccount.owned, body.id];
    return structuredClone(storeAccount);
  }
  if (path === "streak/claim") {
    storeAccount.shards += storeAccount.streak.rewards[storeAccount.streak.day - 1];
    storeAccount.streak = { ...storeAccount.streak, claimed: true };
    return structuredClone(storeAccount);
  }
  return null;
}

export function installTauriMock() {
  mockWindows("main");
  mockConvertFileSrc("windows");
  let nextId = 1;
  mockIPC((cmd, args) => {
    if (cmd.startsWith("plugin:event|")) return nextId++;
    if (cmd.startsWith("plugin:")) return null;
    if (cmd === "crime_store_request") return storeMock(args as { method: string; path: string; body: { id?: string } | null });
    if (cmd === "get_profile") {
      return profiles.find((p) => p.id === (args as { id?: string })?.id) ?? profiles[0];
    }
    if (cmd in responses) return responses[cmd];
    if (/^(get|list|search)_/.test(cmd) && cmd.endsWith("s")) return [];
    console.debug("[tauriMock] unhandled", cmd, args);
    return null;
  });

  // ?settings opens the settings dialog right away (for screenshots)
  if (location.search.includes("settings")) {
    setTimeout(() => {
      void import("../store/settings-modal-store").then((m) => m.useSettingsModalStore.getState().open());
    }, 1500);
  }
}
