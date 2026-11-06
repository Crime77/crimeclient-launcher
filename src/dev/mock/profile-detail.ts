// Dev mock for the profile detail page (#/profiles/<id>): installed mods, resource packs and shader packs,
// worlds and servers, screenshots (painted on a canvas) and log files.
// src/dev/tauriMock.ts asks every src/dev/mock/*.ts first; undefined = not mine.

const DAY = 86_400_000;
const HOUR = 3_600_000;
const MC_ASSETS = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.4/assets/minecraft/textures/block";

// --- helpers -----------------------------------------------------------------------------------

/** deterministic pseudo random numbers from a string seed */
function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sha1(seed: string): string {
  const r = rng(seed);
  let out = "";
  for (let i = 0; i < 40; i++) out += Math.floor(r() * 16).toString(16);
  return out;
}

function profileId(args: Record<string, unknown>): string {
  const params = args.params as { profile_id?: string } | undefined;
  return String(args.profileId ?? params?.profile_id ?? args.id ?? "p-crime");
}

// --- installed content -------------------------------------------------------------------------

interface Seed {
  file: string;
  name: string;
  version: string;
  project?: string;
  icon?: string;
  size: number;
  disabled?: boolean;
  paused?: boolean;
  modpack?: string;
}

const cdn = (id: string, file: string) => `https://cdn.modrinth.com/data/${id}/${file}`;

const MODS: Seed[] = [
  { file: "fabric-api-0.141.0+26.3.jar", name: "Fabric API", version: "0.141.0+26.3", project: "P7dR8mSH", icon: cdn("P7dR8mSH", "icon.png"), size: 2_418_000 },
  { file: "sodium-fabric-0.8.2+mc26.3.jar", name: "Sodium", version: "mc26.3-0.8.2-fabric", project: "AANobbMI", icon: cdn("AANobbMI", "295862f4724dc3f78df3447ad6072b2dcd3ef0c9_96.webp"), size: 1_214_000 },
  { file: "lithium-fabric-0.19.1+mc26.3.jar", name: "Lithium", version: "mc26.3-0.19.1-fabric", project: "gvQqBUqZ", icon: cdn("gvQqBUqZ", "bcc8686c13af0143adf4285d741256af824f70b7_96.webp"), size: 812_000 },
  { file: "iris-fabric-1.10.4+mc26.3.jar", name: "Iris Shaders", version: "1.10.4+mc26.3", project: "YL57xq9U", icon: cdn("YL57xq9U", "18d0e7f076d3d6ed5bedd472b853909aac5da202_96.webp"), size: 3_046_000 },
  { file: "modmenu-17.0.0.jar", name: "Mod Menu", version: "17.0.0", project: "mOgUt4GM", icon: cdn("mOgUt4GM", "5a20ed1450a0e1e79a1fe04e61bb4e5878bf1d20.png"), size: 590_000 },
  { file: "entityculling-fabric-1.9.4-mc26.3.jar", name: "Entity Culling", version: "1.9.4", project: "NNAgCjsB", icon: cdn("NNAgCjsB", "7873452d6cede4daed12da3d7d8c193ab88b4fd6_96.webp"), size: 288_000 },
  { file: "ferritecore-8.1.0-fabric.jar", name: "FerriteCore", version: "8.1.0", project: "uXXizFIs", icon: cdn("uXXizFIs", "222a126f26f8f9ae1eb339f3b767677f18bff31f_96.webp"), size: 142_000 },
  { file: "ImmediatelyFast-Fabric-1.6.9+26.3.jar", name: "ImmediatelyFast", version: "1.6.9+26.3", project: "5ZwdcRci", icon: cdn("5ZwdcRci", "e57b6b451425692ac17ad322d5e14bea686a383a_96.webp"), size: 436_000 },
  { file: "moreculling-fabric-26.3-1.4.1.jar", name: "More Culling", version: "1.4.1", project: "51shyZVL", icon: cdn("51shyZVL", "c51b07193b56e952269ef50101d12aecba2b4747_96.webp"), size: 204_000 },
  { file: "cloth-config-20.0.149-fabric.jar", name: "Cloth Config API", version: "20.0.149", project: "9s6osm5g", icon: cdn("9s6osm5g", "ed8a2316cbb6f4fc5f510e8e13a59a85cbbbff4d_96.webp"), size: 1_102_000 },
  { file: "voxy-0.2.7-alpha.jar", name: "Voxy", version: "0.2.7-alpha", project: "fxxUqruK", icon: cdn("fxxUqruK", "2a4159b1ff6ecba43bf895d6abee6f724a0e03c0_96.webp"), size: 1_880_000, paused: true },
  { file: "lambdynamiclights-4.4.0+26.3.jar", name: "LambDynamicLights", version: "4.4.0+26.3", project: "yBW8D80W", icon: cdn("yBW8D80W", "d4f5c3ff8df7caf024178b04eca6d69f95979cfe_96.webp"), size: 702_000, disabled: true },
  { file: "voicechat-fabric-26.3-2.6.8.jar", name: "Simple Voice Chat", version: "fabric-26.3-2.6.8", project: "9eGKb6K1", icon: cdn("9eGKb6K1", "icon.png"), size: 5_904_000 },
  { file: "zoomify-2.15.1+26.3.jar", name: "Zoomify", version: "2.15.1+26.3", project: "w7ThoJFB", icon: cdn("w7ThoJFB", "e2de67a0bfb9e8aa2347982ab3ec5463f26cca31_96.webp"), size: 380_000, disabled: true },
  { file: "appleskin-fabric-mc26.3-3.0.7.jar", name: "AppleSkin", version: "3.0.7+mc26.3", project: "EsAfCjCV", icon: cdn("EsAfCjCV", "icon.png"), size: 96_000 },
  { file: "Jade-26.3-Fabric-20.2.1.jar", name: "Jade", version: "20.2.1+fabric", project: "nvQzSEkH", icon: cdn("nvQzSEkH", "b04217bc2b7dc524c4d12f81ff42cc1cefb9b0fc_96.webp"), size: 1_340_000 },
  { file: "continuity-3.0.1+26.3.jar", name: "Continuity", version: "3.0.1+26.3", project: "1IjD5062", icon: cdn("1IjD5062", "icon.png"), size: 274_000 },
  { file: "modernfix-fabric-5.24.4+mc26.3.jar", name: "ModernFix", version: "5.24.4+mc26.3", project: "nmDcB62a", icon: cdn("nmDcB62a", "2af94de5e08ae54567ee86b968fc7ce076d9fee5_96.webp"), size: 1_066_000 },
  { file: "crimeclient-2.4.1.jar", name: "crimeclient-2.4.1.jar", version: "", size: 48_620_000 },
  { file: "BetterF3-15.0.2-Fabric-26.3.jar", name: "BetterF3-15.0.2-Fabric-26.3.jar", version: "", size: 212_000 },
];

const RESOURCE_PACKS: Seed[] = [
  { file: "FreshAnimations_v1.10.2.zip", name: "Fresh Animations", version: "v1.10.2", project: "50dA9Sha", icon: cdn("50dA9Sha", "3132c10e9e3c73fde9799720fd3da5561071708c_96.webp"), size: 3_412_000 },
  { file: "Faithful 32x - 26.3.zip", name: "Faithful 32x", version: "26.3", project: "w0TnApzs", icon: cdn("w0TnApzs", "e8403d1fb2f55321ae74402c1e8c90a3a5670856.png"), size: 12_840_000 },
  { file: "LowFire-1.4.zip", name: "Low Fire", version: "1.4", project: "Gou1gmGj", icon: cdn("Gou1gmGj", "010bdbcac9a6c6649757795d32c6794883e6aba3_96.webp"), size: 18_000 },
  { file: "CrimeClient-UI.zip", name: "CrimeClient-UI.zip", version: "", size: 640_000 },
  { file: "ClearGlass.zip", name: "ClearGlass.zip", version: "", size: 42_000, disabled: true },
];

const SHADER_PACKS: Seed[] = [
  { file: "photon_v1.4.zip", name: "Photon Shaders", version: "v1.4", project: "lLqFfGNs", icon: cdn("lLqFfGNs", "39cb5f12e7dcc68d6cb666f225fcb2b801dd70fb_96.webp"), size: 3_857_333 },
  { file: "ComplementaryReimagined_r5.5.1.zip", name: "Complementary Reimagined", version: "r5.5.1", project: "HVnmMxH1", icon: cdn("HVnmMxH1", "79cb7c8123bbc54945305b2ebad6b8881efdf5f8_96.webp"), size: 1_204_000 },
  { file: "BSL_v10.0.zip", name: "BSL Shaders", version: "v10.0", project: "Q1vvjJYV", icon: cdn("Q1vvjJYV", "2a611a3cb434fb52fb81fa5dace13c5d8b67e55d_96.webp"), size: 642_000, disabled: true },
];

const FOLDER: Record<string, string> = {
  Mod: "mods", ResourcePack: "resourcepacks", ShaderPack: "shaderpacks", DataPack: "datapacks", NoRiskMod: "mods",
};

function seedsFor(profile: string, type: string): Seed[] {
  if (profile === "p-rust") return type === "ShaderPack" ? SHADER_PACKS.slice(0, 1) : [];
  if (profile === "p-vanilla") return type === "ResourcePack" ? RESOURCE_PACKS.slice(1, 3) : [];
  switch (type) {
    case "Mod":
      return profile === "p-crime" ? MODS : MODS.slice(0, 12);
    case "ResourcePack":
      return RESOURCE_PACKS;
    case "ShaderPack":
      return SHADER_PACKS;
    default:
      return [];
  }
}

// local edits survive a refetch (toggle, delete, pause updates)
const disabledOverride = new Map<string, boolean>();
const pausedOverride = new Map<string, boolean>();
const removed = new Set<string>();

function contentItem(profile: string, type: string, s: Seed) {
  const dir = `C:\\CrimeClient\\profiles\\${profile}\\${FOLDER[type] ?? "mods"}`;
  const key = `${profile}/${s.file}`;
  const disabled = disabledOverride.get(key) ?? !!s.disabled;
  const filename = disabled ? `${s.file}.disabled` : s.file;
  return {
    filename,
    path_str: `${dir}\\${filename}`,
    sha1_hash: sha1(s.file),
    file_size: s.size,
    is_disabled: disabled,
    is_directory: false,
    content_type: type,
    modrinth_info: s.project
      ? { project_id: s.project, version_id: sha1(`${s.file}-v`).slice(0, 8), name: s.name, version_number: s.version, icon_url: s.icon ?? null }
      : null,
    curseforge_info: null,
    platform: s.project ? "Modrinth" : null,
    source_type: s.project ? "modrinth" : "custom",
    norisk_info: null,
    fallback_version: null,
    id: s.project ? `mod-${s.project}` : null,
    associated_loader: null,
    modpack_origin: s.modpack ?? null,
    updates_enabled: pausedOverride.has(key) ? !pausedOverride.get(key) : s.paused ? false : null,
  };
}

function localContent(args: Record<string, unknown>) {
  const params = (args.params ?? {}) as { profile_id?: string; content_type?: string };
  const profile = params.profile_id ?? "p-crime";
  const type = params.content_type ?? "Mod";
  return seedsFor(profile, type)
    .filter((s) => !removed.has(`${profile}/${s.file}`))
    .map((s) => contentItem(profile, type, s));
}

function findSeed(pathOrName: string): { profile: string; seed: Seed } | null {
  const m = /profiles\\([^\\]+)\\/.exec(pathOrName);
  const profile = m?.[1] ?? "p-crime";
  const base = pathOrName.split(/[\\/]/).pop()?.replace(/\.disabled$/, "") ?? "";
  const seed = [...MODS, ...RESOURCE_PACKS, ...SHADER_PACKS].find((s) => s.file === base);
  return seed ? { profile, seed } : null;
}

interface Toggle { profile_id?: string; sha1_hash?: string; file_path?: string; enabled?: boolean }

function toggle(payload: Toggle | undefined) {
  if (!payload) return;
  const seed = [...MODS, ...RESOURCE_PACKS, ...SHADER_PACKS].find(
    (s) => (payload.sha1_hash && sha1(s.file) === payload.sha1_hash) || (payload.file_path && findSeed(payload.file_path)?.seed === s),
  );
  if (seed) disabledOverride.set(`${payload.profile_id ?? "p-crime"}/${seed.file}`, payload.enabled === false);
}

/** one update for a mod and one for a resource pack, so the update badges show */
function updateCheck(args: Record<string, unknown>) {
  const request = (args.request ?? {}) as { hashes?: string[] };
  const offer: Record<string, { name: string; project: string; version: string }> = {
    [sha1(MODS[1].file)]: { name: "Sodium 0.8.3", project: "AANobbMI", version: "mc26.3-0.8.3-fabric" },
    [sha1(MODS[15].file)]: { name: "Jade 20.3.0", project: "nvQzSEkH", version: "20.3.0+fabric" },
    [sha1(RESOURCE_PACKS[0].file)]: { name: "Fresh Animations v1.10.3", project: "50dA9Sha", version: "v1.10.3" },
  };
  const updates: Record<string, unknown> = {};
  for (const hash of request.hashes ?? []) {
    const o = offer[hash];
    if (!o) continue;
    updates[hash] = {
      id: sha1(o.name).slice(0, 8), project_id: o.project, source: "Modrinth", name: o.name, version_number: o.version,
      changelog: "", dependencies: [], game_versions: ["26.3"], loaders: ["fabric"],
      files: [{ filename: `${o.version}.jar`, url: "", size: 1_000_000, hashes: { sha1: sha1(o.version) }, primary: true }],
      date_published: new Date(Date.now() - 2 * DAY).toISOString(), downloads: 120_000, release_type: "release", url: "",
    };
  }
  return { updates, failed_platforms: [] };
}

// --- sync pack mods (profiles-list.ts owns the packs; p-smp is subscribed to "Grundausstattung") ---

function syncPackMods(profile: string) {
  if (profile !== "p-smp" && profile !== "p-cobblemon") return [];
  const pack = { pack_id: "sp-basics", pack_name: "Grundausstattung", pack_icon: `${MC_ASSETS}/crafting_table_top.png` };
  return [
    { ...pack, mod_id: "m-sodium", mod_key: "AANobbMI", display_name: "Sodium", platform: "modrinth", project_id: "AANobbMI",
      version_id: "x1", version_name: "mc26.3-0.8.2-fabric", filename: null, pinned: false, status: "shadowed", shadowed_by_pack: null },
    { ...pack, mod_id: "m-modmenu", mod_key: "mOgUt4GM", display_name: "Mod Menu", platform: "modrinth", project_id: "mOgUt4GM",
      version_id: "x2", version_name: "17.0.0", filename: null, pinned: true, status: "active", shadowed_by_pack: null },
    { ...pack, mod_id: "m-jei", mod_key: "u6dRKJwZ", display_name: "Just Enough Items", platform: "modrinth", project_id: "u6dRKJwZ",
      version_id: "x3", version_name: "26.3-fabric-21.4.0", filename: null, pinned: false, status: "disabled", shadowed_by_pack: null },
    { ...pack, mod_id: null, mod_key: "BetterF3", display_name: "BetterF3-12.0.1.jar", platform: null, project_id: null,
      version_id: null, version_name: null, filename: "BetterF3-12.0.1.jar", pinned: false, status: "active", shadowed_by_pack: null },
  ];
}

// --- worlds and servers ------------------------------------------------------------------------

function worlds(profile: string) {
  const now = Date.now();
  const dir = `C:\\CrimeClient\\profiles\\${profile}\\saves`;
  const w = (folder: string, name: string, ago: number, mode: number, difficulty: number, extra: object = {}) => ({
    folder_name: folder, display_name: name, last_played: now - ago, icon_path: `${dir}\\${folder}\\icon.png`,
    game_mode: mode, difficulty, difficulty_locked: false, is_hardcore: false, version_name: "26.3", ...extra,
  });
  if (profile === "p-vanilla") {
    return [w("New World", "Neue Welt", 40 * DAY, 0, 2, { version_name: "1.21.10" })];
  }
  return [
    w("CraftAttack Basis", "CraftAttack Basis", 2 * HOUR, 0, 3),
    w("Kreativwelt", "Kreativwelt", 1 * DAY + 3 * HOUR, 1, 0),
    w("Redstone Labor", "Redstone-Labor", 4 * DAY, 1, 0, { difficulty_locked: true }),
    w("Hardcore 3", "Hardcore #3", 9 * DAY, 0, 3, { is_hardcore: true }),
    w("Skyblock", "Skyblock 2.1", 17 * DAY, 0, 2, { version_name: "26.2" }),
    w("Burg Bauprojekt", "Burg (Bauprojekt)", 33 * DAY, 2, 1, { version_name: "1.21.10" }),
  ];
}

function servers(profile: string) {
  if (profile === "p-vanilla") return [];
  return [
    { name: "CraftAttack", address: "crime77.duckdns.org", icon_base64: serverIcon("ca", [232, 49, 74]), accepts_textures: 1, previews_chat: 0 },
    { name: "Hypixel", address: "mc.hypixel.net", icon_base64: serverIcon("hy", [250, 180, 40]), accepts_textures: 0, previews_chat: 0 },
    { name: "Freunde SMP", address: "smp.example.de:25566", icon_base64: null, accepts_textures: 0, previews_chat: 0 },
  ];
}

const PINGS: Record<string, unknown> = {
  "mc.hypixel.net": {
    description: "§aHypixel Network §c[1.8-26.3]\n§6§lSKYBLOCK 0.23 §7- §b§lNEW EVENT", description_json: null,
    version_name: "Requires MC 1.8 / 26.3", version_protocol: 47, players_online: 31_402, players_max: 200_000,
    favicon_base64: null, latency_ms: 112, error: null,
  },
  "smp.example.de:25566": {
    description: null, description_json: null, version_name: null, version_protocol: null, players_online: null,
    players_max: null, favicon_base64: null, latency_ms: null, error: "Connection timed out",
  },
};

// --- canvas images (server icons, archive icons, screenshots) ----------------------------------

const imageCache = new Map<string, string>();

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  return ctx ? [c, ctx] : null;
}

/** an 8x8 pixel badge, scaled to 64 px, as base64 png without the data: prefix */
function serverIcon(seed: string, [r, g, b]: number[]): string | null {
  const key = `srv:${seed}`;
  if (imageCache.has(key)) return imageCache.get(key)!;
  const made = canvas(64, 64);
  if (!made) return null;
  const [c, ctx] = made;
  const rand = rng(seed);
  ctx.fillStyle = "#18181b";
  ctx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 4; x++) {
      if (rand() < 0.55) continue;
      const shade = 0.6 + rand() * 0.4;
      ctx.fillStyle = `rgb(${r * shade | 0}, ${g * shade | 0}, ${b * shade | 0})`;
      ctx.fillRect(x * 8, y * 8, 8, 8);
      ctx.fillRect((7 - x) * 8, y * 8, 8, 8);
    }
  }
  const out = c.toDataURL("image/png").split(",")[1];
  imageCache.set(key, out);
  return out;
}

function archiveIcons(args: Record<string, unknown>) {
  const out: Record<string, string | null> = {};
  for (const path of (args.archivePaths as string[] | undefined) ?? []) {
    const name = path.split(/[\\/]/).pop() ?? "";
    if (/^crimeclient/i.test(name)) out[path] = serverIcon("crimeclient", [232, 49, 74]);
    else if (/CrimeClient-UI/i.test(name)) out[path] = serverIcon("ui", [160, 160, 170]);
    else out[path] = null;
  }
  return out;
}

interface Scene {
  sky: [string, string];
  ground: string[];
  sun?: string;
  stars?: boolean;
  water?: string;
  trees?: string;
  hills: number;
  base: number;
}

const SCENES: Scene[] = [
  { sky: ["#6fa8ff", "#cfe3ff"], ground: ["#5d9b3a", "#7a5634", "#6b6b6b"], sun: "#fff6c8", trees: "#2f6a24", hills: 9, base: 0.62 },
  { sky: ["#2c1d4a", "#f08a5d"], ground: ["#3f6b2e", "#5a3e27", "#4b4b4b"], sun: "#ffcf7a", water: "#3a5d8f", hills: 5, base: 0.66 },
  { sky: ["#05070f", "#1a2340"], ground: ["#21401c", "#3a2a1c", "#2c2c30"], stars: true, trees: "#14301a", hills: 7, base: 0.64 },
  { sky: ["#9cc4f0", "#e9f2fb"], ground: ["#f2f5f8", "#8e9aa6", "#6a6f75"], sun: "#ffffff", hills: 22, base: 0.5 },
  { sky: ["#89b6e8", "#f3e3b5"], ground: ["#e3cf8e", "#c9ab62", "#9d7b45"], sun: "#fff3c0", hills: 6, base: 0.68 },
  { sky: ["#2a0606", "#6b1410"], ground: ["#6e1d1d", "#4a1111", "#2b0b0b"], water: "#e8741c", hills: 16, base: 0.6 },
  { sky: ["#0a0710", "#1c1426"], ground: ["#e8e6b8", "#bdbb8f", "#8a8866"], stars: true, hills: 3, base: 0.72 },
  { sky: ["#7fb0ff", "#d8e8ff"], ground: ["#4f8d33", "#6e4a2c", "#5e5e5e"], sun: "#fff6c8", water: "#2f5fa8", trees: "#285e1f", hills: 4, base: 0.7 },
];

function paintScreenshot(seed: string, index: number): string {
  const key = `shot:${seed}`;
  if (imageCache.has(key)) return imageCache.get(key)!;
  const W = 160;
  const H = 90;
  const made = canvas(W, H);
  if (!made) return "";
  const [c, ctx] = made;
  const rand = rng(seed);
  const scene = SCENES[index % SCENES.length];

  const sky = ctx.createLinearGradient(0, 0, 0, H * scene.base);
  sky.addColorStop(0, scene.sky[0]);
  sky.addColorStop(1, scene.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  if (scene.stars) {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    for (let i = 0; i < 40; i++) ctx.fillRect(Math.floor(rand() * W), Math.floor(rand() * H * 0.5), 1, 1);
  }
  if (scene.sun) {
    ctx.fillStyle = scene.sun;
    const sx = 20 + rand() * (W - 40);
    ctx.fillRect(Math.floor(sx), 8 + Math.floor(rand() * 10), 10, 10);
  }
  // clouds
  if (!scene.stars) {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    for (let i = 0; i < 4; i++) {
      const cx = Math.floor(rand() * W);
      const cy = 6 + Math.floor(rand() * 18);
      ctx.fillRect(cx, cy, 14 + Math.floor(rand() * 12), 3);
      ctx.fillRect(cx + 3, cy - 2, 8, 2);
    }
  }

  // far hills
  const phase = rand() * 10;
  const heights: number[] = [];
  for (let x = 0; x < W; x++) {
    const n = Math.sin(x / 13 + phase) * 0.5 + Math.sin(x / 5.3 + phase * 2) * 0.25 + Math.sin(x / 29 + phase) * 0.8;
    heights.push(Math.round(H * scene.base - n * scene.hills * 0.5));
  }
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  for (let x = 0; x < W; x++) ctx.fillRect(x, heights[x] - 6 - Math.round(Math.sin(x / 9 + phase) * 4), 1, H);

  const waterLevel = Math.round(H * scene.base + 4);
  for (let x = 0; x < W; x++) {
    const top = heights[x];
    ctx.fillStyle = scene.ground[0];
    ctx.fillRect(x, top, 1, 2);
    ctx.fillStyle = scene.ground[1];
    ctx.fillRect(x, top + 2, 1, 5);
    ctx.fillStyle = scene.ground[2];
    ctx.fillRect(x, top + 7, 1, H);
    if (scene.water && top > waterLevel) {
      ctx.fillStyle = scene.water;
      ctx.fillRect(x, waterLevel, 1, top - waterLevel);
    }
  }
  // ore and texture specks
  for (let i = 0; i < 160; i++) {
    const x = Math.floor(rand() * W);
    const y = heights[x] + 3 + Math.floor(rand() * (H - heights[x]));
    ctx.fillStyle = rand() < 0.5 ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.08)";
    ctx.fillRect(x, y, 1, 1);
  }
  if (scene.trees) {
    for (let i = 0; i < 6; i++) {
      const x = 4 + Math.floor(rand() * (W - 8));
      const top = heights[x];
      if (scene.water && top > waterLevel) continue;
      ctx.fillStyle = "#5b3b1f";
      ctx.fillRect(x, top - 6, 1, 6);
      ctx.fillStyle = scene.trees;
      ctx.fillRect(x - 3, top - 11, 7, 5);
      ctx.fillRect(x - 2, top - 13, 5, 2);
    }
  }
  // hotbar, like a real screenshot
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(W / 2 - 27, H - 7, 54, 6);
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fillRect(W / 2 - 27 + 6 * (index % 9), H - 7, 6, 6);

  const big = canvas(480, 270);
  if (!big) return "";
  const [bc, bctx] = big;
  bctx.imageSmoothingEnabled = false;
  bctx.drawImage(c, 0, 0, 480, 270);
  const out = bc.toDataURL("image/jpeg", 0.85).split(",")[1];
  imageCache.set(key, out);
  return out;
}

function screenshots(profile: string) {
  const count = profile === "p-vanilla" ? 0 : profile === "p-rust" ? 5 : 14;
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = new Date(Date.now() - i * 1.7 * DAY - (i % 3) * 5 * HOUR);
    const pad = (n: number) => String(n).padStart(2, "0");
    const filename = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}_${pad(t.getHours())}.${pad(t.getMinutes())}.${pad(t.getSeconds())}.png`;
    out.push({ filename, path: `C:\\CrimeClient\\profiles\\${profile}\\screenshots\\${filename}`, modified: t.toISOString() });
  }
  return out;
}

function imagePreview(args: Record<string, unknown>) {
  const payload = (args.payload ?? {}) as { path?: string };
  const path = payload.path ?? "";
  const m = /profiles\\([^\\]+)\\screenshots/.exec(path);
  const index = m ? screenshots(m[1]).findIndex((s) => s.path === path) : 0;
  return {
    base64_image: paintScreenshot(path, Math.max(0, index)),
    original_width: 2560, original_height: 1440, preview_width: 480, preview_height: 270,
  };
}

// --- logs --------------------------------------------------------------------------------------

function logFiles(profile: string): string[] {
  const dir = `C:\\CrimeClient\\profiles\\${profile}\\logs`;
  if (profile === "p-vanilla") return [];
  return [
    `${dir}\\latest.log`,
    `${dir}\\2026-11-04-2.log.gz`,
    `${dir}\\2026-11-04-1.log.gz`,
    `${dir}\\2026-11-02-1.log.gz`,
    `${dir}\\debug.log`,
  ];
}

function logContent(path: string): string {
  const rand = rng(path);
  const lines: string[] = [];
  let t = 20 * 3600 + 14 * 60 + 2;
  const stamp = () => {
    t += rand() < 0.7 ? 0 : Math.ceil(rand() * 3);
    const h = Math.floor(t / 3600) % 24;
    const m = Math.floor(t / 60) % 60;
    const s = t % 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  };
  const add = (thread: string, level: string, text: string) => lines.push(`[${stamp()}] [${thread}/${level}]: ${text}`);

  add("main", "INFO", "Loading Minecraft 26.3 with Fabric Loader 0.17.2");
  add("ForkJoinPool-1-worker-1", "WARN", "Mod 'voxy' (0.2.7-alpha) recommends a newer version of 'sodium'");
  add("main", "INFO", `Loading ${MODS.length + 22} mods:`);
  for (const s of MODS) lines.push(`\t- ${s.file.replace(/\.jar$/, "").toLowerCase()} ${s.version || "2.4.1"}`);
  add("main", "INFO", "SpongePowered MIXIN Subsystem Version=0.8.7 Source=union:/C:/CrimeClient/libraries/sponge-mixin-0.15.5.jar");
  add("main", "INFO", "Compatibility level set to JAVA_21");
  add("main", "DEBUG", "Searching for graphics cards...");
  add("main", "DEBUG", "Found graphics adapter: NVIDIA GeForce RTX 4070 (driver 581.57)");
  add("main", "INFO", "Initializing Sodium 0.8.2 (mc26.3)");
  add("Render thread", "INFO", "Environment: Environment[sessionHost=https://sessionserver.mojang.com, servicesHost=https://api.minecraftservices.com, name=PROD]");
  add("Render thread", "INFO", "Setting user: crime77");
  add("Render thread", "INFO", "[CrimeClient] Loaded 237 cosmetics, 18 emotes from catalog (rev 4182)");
  add("Render thread", "INFO", "[CrimeClient] Discord status handed to the launcher");
  add("Render thread", "INFO", "Backend library: LWJGL version 3.3.6+1");
  add("Render thread", "WARN", "Shader rendertype_entity_translucent_emissive could not find sampler named Sampler2 in the specified shader program.");
  add("Render thread", "INFO", "OpenAL initialized on device OpenAL Soft on Lautsprecher (Realtek(R) Audio)");
  add("Render thread", "INFO", "Sound engine started");
  add("Render thread", "INFO", "Created: 2048x1024x4 minecraft:textures/atlas/blocks.png-atlas");
  add("Render thread", "INFO", "Created: 512x512x4 minecraft:textures/atlas/signs.png-atlas");
  add("Render thread", "DEBUG", "Loaded 1842 recipes in 214 ms");
  add("Render thread", "INFO", "[Iris] Shaderpack loaded: photon_v1.4.zip (pipeline built in 1.8 s)");
  add("Render thread", "WARN", "[Iris] Option SHADOW_RES has no matching define in shaders/lib/settings.glsl");
  add("Render thread", "INFO", "Connecting to crime77.duckdns.org, 25565");
  add("Netty Client IO #2", "INFO", "Connected to a modded server.");
  add("Render thread", "INFO", "[CHAT] crime77 joined the game");
  add("Render thread", "INFO", "[CHAT] <Lukas> na, bist du wieder am Bauen?");
  add("Render thread", "INFO", "[CHAT] <crime77> ja, die Burg wird fertig heute");
  for (let i = 0; i < 120; i++) {
    const r = rand();
    if (r < 0.06) add("Render thread", "WARN", `Received passengers for unknown entity ${Math.floor(rand() * 9000) + 1000}`);
    else if (r < 0.12) add("Server thread", "DEBUG", `Chunk [${Math.floor(rand() * 60) - 30}, ${Math.floor(rand() * 60) - 30}] loaded from region in ${Math.floor(rand() * 40) + 2} ms`);
    else if (r < 0.16) add("Render thread", "INFO", `[CHAT] <${["Lukas", "Mara", "Finn", "Elif"][Math.floor(rand() * 4)]}> ${["gg", "wer hat Diamanten?", "komm mal zur Farm", "Server lagt kurz", "brb"][Math.floor(rand() * 5)]}`);
    else if (r < 0.18) add("Render thread", "TRACE", `Sent packet ServerboundMovePlayerPacket.Pos (${(rand() * 400).toFixed(3)}, 64.000, ${(rand() * 400).toFixed(3)})`);
    else add("Render thread", "INFO", `Saved screenshot as 2026-11-05_${String(20 + Math.floor(i / 60)).padStart(2, "0")}.${String(i % 60).padStart(2, "0")}.07.png`);
    if (i === 70) {
      add("Render thread", "ERROR", "Failed to load texture craftcosmetics:textures/cape/crimson_v2.png");
      lines.push("java.io.FileNotFoundException: craftcosmetics:textures/cape/crimson_v2.png");
      lines.push("\tat net.minecraft.server.packs.resources.ResourceManager.getResourceOrThrow(ResourceManager.java:53)");
      lines.push("\tat net.minecraft.client.renderer.texture.SimpleTexture.load(SimpleTexture.java:41)");
      lines.push("\tat de.craftcosmetics.client.cosmetic.CustomCapes.bind(CustomCapes.java:118)");
      lines.push("\tat java.base/java.lang.Thread.run(Thread.java:1583)");
    }
  }
  add("Render thread", "INFO", "Stopping!");
  add("Render thread", "INFO", "[CrimeClient] Saved config/crimeclient.json");
  return lines.join("\n");
}

// --- handler -----------------------------------------------------------------------------------

export function handle(cmd: string, args: Record<string, unknown>): unknown {
  switch (cmd) {
    case "get_local_content":
      return localContent(args);
    case "get_icons_for_archives":
      return archiveIcons(args);
    case "check_mod_updates_unified_command":
      return updateCheck(args);
    case "toggle_content_from_profile":
      toggle(args.payload as Toggle);
      return null;
    case "toggle_contents_from_profile":
      for (const p of (args.payloads as Toggle[] | undefined) ?? []) toggle(p);
      return { mods_changed: ((args.payloads as Toggle[] | undefined) ?? []).length, norisk_changed: 0, files_changed: 0, failed: 0 };
    case "uninstall_content_from_profile": {
      const payload = (args.payload ?? args) as { file_path?: string };
      const target = payload.file_path ? findSeed(payload.file_path) : null;
      if (target) removed.add(`${target.profile}/${target.seed.file}`);
      return null;
    }
    case "get_profile_sync_pack_mods":
      return syncPackMods(profileId(args));
    case "get_profile_disk_size":
      return profileId(args) === "p-vanilla" ? 412_000_000 : profileId(args) === "p-rust" ? 1_840_000_000 : 3_276_000_000;
    case "get_worlds_for_profile":
      return worlds(profileId(args));
    case "get_servers_for_profile":
      return servers(profileId(args));
    case "ping_minecraft_server":
      return PINGS[String(args.address ?? "")];
    case "check_world_lock_status":
      return false;
    case "list_profile_screenshots":
      return screenshots(profileId(args));
    case "get_image_preview":
      return imagePreview(args);
    case "get_profile_log_files":
      return logFiles(profileId(args));
    case "get_log_file_content":
      return logContent(String(args.logFilePath ?? ""));
    default:
      return undefined;
  }
}
