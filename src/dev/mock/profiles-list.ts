// Dev mock for the profiles list, the profile wizard, the imports and the sync packs page
// (src/dev/tauriMock.ts asks every src/dev/mock/*.ts first; undefined = not mine).
import { blockTextureUrl } from "../../data/block-icons";

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

const DAY = 86_400_000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const icon = (block: string) => ({ source: { type: "url", url: blockTextureUrl(block) } });

function profile(id: string, name: string, version: string, loader: string, extra: object = {}) {
  return {
    id, name, path: id, game_version: version, loader, loader_version: loader === "vanilla" ? null : "0.17.2",
    created: "2026-10-20T12:00:00Z", last_played: "2026-10-24T18:30:00Z", settings,
    state: "installed", mods: [], mod_count: 42, selected_norisk_pack_id: null,
    disabled_norisk_mods_detailed: [], source_standard_profile_id: null, group: null,
    use_shared_minecraft_folder: false, is_standard_version: false, description: null,
    banner: null, background: null, norisk_information: null, modpack_info: null,
    preferred_account_id: null, playtime_seconds: 36000, sync_pack_ids: [], ...extra,
  };
}

// the four profiles of tauriMock.ts first (unchanged, other pages rely on them), then a realistic library
const profiles = [
  profile("p-crime", "CrimeClient", "26.3", "fabric"),
  profile("p-craftattack", "CraftAttack", "26.3", "fabric", { playtime_seconds: 120000 }),
  profile("p-vanilla", "Vanilla 1.21.10", "1.21.10", "vanilla", { mod_count: 0, last_played: null }),
  profile("p-rust", "CrimeClient Rust", "26.3", "vanilla", { game: "horizon", mod_count: 0 }),

  profile("p-hypixel", "Hypixel PvP", "1.8.9", "forge", {
    loader_version: "11.15.1.2318", group: "SERVER", mod_count: 18, playtime_seconds: 1_483_200,
    last_played: ago(3 * 3_600_000), banner: icon("redstone_block"), created: "2025-06-02T10:00:00Z",
  }),
  profile("p-smp", "Freunde SMP", "26.3", "fabric", {
    group: "SERVER", mod_count: 31, playtime_seconds: 203_400, last_played: ago(26 * 3_600_000),
    banner: icon("grass_block_side"), sync_pack_ids: ["sp-basics", "sp-keys"], preferred_account_id: "00000000-0000-0000-0000-000000000001",
  }),
  profile("p-fo", "Fabulously Optimized", "1.21.10", "fabric", {
    loader_version: "0.16.14", group: "MODPACKS", mod_count: 96, playtime_seconds: 41_760,
    last_played: ago(5 * DAY), banner: icon("amethyst_block"),
    modpack_info: { source: { source: "modrinth", project_id: "1KVo5zza", version_id: "nV6Qe1l3" } },
  }),
  profile("p-cobblemon", "Cobblemon Official", "1.21.1", "fabric", {
    loader_version: "0.16.10", group: "MODPACKS", mod_count: 143, playtime_seconds: 227_520,
    last_played: ago(2 * DAY), banner: icon("honeycomb_block"), sync_pack_ids: ["sp-basics"],
    modpack_info: { source: { source: "modrinth", project_id: "5FFgwNNP", version_id: "7r2fJm0w" } },
  }),
  profile("p-createab", "Create: Above and Beyond", "1.16.5", "forge", {
    loader_version: "36.2.39", group: "MODPACKS", mod_count: 187, playtime_seconds: 512_000,
    last_played: ago(41 * DAY), banner: icon("copper_block"), created: "2025-02-11T19:00:00Z",
    modpack_info: { source: { source: "curse_forge", project_id: 542763, file_id: 4835711 } },
  }),
  profile("p-survival", "Survival mit Lena", "26.3", "fabric", {
    group: "survival", mod_count: 27, playtime_seconds: 98_640, last_played: ago(9 * 3_600_000),
    banner: icon("oak_log"), sync_pack_ids: ["sp-basics", "sp-shaders"], use_shared_minecraft_folder: true,
  }),
  profile("p-hardcore", "Hardcore Welt 4", "26.3", "fabric", {
    group: "survival", mod_count: 12, playtime_seconds: 15_300, last_played: ago(12 * DAY),
    banner: icon("crying_obsidian"), sync_pack_ids: ["sp-basics"], use_shared_minecraft_folder: true,
  }),
  profile("p-redstone", "Redstone Labor", "1.21.10", "fabric", {
    group: "creative", mod_count: 9, playtime_seconds: 7_920, last_played: ago(19 * DAY), banner: icon("observer_front"),
  }),
  profile("p-speedrun", "Speedrun 1.16.1", "1.16.1", "fabric", {
    loader_version: "0.14.21", group: "speedrun", mod_count: 14, playtime_seconds: 64_800,
    last_played: ago(73 * DAY), banner: icon("end_stone"),
  }),
  profile("p-snapshot", "Snapshot 26w45a", "26w45a", "vanilla", {
    mod_count: 0, playtime_seconds: 1_260, last_played: ago(40 * 60_000), created: "2026-11-04T17:00:00Z",
  }),
  profile("p-shader", "Shader-Test", "26.3", "fabric", {
    group: "creative", mod_count: 6, playtime_seconds: 0, last_played: null, created: "2026-11-03T21:00:00Z",
    sync_pack_ids: ["sp-shaders"],
  }),
  // the copy of the CrimeClient Insider standard profile; only accounts with access see it (tauriMock.ts insiderMock)
  profile("p-insider", "CrimeClient Insider 26.3", "26.3", "fabric", {
    group: "CRIMECLIENT", mod_count: 44, playtime_seconds: 5_400, last_played: ago(2 * DAY), is_standard_version: true,
    selected_norisk_pack_id: "crimeclient-insider", source_standard_profile_id: "insider-standard",
  }),
];

// --- sync packs ----------------------------------------------------------------------------

const modrinthMod = (id: string, name: string, project: string, extra: object = {}) => ({
  id, display_name: name, enabled: true, version: null, game_versions: null, file_name_override: null,
  associated_loader: null, updates_enabled: true, force_include_versions: [], version_overrides: {},
  source: { type: "modrinth", project_id: project, version_id: "", file_name: `${id}.jar`, download_url: "", file_hash_sha1: null },
  ...extra,
});

const syncPacks = [
  {
    id: "sp-basics", name: "Grundausstattung", description: null, icon: blockTextureUrl("crafting_table_top"),
    created: "2026-09-01T12:00:00Z", updated: "2026-11-02T08:00:00Z", enabled: true, sort_order: 0,
    targets: [
      { id: "t-options", path: "options.txt", enabled: true, external_path: null,
        kind: { type: "file_merge", format: "minecraft_options", local_keys: ["resourcePacks"] } },
      { id: "t-servers", path: "servers.dat", enabled: true, external_path: null, kind: { type: "file_copy" } },
      { id: "t-screens", path: "screenshots", enabled: true, external_path: "\\\\?\\D:\\Bilder\\Minecraft",
        kind: { type: "dir_link", adopt: "backup_local" } },
    ],
    mods: [
      modrinthMod("m-sodium", "Sodium", "AANobbMI"),
      modrinthMod("m-modmenu", "Mod Menu", "mOgUt4GM"),
      modrinthMod("m-jei", "Just Enough Items", "u6dRKJwZ", { enabled: false }),
    ],
  },
  {
    id: "sp-shaders", name: "Shader und Licht", description: null, icon: blockTextureUrl("sea_lantern"),
    created: "2026-09-14T12:00:00Z", updated: "2026-10-30T20:00:00Z", enabled: true, sort_order: 1,
    targets: [
      { id: "t-shaderpacks", path: "shaderpacks", enabled: true, external_path: null, kind: { type: "dir_link", adopt: "backup_local" } },
    ],
    mods: [modrinthMod("m-iris", "Iris Shaders", "YL57xq9U")],
  },
  {
    id: "sp-keys", name: "Tastenbelegung PvP", description: null, icon: null,
    created: "2026-10-05T12:00:00Z", updated: "2026-10-05T12:00:00Z", enabled: true, sort_order: 2,
    targets: [], mods: [],
  },
];

const matrix: Record<string, unknown[]> = {
  "sp-basics": [
    { mod_id: "m-sodium", display_name: "Sodium", project_key: "modrinth:AANobbMI", resolvable: true, rows: [
      { mc_version: "26.3", loader: "fabric", status: "auto_resolved", resolved_version_id: "s1", resolved_version_name: "mc26.3-0.7.2-fabric", resolved_filename: "sodium-fabric-0.7.2+mc26.3.jar" },
      { mc_version: "1.21.10", loader: "fabric", status: "override_pinned", resolved_version_id: "s2", resolved_version_name: "mc1.21.10-0.7.0-fabric", resolved_filename: "sodium-fabric-0.7.0+mc1.21.10.jar" },
      { mc_version: "1.21.1", loader: "fabric", status: "unresolved", resolved_version_id: null, resolved_version_name: null, resolved_filename: null },
    ] },
    { mod_id: "m-modmenu", display_name: "Mod Menu", project_key: "modrinth:mOgUt4GM", resolvable: true, rows: [
      { mc_version: "26.3", loader: "fabric", status: "auto_resolved", resolved_version_id: "mm1", resolved_version_name: "16.0.0", resolved_filename: "modmenu-16.0.0.jar" },
    ] },
  ],
};

// --- profile wizard ------------------------------------------------------------------------

const release = (id: string, date: string) => ({ id, type: "release", url: "", time: date, releaseTime: date });
const snapshot = (id: string, date: string) => ({ id, type: "snapshot", url: "", time: date, releaseTime: date });

const versionManifest = {
  latest: { release: "26.3", snapshot: "26w45a" },
  versions: [
    snapshot("26w45a", "2026-11-04"), snapshot("26w44a", "2026-10-28"),
    release("26.3", "2026-10-07"), snapshot("26.3-rc2", "2026-10-02"), release("26.2", "2026-06-17"),
    release("26.1.2", "2026-04-08"), release("26.1", "2026-03-25"),
    release("1.21.10", "2025-10-07"), release("1.21.9", "2025-09-30"), release("1.21.8", "2025-07-17"),
    release("1.21.7", "2025-06-30"), release("1.21.6", "2025-06-17"), release("1.21.5", "2025-03-25"),
    release("1.21.4", "2024-12-03"), release("1.21.3", "2024-10-23"), release("1.21.1", "2024-08-08"),
    release("1.21", "2024-06-13"), release("1.20.6", "2024-04-29"), release("1.20.4", "2023-12-07"),
    release("1.20.1", "2023-06-12"), release("1.19.4", "2023-03-14"), release("1.19.2", "2022-08-05"),
    release("1.18.2", "2022-02-28"), release("1.17.1", "2021-07-06"), release("1.16.5", "2021-01-15"),
    release("1.16.1", "2020-06-24"), release("1.12.2", "2017-09-18"), release("1.8.9", "2015-12-09"),
  ],
};

const fabricLoaders = ["0.17.2", "0.17.1", "0.17.0", "0.16.14", "0.16.13", "0.16.10"].map((version, i) => ({
  loader: { version, stable: i !== 2 },
}));

// --- launcher import -----------------------------------------------------------------------

const launchers = [
  { launcher: "prism_launcher", displayName: "Prism Launcher", root: "C:\\Users\\crime77\\AppData\\Roaming\\PrismLauncher",
    instancesDir: "C:\\Users\\crime77\\AppData\\Roaming\\PrismLauncher\\instances", instanceCount: 4, autoDetected: true },
  { launcher: "modrinth_app", displayName: "Modrinth App", root: "C:\\Users\\crime77\\AppData\\Roaming\\ModrinthApp",
    instancesDir: "C:\\Users\\crime77\\AppData\\Roaming\\ModrinthApp\\profiles", instanceCount: 2, autoDetected: true },
  { launcher: "vanilla_launcher", displayName: "Minecraft Launcher", root: "C:\\Users\\crime77\\AppData\\Roaming\\.minecraft",
    instancesDir: "C:\\Users\\crime77\\AppData\\Roaming\\.minecraft", instanceCount: 1, autoDetected: true },
];

const instance = (launcher: string, root: string, name: string, gameVersion: string | null, loader: string, extra: object = {}) => ({
  launcher, root, instanceDir: `${root}\\instances\\${name}`, folderName: name, name, gameVersion, loader,
  loaderVersion: null, lastPlayed: ago(4 * DAY), modCount: 0, iconPath: null, unsupported: null, ...extra,
});

const instances: Record<string, unknown[]> = {
  prism_launcher: [
    instance("prism_launcher", launchers[0].root, "All the Mods 10", "1.21.1", "neoforge", { modCount: 412, lastPlayed: ago(9 * DAY) }),
    instance("prism_launcher", launchers[0].root, "Fabric 26.3", "26.3", "fabric", { modCount: 23, lastPlayed: ago(2 * DAY) }),
    instance("prism_launcher", launchers[0].root, "Skyblock Tests", "1.20.4", "fabric", { modCount: 51, lastPlayed: null }),
    instance("prism_launcher", launchers[0].root, "Kaputte Instanz", null, "unknown", { unsupported: "no_game_version", lastPlayed: null }),
  ],
  modrinth_app: [
    instance("modrinth_app", launchers[1].root, "Simply Optimized", "1.21.10", "fabric", { modCount: 38, lastPlayed: ago(20 * DAY) }),
    instance("modrinth_app", launchers[1].root, "Better MC", "1.20.1", "forge", { modCount: 268, lastPlayed: ago(130 * DAY) }),
  ],
  vanilla_launcher: [
    instance("vanilla_launcher", launchers[2].root, "Latest release", "26.3", "vanilla", { modCount: null, lastPlayed: ago(6 * DAY) }),
  ],
};

const security = {
  strippedJavaPath: "C:\\Program Files\\Java\\jdk-17\\bin\\javaw.exe", strippedJvmArgs: "-XX:+UseG1GC -Xmx8G",
  strippedGameArgs: [], strippedQuickPlayPath: null, strippedLoaderVersion: null,
  rejectedMods: [{ displayName: "OptiFine_1.21.1_HD_U_J1.jar", reason: "unknown" }], thirdPartyDownloadHosts: ["cdn.example-mods.net"],
  unverifiedModCount: 2, strippedProfileFlags: [],
};

const buckets = [
  { key: "mods", entryCount: 412, bytes: 1_245_000_000, defaultSelected: true },
  { key: "config", entryCount: 1_830, bytes: 22_400_000, defaultSelected: true },
  { key: "options", entryCount: 3, bytes: 18_000, defaultSelected: true },
  { key: "saves", entryCount: 4, bytes: 860_000_000, defaultSelected: true },
  { key: "resourcepacks", entryCount: 2, bytes: 48_000_000, defaultSelected: true },
  { key: "shaderpacks", entryCount: 0, bytes: 0, defaultSelected: true },
  { key: "screenshots", entryCount: 214, bytes: 610_000_000, defaultSelected: false },
];

function instancePreview(args: { params?: { launcher?: string; root?: string; instanceDir?: string } }) {
  const dir = args.params?.instanceDir ?? "";
  const name = dir.split("\\").pop() ?? "Instanz";
  return {
    launcher: args.params?.launcher ?? "prism_launcher", launcherDisplayName: "Prism Launcher", root: args.params?.root ?? "",
    instanceDir: dir, suggestedName: name, suggestedGroup: "modpacks", gameVersion: "1.21.1", loader: "neoforge",
    loaderVersion: "21.1.172", modCount: 412, disabledModCount: 3, buckets,
    totalBytes: buckets.reduce((s, b) => s + b.bytes, 0), selectedBytes: 2_175_418_000, icon: null, security,
    provenance: { verifiedCount: 409, unknown: [{ name: "mods/custom-hud-1.4.jar", reason: "not_on_platform" }, { name: "mods/serverutils.jar", reason: "no_hash" }], incomplete: false },
    executableContent: { scripts: ["kubejs/startup_scripts/main.js"], natives: [], scriptCount: 1, nativeCount: 0, truncated: false },
    managedPack: null, noriskPack: { packId: "crimeclient", preselected: false },
    warnings: ["skipped_symlink:saves/Welt (Server-Kopie)"], alreadyImportedAt: null,
  };
}

const packPreview = (filePath: string) => ({
  filePath, fileName: filePath.split(/[/\\]/).pop() ?? filePath, fileSize: 18_400_000, packType: "mrpack",
  profileName: "Fabulously Optimized", group: "MODPACKS", gameVersion: "1.21.10", loader: "fabric", loaderVersion: "0.16.14",
  modCount: 96, overrideFileCount: 37, security: { ...security, strippedJavaPath: null, rejectedMods: [] },
  provenance: { verifiedCount: 96, unknown: [], incomplete: false }, noriskPack: { packId: "crimeclient", preselected: false },
  executableContent: { scripts: [], natives: [], scriptCount: 0, nativeCount: 0, truncated: false },
});

// --- handler -------------------------------------------------------------------------------

// Versions of a modrinth modpack ("Modpack versions" in a profile's menu)
function modpackVersions(args: Record<string, unknown>) {
  const source = (args.modpackSource ?? args.source ?? {}) as { project_id?: string; version_id?: string };
  const projectId = source.project_id ?? "1KVo5zza";
  const rows: [string, string, string[], number, number, "release" | "beta" | "alpha"][] = [
    ["7.3.0", "7.3.0 for 1.21.10", ["1.21.10"], 3, 48_210, "release"],
    ["7.2.1", "7.2.1 for 1.21.10", ["1.21.10", "1.21.9"], 12, 391_400, "release"],
    ["7.2.0", "7.2.0 for 1.21.9", ["1.21.9", "1.21.8", "1.21.7"], 26, 1_204_000, "release"],
    ["7.2.0-beta.3", "7.2.0 Beta 3", ["1.21.9"], 31, 9_870, "beta"],
    ["7.1.4", "7.1.4 for 1.21.8", ["1.21.8"], 44, 2_310_000, "release"],
    ["7.1.0-alpha.1", "7.1.0 Alpha 1", ["1.21.6"], 70, 2_140, "alpha"],
    ["7.0.2", "7.0.2 for 1.21.5", ["1.21.5", "1.21.4"], 96, 3_880_000, "release"],
  ];
  const all_versions = rows.map(([number, name, game_versions, daysAgo, downloads, release_type], index) => ({
    id: index === 2 ? (source.version_id ?? `v-${number}`) : `v-${number}`,
    project_id: projectId,
    source: "Modrinth",
    name,
    version_number: number,
    changelog: index === 0
      ? "### Changes\n- Updated Sodium and Iris\n- Fixed a crash with the shader menu\n\n> Needs Java 21."
      : undefined,
    dependencies: [],
    game_versions,
    loaders: ["fabric"],
    files: [{ filename: `pack-${number}.mrpack`, url: `https://cdn.modrinth.com/pack-${number}.mrpack`, size: 1_800_000, hashes: {}, primary: true }],
    date_published: ago(daysAgo * DAY),
    downloads,
    release_type,
    url: "",
  }));
  return { installed_version: all_versions[2], all_versions, updates_available: true };
}

export function handle(cmd: string, args: Record<string, unknown>): unknown {
  switch (cmd) {
    case "list_profiles":
      return profiles;
    case "get_all_profiles_and_last_played":
      return { all_profiles: profiles, last_played_profile_id: "p-crime" };
    case "get_profile": {
      const found = profiles.find((p) => p.id === args.id);
      // the four base profiles stay with tauriMock.ts
      return found && !["p-crime", "p-craftattack", "p-vanilla", "p-rust"].includes(found.id) ? found : undefined;
    }
    case "resolve_image_path": {
      const source = args.imageSource as { type?: string; url?: string } | undefined;
      return source?.type === "url" ? source.url : undefined;
    }

    case "get_sync_packs":
      return structuredClone(syncPacks);
    case "get_sync_pack":
      return structuredClone(syncPacks.find((p) => p.id === args.packId) ?? null);
    case "get_sync_pack_local_jars":
      return args.packId === "sp-basics" ? ["BetterF3-12.0.1.jar"] : [];
    case "get_sync_pack_mod_matrix":
      return matrix[args.packId as string] ?? [];
    case "get_profile_sync_conflicts":
      return args.profileId === "p-survival"
        ? [{ path: "options.txt", winner_pack_id: "sp-basics", winner_pack_name: "Grundausstattung", winner_kind: "file_merge",
             loser_pack_id: "sp-shaders", loser_pack_name: "Shader und Licht", loser_kind: "file_copy" }]
        : [];
    case "get_sync_pack_subscribers":
      return profiles.filter((p) => p.sync_pack_ids.includes(args.packId as string))
        .map((p) => ({ profile_id: p.id, profile_name: p.name, instance_path: `C:\\CrimeClient\\profiles\\${p.id}` }));
    case "list_sync_seed_candidates":
      return profiles.slice(4, 10).map((p, i) => ({
        profile_id: p.id, profile_name: p.name, path: `C:\\CrimeClient\\profiles\\${p.id}\\${args.relativePath}`,
        exists: true, entries: 3 + i * 7, last_played: p.last_played,
      }));

    case "get_minecraft_versions":
      return versionManifest;
    case "get_fabric_loader_versions":
    case "get_quilt_loader_versions":
      return /w|rc/.test(String(args.minecraftVersion)) && cmd === "get_quilt_loader_versions" ? [] : fabricLoaders;
    case "get_forge_versions":
      return String(args.minecraftVersion).startsWith("26") ? [] : ["52.1.0", "52.0.45", "52.0.40", "51.0.33"];
    case "get_neoforge_versions":
      return String(args.minecraftVersion).startsWith("26.3") ? ["26.3.4-beta", "26.3.2-beta"] : ["21.1.172", "21.1.168"];

    case "scan_external_launchers":
      return launchers;
    case "list_external_instances":
      return instances[(args.params as { launcher?: string } | undefined)?.launcher ?? ""] ?? [];
    case "preview_external_instance":
      return instancePreview(args as { params?: { instanceDir?: string } });
    case "get_modpack_versions_unified_command":
      return modpackVersions(args);
    case "preview_import_pack":
      return packPreview(String(args.filePathStr ?? "Fabulously Optimized 7.2.mrpack"));

    default:
      return undefined;
  }
}
