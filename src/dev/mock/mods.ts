// Dev-only mock for the Mods pages (#/mods, #/mods/<source>/<projectId> and the profile "browse content" search).
// Names, authors, icons and numbers follow real Modrinth projects; descriptions, bodies and versions are made up.

type Args = Record<string, unknown>;
type ProjectType = "mod" | "resourcepack" | "shader" | "modpack" | "datapack";

interface Seed {
  id: string;
  slug: string;
  title: string;
  author: string;
  downloads: number;
  follows: number;
  updated: string;
  created: string;
  categories: string[];
  icon: string | null;
  type: ProjectType;
  client: string;
  server: string;
  license: string;
  description: string;
}

const CDN = "https://cdn.modrinth.com/data";

function seed(
  type: ProjectType,
  id: string,
  slug: string,
  title: string,
  author: string,
  downloads: number,
  follows: number,
  updated: string,
  categories: string,
  icon: string | null,
  description: string,
  extra: Partial<Seed> = {},
): Seed {
  return {
    id, slug, title, author, downloads, follows, type, description,
    updated: `${updated}T14:20:00Z`,
    created: extra.created ?? "2021-03-11T09:00:00Z",
    categories: categories.split(","),
    icon: icon ? `${CDN}/${id}/${icon}` : null,
    client: extra.client ?? "required",
    server: extra.server ?? "unsupported",
    license: extra.license ?? "LGPL-3.0-only",
  };
}

const SEEDS: Seed[] = [
  // mods
  seed("mod", "P7dR8mSH", "fabric-api", "Fabric API", "modmuss50", 282767050, 37554, "2026-11-03", "fabric,library", "icon.png",
    "Core hooks and interoperability layer that almost every Fabric mod needs.", { client: "optional", server: "optional", license: "Apache-2.0" }),
  seed("mod", "AANobbMI", "sodium", "Sodium", "jellysquid3", 248668379, 42493, "2026-10-15", "fabric,neoforge,optimization,quilt",
    "295862f4724dc3f78df3447ad6072b2dcd3ef0c9_96.webp", "A modern rendering engine that raises frame rates and smooths out stutter.", { license: "LicenseRef-Polyform-Shield-1.0.0", created: "2021-01-03T00:53:34Z" }),
  seed("mod", "YL57xq9U", "iris", "Iris Shaders", "coderbot", 192414699, 30519, "2026-09-30", "decoration,fabric,neoforge,optimization,quilt",
    "18d0e7f076d3d6ed5bedd472b853909aac5da202_96.webp", "Shader pack loader that works alongside Sodium and keeps OptiFine packs running."),
  seed("mod", "NNAgCjsB", "entityculling", "Entity Culling", "tr7zw", 185411668, 18160, "2026-10-08", "fabric,forge,neoforge,optimization,quilt",
    "7873452d6cede4daed12da3d7d8c193ab88b4fd6_96.webp", "Skips entities and block entities you cannot see, using async path tracing.", { license: "LicenseRef-tr7zw-Protective-License" }),
  seed("mod", "9s6osm5g", "cloth-config", "Cloth Config API", "shedaniel", 183228094, 17078, "2026-09-23", "fabric,forge,library,neoforge",
    "ed8a2316cbb6f4fc5f510e8e13a59a85cbbbff4d_96.webp", "Config screen library used by hundreds of client mods.", { client: "optional", server: "optional" }),
  seed("mod", "uXXizFIs", "ferrite-core", "FerriteCore", "malte0811", 164868932, 16885, "2026-03-24", "fabric,forge,neoforge,optimization,quilt,utility",
    "222a126f26f8f9ae1eb339f3b767677f18bff31f_96.webp", "Cuts the memory the game uses for block states and models.", { client: "optional", server: "optional", license: "MIT" }),
  seed("mod", "mOgUt4GM", "modmenu", "Mod Menu", "Prospector", 158715651, 28060, "2026-10-27", "fabric,quilt,utility",
    "5a20ed1450a0e1e79a1fe04e61bb4e5878bf1d20.png", "Adds a mods screen with search, filters and links to each mod's config.", { license: "MIT" }),
  seed("mod", "gvQqBUqZ", "lithium", "Lithium", "jellysquid3", 140969322, 24221, "2026-10-28", "fabric,neoforge,optimization,quilt",
    "bcc8686c13af0143adf4285d741256af824f70b7_96.webp", "General-purpose optimizations for game logic, physics and AI.", { client: "optional", server: "optional" }),
  seed("mod", "5ZwdcRci", "immediatelyfast", "ImmediatelyFast", "RaphiMC", 135803363, 11898, "2026-10-13", "fabric,forge,neoforge,optimization,quilt",
    "e57b6b451425692ac17ad322d5e14bea686a383a_96.webp", "Speeds up immediate-mode rendering: HUD, text, entities and maps.", { license: "LGPL-3.0-or-later" }),
  seed("mod", "1eAoo2KR", "yacl", "YetAnotherConfigLib (YACL)", "isxander", 133612952, 9891, "2026-11-03", "fabric,forge,library,neoforge,quilt,utility",
    "08c0cd32515e260f4bb20bbc0696510041523f9a_96.webp", "A builder-style config library with good defaults.", { client: "optional", server: "optional" }),
  seed("mod", "Ha28R6CL", "fabric-language-kotlin", "Fabric Language Kotlin", "modmuss50", 129501226, 11383, "2026-10-09", "fabric,library",
    "72c3d74aeb665e45aea93a945a01474cbce3b7da_96.webp", "Lets Fabric load mods written in Kotlin.", { client: "optional", server: "optional", license: "Apache-2.0" }),
  seed("mod", "1bokaNcj", "xaeros-minimap", "Xaero's Minimap", "thexaero", 119233928, 19242, "2026-10-25", "adventure,fabric,forge,neoforge,quilt,transportation,utility",
    "354080f65407e49f486fcf9c4580e82c45ae63b8_96.webp", "Minimap with waypoints, entity radar and cave mode.", { server: "optional", license: "LicenseRef-All-Rights-Reserved" }),
  seed("mod", "BVzZfTc1", "entitytexturefeatures", "[ETF] Entity Texture Features", "Traben", 109957068, 10808, "2026-11-03", "decoration,fabric,forge,neoforge,quilt,utility",
    "af683d206d50b05258d865b0d6e4aa2f2cee12f2_96.webp", "Random and emissive entity textures from resource packs."),
  seed("mod", "lhGA9TYQ", "architectury-api", "Architectury API", "shedaniel", 107297688, 7796, "2026-10-09", "fabric,forge,library,neoforge,quilt",
    "05fe3a61c28faaccaec3533b92e1b321edde7bf6_96.webp", "Abstraction layer for mods that ship on several loaders.", { server: "required" }),
  seed("mod", "PtjYWJkn", "sodium-extra", "Sodium Extra", "FlashyReese", 105311462, 13860, "2026-10-25", "fabric,neoforge,optimization,quilt,utility",
    "0df4fb22a11e1dcb5e83cb0aadd275b571aca7a9_96.webp", "Extra toggles for Sodium: particles, weather, fog and animations."),
  seed("mod", "NcUtCpym", "xaeros-world-map", "Xaero's World Map", "thexaero", 104621678, 14534, "2026-10-25", "adventure,fabric,forge,neoforge,quilt,transportation,utility",
    "354080f65407e49f486fcf9c4580e82c45ae63b8_96.webp", "Full-screen map that fills in as you explore.", { server: "optional", license: "LicenseRef-All-Rights-Reserved" }),
  seed("mod", "EsAfCjCV", "appleskin", "AppleSkin", "squeek502", 97669962, 18610, "2026-09-17", "fabric,food,forge,neoforge,quilt,utility", "icon.png",
    "Shows hunger, saturation and exhaustion right on the HUD.", { client: "optional", server: "optional", license: "Unlicense" }),
  seed("mod", "MPCX6s5C", "not-enough-animations", "Not Enough Animations", "tr7zw", 93393308, 9276, "2026-11-01", "adventure,decoration,fabric,forge,neoforge",
    "b97fd5f7a893165052408b747286d6eb38d57abb_96.webp", "Third-person animations for eating, maps, ladders and more.", { license: "LicenseRef-tr7zw-Protective-License" }),
  seed("mod", "Bh37bMuy", "reeses-sodium-options", "Reese's Sodium Options", "FlashyReese", 87486418, 9042, "2026-10-16", "fabric,neoforge,quilt,utility", "icon.png",
    "A cleaner, tabbed video settings screen for Sodium.", { license: "MIT" }),
  seed("mod", "zV5r3pPn", "3dskinlayers", "3D Skin Layers", "tr7zw", 83593008, 12044, "2026-10-18", "decoration,fabric,forge,neoforge,quilt",
    "ff7010d4ec0275609866c8b0f603b25e25949c08_96.webp", "Renders the outer skin layer in 3D instead of flat.", { license: "LicenseRef-tr7zw-Protective-License" }),
  seed("mod", "nmDcB62a", "modernfix", "ModernFix", "embeddedt", 83238442, 7266, "2026-11-04", "fabric,forge,neoforge,optimization,utility",
    "2af94de5e08ae54567ee86b968fc7ce076d9fee5_96.webp", "Faster launch, lower memory and fewer bugs in large packs.", { client: "optional", server: "optional" }),
  seed("mod", "1IjD5062", "continuity", "Continuity", "Pepper_Bell", 79048690, 16973, "2026-09-16", "decoration,fabric,forge,neoforge,quilt", "icon.png",
    "Connected textures for glass, bookshelves and more."),
  seed("mod", "9eGKb6K1", "simple-voice-chat", "Simple Voice Chat", "henkelmax", 75580013, 14662, "2026-11-03", "adventure,fabric,forge,neoforge,quilt,social,utility", "icon.png",
    "Proximity voice chat with groups, push-to-talk and noise suppression.", { client: "optional", server: "optional", license: "LicenseRef-All-Rights-Reserved" }),
  seed("mod", "51shyZVL", "moreculling", "More Culling", "FX", 72910643, 6347, "2026-11-01", "fabric,library,neoforge,optimization,quilt",
    "c51b07193b56e952269ef50101d12aecba2b4747_96.webp", "Culls hidden faces of leaves, signs, item frames and more.", { license: "GPL-3.0-only" }),
  seed("mod", "w7ThoJFB", "zoomify", "Zoomify (Zoom)", "isxander", 71694089, 11223, "2026-10-08", "fabric,neoforge,quilt,utility",
    "e2de67a0bfb9e8aa2347982ab3ec5463f26cca31_96.webp", "Smooth, configurable zoom with scroll steps."),
  seed("mod", "LQ3K71Q1", "dynamic-fps", "Dynamic FPS", "juliand665", 71197664, 9139, "2026-09-16", "fabric,forge,neoforge,optimization,quilt,utility",
    "5056368d0d87c1a9f3efead0cb48ab39a4ea87bf_96.webp", "Drops the frame rate when the window is in the background.", { license: "MIT" }),
  seed("mod", "aC3cM3Vq", "mouse-tweaks", "Mouse Tweaks", "YaLTeR", 63766203, 9347, "2026-09-20", "fabric,forge,neoforge,storage,utility",
    "6c0eaa4e60a9c87f4766f222ff63286f09da32c0_96.webp", "Drag and scroll to move items around inventories.", { license: "BSD-3-Clause" }),
  seed("mod", "zz00crime", "crime-hud-tweaks", "HUD Tweaks", "crime77", 18342, 211, "2026-10-30", "fabric,utility,decoration", null,
    "Small fixes for the scoreboard, boss bars and the tab list."),

  // resource packs
  seed("resourcepack", "50dA9Sha", "fresh-animations", "Fresh Animations", "FreshLX", 51267107, 14796, "2026-11-01", "16x,entities,models,vanilla-like",
    "3132c10e9e3c73fde9799720fd3da5561071708c_96.webp", "Gives mobs livelier animations without changing their look."),
  seed("resourcepack", "uvpymuxq", "better-leaves", "Motschen's Better Leaves", "Motschen", 21379587, 5506, "2026-09-14", "models,realistic,tweaks,vanilla-like",
    "fe1a61998ae57dc6ad1a4bb028334c3c3925d22f_96.webp", "Bushier leaves for every tree type."),
  seed("resourcepack", "RRxvWKNC", "low-on-fire", "Low On Fire", "Haikis", 17278820, 3903, "2026-06-19", "16x,combat,tweaks,utility,vanilla-like",
    "06a7e7691a6da41798c255108a8563d7ffea171d.png", "Lowers the fire overlay so you can see while burning."),
  seed("resourcepack", "slufHzC2", "tras-fresh-player", "Fresh Moves", "IthanMendoza", 15486800, 4000, "2025-01-20", "16x,equipment,models",
    "02b78db6655ad8dd6cfd847f99c76f7552c053ec_96.webp", "Player animations that match Fresh Animations."),
  seed("resourcepack", "yfDziwn1", "translations-for-sodium", "Translations for Sodium", "robotkoer", 23010210, 1674, "2026-10-31", "locale,modded,tweaks,utility",
    "907581019df45903df237952ce8d10ac37134cb5_96.webp", "Community translations for Sodium's settings."),

  // shaders
  seed("shader", "HVnmMxH1", "complementary-reimagined", "Complementary Shaders - Reimagined", "EminGT", 71906344, 11499, "2026-09-15",
    "atmosphere,bloom,colored-lighting,foliage,medium,pbr,reflections,shadows,vanilla-like", "79cb7c8123bbc54945305b2ebad6b8881efdf5f8_96.webp",
    "Keeps the vanilla look and adds real light, water and sky."),
  seed("shader", "lLqFfGNs", "photon-shader", "Photon Shaders", "sixthsurge", 28931952, 4407, "2026-10-19", "atmosphere,bloom,colored-lighting,high,pbr,semi-realistic,shadows",
    "39cb5f12e7dcc68d6cb666f225fcb2b801dd70fb_96.webp", "Clouds, fog and light with a focus on the sky."),
  seed("shader", "Q1vvjJYV", "bsl-shaders", "BSL Shaders", "CaptTatsu", 31459002, 6323, "2026-09-21", "atmosphere,bloom,cartoon,foliage,low,shadows",
    "2a611a3cb434fb52fb81fa5dace13c5d8b67e55d_96.webp", "Bright, clean and fast, with lots of options."),
  seed("shader", "EpQFjzrQ", "solas-shader", "Solas Shader", "Septonious", 18485119, 3542, "2026-11-02", "atmosphere,fantasy,high,reflections,shadows",
    "e3efc6ba7a63f9e1cf473a794d0224a6daf243c7_96.webp", "Soft, stylised light with aurora and nebula skies."),
  seed("shader", "ZvMtQlho", "bliss-shader", "Bliss Shaders", "Xonk", 15602774, 2998, "2025-11-23", "atmosphere,foliage,high,screenshot,semi-realistic",
    "90145c971ea24387775108fc86c89bed9bd2c8f1_96.webp", "Dense volumetric fog and moody colour grading."),

  // modpacks
  seed("modpack", "1KVo5zza", "fabulously-optimized", "Fabulously Optimized", "robotkoer", 19014278, 5047, "2026-11-01", "fabric,lightweight,multiplayer,optimization",
    "d8152911f8fd5d7e9a8c499fe89045af81fe816e_96.webp", "Vanilla, but faster: a curated set of performance mods."),
  seed("modpack", "5FFgwNNP", "cobblemon-fabric", "Cobblemon Official Modpack [Fabric]", "CobbledStudios", 11367188, 2762, "2026-10-27", "adventure,fabric,lightweight,multiplayer",
    "e7f9ee2e9d361623847853fe2ddce42f519ee64f.png", "The official pack around Cobblemon with maps and quality-of-life mods."),
  seed("modpack", "shFhR8Vx", "better-mc-fabric-bmc2", "Better MC [FABRIC] - BMC2", "SHXRKIE", 3671977, 1521, "2026-07-15", "adventure,combat,fabric,kitchen-sink",
    "a19c2bcb51d38f32f138d3607e91cb2b7b8e387f_96.webp", "Hundreds of mods that expand the vanilla game."),
  seed("modpack", "rQiXwLhB", "battlearmorytacz", "BattleArmory TACZ", "JZ_zhenmeng", 3713062, 103, "2026-08-21", "combat,forge,multiplayer,neoforge",
    "1f8cafea7dcd59dff7dc58cad7a17ae0424847a2_96.webp", "Firearms and armour for PvP servers."),

  // datapacks
  seed("datapack", "8oi3bsk5", "terralith", "Terralith", "Starmute", 24555036, 9013, "2026-09-27", "datapack,worldgen",
    "1959d924a1088944bbf07a06ba523726112d7e7a_96.webp", "Nearly a hundred new biomes using only vanilla blocks."),
  seed("datapack", "tpehi7ww", "dungeons-and-taverns", "Dungeons and Taverns", "NovaWostra", 22097624, 9129, "2026-10-31", "adventure,datapack,mobs,worldgen",
    "429ba22d212868940cdd82465df949ac51c9791e_96.webp", "Taverns, ruins and dungeons spread across the world."),
  seed("datapack", "DjLobEOy", "towns-and-towers", "Towns and Towers", "Biban_Auriu", 18635665, 5151, "2026-10-27", "adventure,datapack,worldgen",
    "f7f552ec019c9ad8b777c9ab5eecbb95da8707a0_96.webp", "New village variants and pillager outposts."),
  seed("datapack", "lWDHr9jE", "tectonic", "Tectonic", "Apollo", 17497191, 7556, "2026-10-25", "adventure,datapack,worldgen",
    "d8b3413f797479dcc0d8764756613e449a358a2e_96.webp", "Bigger mountains, deeper oceans and wider rivers."),
];

const LOADERS = ["fabric", "forge", "neoforge", "quilt"];

const GALLERIES: Record<string, { url: string; title: string; featured: boolean; ordering: number }[]> = {
  AANobbMI: [
    { url: `${CDN}/AANobbMI/images/d84313e6f57dc9e7896961dbd2dfc2689d482758_350.webp`, title: "Underwater lighting", featured: false, ordering: 0 },
    { url: `${CDN}/AANobbMI/images/6b0e58705156ba67a6d97a74b9f9ac05da69f502_350.webp`, title: "Biome blending", featured: false, ordering: 1 },
    { url: `${CDN}/AANobbMI/images/b681a9e87daa53a0e85336a894db70427007149b_350.webp`, title: "Fluid rendering", featured: true, ordering: 10 },
    { url: `${CDN}/AANobbMI/images/56c4599efcb529a19aed0e118caad4178d7fd540.webp`, title: "Block shading", featured: false, ordering: 30 },
    { url: `${CDN}/AANobbMI/images/5ca2e8f6c72f3d543dd3dc95b706964c5678d80e_350.webp`, title: "Video settings", featured: false, ordering: 999 },
  ],
  YL57xq9U: [
    { url: `${CDN}/YL57xq9U/images/f47cea26f135d74c2d69df0a1806751818d705d3_350.webp`, title: "Mountain lake", featured: true, ordering: 0 },
    { url: `${CDN}/YL57xq9U/images/17f09a3d424d6e2005fcecc81838780a6847f8ce_350.webp`, title: "Sunset", featured: false, ordering: 1 },
    { url: `${CDN}/YL57xq9U/images/44245979cecbf237a3b26f375a0dc4f3a21dcf3d_350.webp`, title: "Wide mountain", featured: false, ordering: 2 },
    { url: `${CDN}/YL57xq9U/images/d69f13ea9889652c02f8cf91a3e55c8ef7cd6316_350.webp`, title: null as unknown as string, featured: false, ordering: 3 },
  ],
};

// what each mock profile already has (by project id); the newest version counts as the installed one
const INSTALLED: Record<string, Set<string>> = {
  "p-crime": new Set(["P7dR8mSH", "AANobbMI", "gvQqBUqZ", "mOgUt4GM", "YL57xq9U", "HVnmMxH1"]),
  "p-craftattack": new Set(["P7dR8mSH", "AANobbMI", "1bokaNcj", "NcUtCpym"]),
};

const GAME_VERSIONS = ["26.3", "26.2", "26.1.2", "26.1.1", "26.1", "1.21.11", "1.21.10", "1.21.8", "1.21.5", "1.21.4", "1.21.1", "1.20.6", "1.20.4", "1.20.1"];

function hex(input: string, length: number): string {
  let h = 2166136261;
  let out = "";
  while (out.length < length) {
    for (let i = 0; i < input.length; i++) h = Math.imul(h ^ input.charCodeAt(i), 16777619) >>> 0;
    out += h.toString(16).padStart(8, "0");
    input += out;
  }
  return out.slice(0, length);
}

function loadersOf(s: Seed): string[] {
  if (s.type === "shader") return ["iris", "optifine"];
  if (s.type === "resourcepack") return ["minecraft"];
  if (s.type === "datapack") return ["datapack"];
  const found = s.categories.filter((c) => LOADERS.includes(c));
  return found.length ? found : ["fabric"];
}

function daysBefore(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() - days * 86400000).toISOString();
}

interface MockVersion {
  id: string;
  project_id: string;
  source: "Modrinth";
  name: string;
  version_number: string;
  changelog: string;
  dependencies: { project_id?: string; version_id?: string; file_name?: string; dependency_type: string }[];
  game_versions: string[];
  loaders: string[];
  files: { filename: string; url: string; size: number; hashes: Record<string, string>; primary: boolean }[];
  date_published: string;
  downloads: number;
  release_type: "release" | "beta" | "alpha";
  url: string;
}

const versionCache = new Map<string, MockVersion[]>();

function versionsOf(s: Seed): MockVersion[] {
  const cached = versionCache.get(s.id);
  if (cached) return cached;
  const loaders = loadersOf(s);
  const split = loaders.includes("neoforge") && loaders.includes("fabric");
  const ext = s.type === "mod" ? "jar" : s.type === "modpack" ? "mrpack" : "zip";
  const list: MockVersion[] = [];
  const count = s.type === "mod" ? 18 : 9;
  for (let i = 0; i < count; i++) {
    const gv = GAME_VERSIONS[Math.min(GAME_VERSIONS.length - 1, Math.floor(i / 1.6))];
    const minor = 7 - Math.floor(i / 5);
    const patch = Math.max(0, 6 - (i % 5));
    const forNeo = split && i % 3 === 2;
    const versionLoaders = split ? (forNeo ? ["neoforge"] : loaders.filter((l) => l !== "neoforge")) : loaders;
    const number = s.type === "mod" ? `mc${gv}-0.${minor}.${patch}${forNeo ? "-neoforge" : "-fabric"}` : `${minor - 2}.${patch}`;
    const id = hex(`${s.id}-${i}`, 8);
    const filename = `${s.slug}-${number}.${ext}`;
    const deps: MockVersion["dependencies"] = [];
    if (s.type === "mod" && s.id !== "P7dR8mSH" && versionLoaders.includes("fabric")) deps.push({ project_id: "P7dR8mSH", dependency_type: "required" });
    if (["PtjYWJkn", "Bh37bMuy"].includes(s.id)) deps.push({ project_id: "AANobbMI", dependency_type: "required" });
    if (s.id === "YL57xq9U") deps.push({ project_id: "AANobbMI", dependency_type: "optional" });
    list.push({
      id,
      project_id: s.id,
      source: "Modrinth",
      name: s.type === "mod" ? `${s.title} 0.${minor}.${patch} for ${gv}` : `${s.title} ${number}`,
      version_number: number,
      changelog: `- Updated to ${gv}\n- Fixed a crash when leaving a world while chunks were still loading\n- Smaller memory footprint during startup`,
      dependencies: deps,
      game_versions: i === 0 ? [gv] : i % 4 === 1 ? [gv, GAME_VERSIONS[Math.min(GAME_VERSIONS.length - 1, Math.floor(i / 1.6) + 1)]] : [gv],
      loaders: versionLoaders,
      files: [{
        filename,
        url: `${CDN}/${s.id}/versions/${id}/${filename}`,
        size: 180000 + (parseInt(hex(filename, 5), 16) % 2600000),
        hashes: { sha1: hex(`sha1-${filename}`, 40), sha512: hex(`sha512-${filename}`, 128) },
        primary: true,
      }],
      date_published: daysBefore(s.updated, i * 11 + (i % 3)),
      downloads: Math.round((s.downloads / 60) * Math.pow(0.82, i)),
      release_type: i === 1 ? "beta" : i === 6 ? "alpha" : "release",
      url: `https://modrinth.com/${s.type}/${s.slug}/version/${id}`,
    });
  }
  versionCache.set(s.id, list);
  return list;
}

function toHit(s: Seed) {
  return {
    project_id: s.id,
    source: "Modrinth",
    title: s.title,
    slug: s.slug,
    description: s.description,
    author: s.author,
    categories: s.categories,
    display_categories: s.categories,
    client_side: s.client,
    server_side: s.server,
    downloads: s.downloads,
    follows: s.follows,
    icon_url: s.icon,
    project_url: `https://modrinth.com/${s.type}/${s.slug}`,
    project_type: s.type,
    latest_version: versionsOf(s)[0].version_number,
    date_created: s.created,
    date_modified: s.updated,
    license: s.license,
    gallery: (GALLERIES[s.id] ?? []).map((g) => g.url),
    versions: versionsOf(s).map((v) => v.id),
  };
}

const UNIFIED_TYPES: Record<string, ProjectType> = {
  Mod: "mod",
  Modpack: "modpack",
  ResourcePack: "resourcepack",
  Shader: "shader",
  Datapack: "datapack",
};

function search(params: Args) {
  const type = UNIFIED_TYPES[String(params.project_type)] ?? "mod";
  const query = String(params.query ?? "").trim().toLowerCase();
  const categories = (params.categories as string[] | undefined) ?? [];
  const loaders = (params.mod_loaders as string[] | undefined) ?? [];
  let list = SEEDS.filter((s) => s.type === type);
  if (query) {
    list = list.filter((s) => `${s.title} ${s.slug} ${s.author} ${s.description}`.toLowerCase().includes(query));
  }
  if (categories.length) list = list.filter((s) => categories.every((c) => s.categories.includes(c)));
  if (loaders.length && (type === "mod" || type === "modpack")) list = list.filter((s) => loaders.some((l) => loadersOf(s).includes(l)));
  if (params.client_side_filter === "required") list = list.filter((s) => s.client === "required");
  if (params.server_side_filter === "required") list = list.filter((s) => s.server === "required");
  switch (params.sort) {
    case "Follows":
      list = [...list].sort((a, b) => b.follows - a.follows);
      break;
    case "Newest":
      list = [...list].sort((a, b) => b.created.localeCompare(a.created));
      break;
    case "Updated":
      list = [...list].sort((a, b) => b.updated.localeCompare(a.updated));
      break;
    case "Downloads":
      list = [...list].sort((a, b) => b.downloads - a.downloads);
      break;
    default:
      break;
  }
  const offset = Number(params.offset ?? 0);
  const limit = Number(params.limit ?? 20);
  const page = list.slice(offset, offset + limit);
  return {
    results: page.map(toHit),
    pagination: { index: offset, page_size: limit, result_count: page.length, total_count: list.length },
  };
}

function body(s: Seed): string {
  const loaders = loadersOf(s).join(", ");
  return `${s.description}

## Features

- Works on **${loaders}** for Minecraft ${GAME_VERSIONS[0]} and older releases back to ${GAME_VERSIONS[GAME_VERSIONS.length - 1]}
- No configuration needed: the defaults are tuned for most PCs
- Compatible with [Fabric API](https://modrinth.com/mod/fabric-api) and the usual client mods

## Installation

1. Pick a profile with a matching loader.
2. Install the latest release; dependencies are added for you.
3. Start the game once to create \`config/${s.slug}.json\`.

> If something breaks after an update, check the changelog of the version first and report issues with your log attached.

### Configuration

Most options live in the video settings. Power users can edit the file directly:

\`\`\`json
{
  "enabled": true,
  "chunk_updates_per_frame": 4,
  "use_fog_occlusion": true
}
\`\`\`

| Setting | Default | Notes |
|---|---|---|
| \`enabled\` | \`true\` | Turns the mod off without uninstalling it |
| \`chunk_updates_per_frame\` | \`4\` | Higher values load faster but can stutter |
| \`use_fog_occlusion\` | \`true\` | Skips chunks hidden behind fog |

---

Licensed under ${s.license}. Translations are welcome on the issue tracker.`;
}

function project(s: Seed) {
  return {
    id: s.id,
    slug: s.slug,
    project_type: s.type,
    team: hex(`team-${s.id}`, 8),
    organization: null,
    title: s.title,
    description: s.description,
    body: body(s),
    published: s.created,
    updated: s.updated,
    approved: s.created,
    status: "approved",
    moderator_message: null,
    license: {
      id: s.license,
      name: s.license.startsWith("LicenseRef") ? "" : s.license,
      url: s.license === "MIT" ? "https://opensource.org/licenses/MIT" : null,
    },
    client_side: s.client,
    server_side: s.server,
    downloads: s.downloads,
    followers: s.follows,
    categories: s.categories.filter((c) => !LOADERS.includes(c)),
    versions: versionsOf(s).map((v) => v.id),
    icon_url: s.icon,
    color: null,
    issues_url: `https://github.com/${s.author}/${s.slug}/issues`,
    source_url: `https://github.com/${s.author}/${s.slug}`,
    wiki_url: s.type === "mod" ? `https://github.com/${s.author}/${s.slug}/wiki` : null,
    discord_url: s.follows > 10000 ? "https://discord.gg/example" : null,
    donation_urls: s.follows > 15000 ? [{ id: "ko-fi", platform: "Ko-fi", url: `https://ko-fi.com/${s.author}` }] : [],
    gallery: (GALLERIES[s.id] ?? []).map((g) => ({ ...g, description: null, created: s.updated })),
    game_versions: [...new Set(versionsOf(s).flatMap((v) => v.game_versions))].reverse(),
    loaders: loadersOf(s),
  };
}

function members(s: Seed) {
  const people = [
    { name: s.author, role: "Owner" },
    ...(s.follows > 20000 ? [{ name: "IMS", role: "Developer" }, { name: "Hamarb123", role: "Contributor" }] : []),
  ];
  return people.map((p, i) => ({
    team_id: hex(`team-${s.id}`, 8),
    user: { id: hex(p.name, 8), username: p.name, avatar_url: null, bio: null, role: "developer" },
    role: p.role,
    ordering: i,
  }));
}

function toModrinthVersion(v: MockVersion) {
  return {
    id: v.id,
    project_id: v.project_id,
    author_id: null,
    featured: false,
    name: v.name,
    version_number: v.version_number,
    changelog: v.changelog,
    dependencies: v.dependencies.map((d) => ({
      version_id: d.version_id ?? null,
      project_id: d.project_id ?? null,
      file_name: null,
      dependency_type: d.dependency_type,
    })),
    game_versions: v.game_versions,
    version_type: v.release_type,
    loaders: v.loaders,
    files: v.files.map((f) => ({ ...f, hashes: { sha1: f.hashes.sha1, sha512: f.hashes.sha512 }, file_type: null })),
    date_published: v.date_published,
    downloads: v.downloads,
  };
}

const NOT_INSTALLED = {
  is_installed: false,
  is_included_in_norisk_pack: false,
  is_specific_version_in_pack: false,
  is_enabled: null,
  found_item_details: null,
  norisk_pack_item_details: null,
};

function status(profileId: string, request: { project_id?: string | null; version_id?: string | null }) {
  const projectId = request.project_id ?? "";
  const installed = INSTALLED[profileId]?.has(projectId) ?? false;
  const s = SEEDS.find((x) => x.id === projectId);
  // version requests only match the installed (newest) version
  const matches = installed && (!request.version_id || (s && versionsOf(s)[0].id === request.version_id));
  if (!matches) return { ...NOT_INSTALLED };
  return {
    is_installed: true,
    is_included_in_norisk_pack: false,
    is_specific_version_in_pack: false,
    is_enabled: true,
    found_item_details: { item_type: "Mod", item_id: projectId, file_name: s ? versionsOf(s)[0].files[0].filename : null },
    norisk_pack_item_details: null,
  };
}

function category(name: string, project_type: string, header: string) {
  return { icon: "", name, project_type, header };
}

const TAGS = {
  categories: [
    ..."adventure,cursed,decoration,economy,equipment,food,game-mechanics,library,magic,management,minigame,mobs,optimization,social,storage,technology,transportation,utility,worldgen"
      .split(",").map((n) => category(n, "mod", "categories")),
    ..."adventure,challenging,combat,kitchen-sink,lightweight,magic,multiplayer,optimization,quests,technology"
      .split(",").map((n) => category(n, "modpack", "categories")),
    ..."8x-,16x,32x,48x,64x,128x,256x,512x+".split(",").map((n) => category(n, "resourcepack", "resolutions")),
    ..."audio,blocks,core-shaders,entities,environment,equipment,fonts,gui,items,locale,models"
      .split(",").map((n) => category(n, "resourcepack", "features")),
    ..."combat,cursed,decoration,modded,realistic,simplistic,themed,tweaks,utility,vanilla-like"
      .split(",").map((n) => category(n, "resourcepack", "categories")),
    ..."atmosphere,bloom,colored-lighting,foliage,path-tracing,pbr,reflections,shadows".split(",").map((n) => category(n, "shader", "features")),
    ..."cartoon,cursed,fantasy,realistic,semi-realistic,vanilla-like".split(",").map((n) => category(n, "shader", "categories")),
    ..."high,low,medium,potato,screenshot".split(",").map((n) => category(n, "shader", "performance impact")),
  ],
  loaders: [
    { icon: "", name: "fabric", supported_project_types: ["mod", "project", "modpack"] },
    { icon: "", name: "forge", supported_project_types: ["mod", "project", "modpack"] },
    { icon: "", name: "neoforge", supported_project_types: ["mod", "project", "modpack"] },
    { icon: "", name: "quilt", supported_project_types: ["mod", "project", "modpack"] },
    { icon: "", name: "datapack", supported_project_types: ["datapack", "project", "mod"] },
    { icon: "", name: "iris", supported_project_types: ["shader", "project"] },
    { icon: "", name: "optifine", supported_project_types: ["shader", "project"] },
    { icon: "", name: "canvas", supported_project_types: ["shader", "project"] },
    { icon: "", name: "vanilla", supported_project_types: ["shader", "project"] },
    { icon: "", name: "minecraft", supported_project_types: ["resourcepack", "project"] },
  ],
  game_versions: [
    ["26.4-snapshot-7", "snapshot", "2026-11-03"], ["26.4-snapshot-6", "snapshot", "2026-10-27"], ["26.4-snapshot-5", "snapshot", "2026-10-20"],
    ["26.3", "release", "2026-09-15"], ["26.3-rc-3", "snapshot", "2026-09-14"], ["26.3-rc-2", "snapshot", "2026-09-11"],
    ["26.2", "release", "2026-06-16"], ["26.1.2", "release", "2026-04-09"], ["26.1.1", "release", "2026-04-01"], ["26.1", "release", "2026-03-24"],
    ["1.21.11", "release", "2025-12-09"], ["1.21.10", "release", "2025-10-07"], ["1.21.9", "release", "2025-09-30"], ["1.21.8", "release", "2025-07-17"],
    ["1.21.7", "release", "2025-06-30"], ["1.21.6", "release", "2025-06-17"], ["1.21.5", "release", "2025-03-25"], ["1.21.4", "release", "2024-12-03"],
    ["1.21.3", "release", "2024-10-23"], ["1.21.2", "release", "2024-10-22"], ["1.21.1", "release", "2024-08-08"], ["1.21", "release", "2024-06-13"],
    ["1.20.6", "release", "2024-04-29"], ["1.20.4", "release", "2023-12-07"], ["1.20.1", "release", "2023-06-12"], ["1.19.4", "release", "2023-03-14"],
    ["1.19.2", "release", "2022-08-05"], ["1.18.2", "release", "2022-02-28"], ["1.16.5", "release", "2021-01-15"], ["1.12.2", "release", "2017-09-18"],
    ["1.8.9", "release", "2015-12-09"],
  ].map(([version, version_type, date]) => ({ version, version_type, date: `${date}T10:00:00Z`, major: !version.split(".")[2] })),
};

function bySeedId(id: unknown): Seed | undefined {
  const key = String(id ?? "");
  return SEEDS.find((s) => s.id === key || s.slug === key);
}

export function handle(cmd: string, args: Args): unknown {
  switch (cmd) {
    case "get_modrinth_tags_command":
      return structuredClone(TAGS);
    case "search_mods_unified_command":
      return search((args.params ?? {}) as Args);
    case "search_modrinth_projects": {
      const query = String(args.query ?? "").toLowerCase();
      const hits = SEEDS.filter((s) => !query || s.slug.includes(query) || s.title.toLowerCase().includes(query)).slice(0, Number(args.limit ?? 20));
      return { hits: hits.map(toHit), offset: 0, limit: hits.length, total_hits: hits.length };
    }
    case "get_mod_versions_unified_command": {
      const params = (args.params ?? {}) as Args;
      const s = bySeedId(params.project_id);
      if (!s) return { versions: [], total_count: 0 };
      const loaders = (params.loaders as string[] | undefined) ?? [];
      const gvs = (params.game_versions as string[] | undefined) ?? [];
      const versions = versionsOf(s).filter(
        (v) => (!loaders.length || v.loaders.some((l) => loaders.includes(l))) && (!gvs.length || v.game_versions.some((g) => gvs.includes(g))),
      );
      return structuredClone({ versions, total_count: versions.length });
    }
    case "get_modrinth_mod_versions": {
      const s = bySeedId(args.projectIdOrSlug);
      return s ? versionsOf(s).map(toModrinthVersion) : [];
    }
    case "get_modrinth_project_details": {
      const ids = (args.ids as string[] | undefined) ?? [];
      return ids.map(bySeedId).filter((s): s is Seed => !!s).map(project);
    }
    case "get_modrinth_project_members": {
      const s = bySeedId(args.projectIdOrSlug);
      return s ? members(s) : [];
    }
    case "batch_check_content_installed": {
      const params = (args.params ?? {}) as { profile_id?: string; requests?: { request_id?: string; project_id?: string; version_id?: string }[] };
      return {
        results: (params.requests ?? []).map((r) => ({
          request_id: r.request_id ?? null,
          status: status(params.profile_id ?? "", r),
          project_id: r.project_id ?? null,
          version_id: r.version_id ?? null,
        })),
      };
    }
    case "is_content_installed": {
      const params = (args.params ?? {}) as { profile_id?: string; project_id?: string; version_id?: string };
      return status(params.profile_id ?? "", params);
    }
    case "install_content_to_profile": {
      const payload = (args.payload ?? {}) as { profile_id?: string; project_id?: string };
      if (payload.profile_id && payload.project_id) {
        (INSTALLED[payload.profile_id] ??= new Set()).add(payload.project_id);
      }
      return null;
    }
    default:
      return undefined;
  }
}
