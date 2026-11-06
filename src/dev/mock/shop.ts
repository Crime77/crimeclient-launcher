// Dev mock for the Shop and Skins pages (see tauriMock.ts): the real cosmetics catalogue (ids, names and slots of
// CraftCosmetics' cosmetics/index.json with the prices of mod-api/store.json, frozen in shop-catalog.json) and a
// handful of saved skins, recoloured from public/skins/steve.png.
import catalog from "./shop-catalog.json";

type Args = Record<string, unknown>;

interface MockCosmetic {
  id: string;
  name: string;
  slot: string;
  accent?: string;
  icon?: string;
  price: number;
}

const COSMETICS = catalog as MockCosmetic[];
const PRICES = new Map(COSMETICS.map((c) => [c.id, c.price]));

// ?broke: few shards, so most buy buttons are disabled; ?infinite: endless shards like the dev rank
const broke = location.search.includes("broke");
const dev = location.search.includes("infinite");
const account = {
  uuid: "00000000-0000-0000-0000-000000000001",
  name: "crime77",
  shards: broke ? 180 : 2350,
  rank: dev ? "dev" : "vip",
  infinite: dev,
  factor: dev ? 1 : 5,
  owned: ["bat_wings", "bee_pet", "peach_wings", "moon_mask", "galaxy_cape", "mace_reforged", "totem_gold"],
  // ?claimed shows the waiting state of the daily bonus
  streak: {
    day: 3,
    claimed: location.search.includes("claimed"),
    rewards: [50, 75, 100, 125, 150, 200, 250],
    next: 3 * 3600 + 12 * 60,
  },
};

function store({ method, path, body }: { method?: string; path?: string; body?: { id?: string } | null }) {
  if (path === "store") return { items: COSMETICS.map((c) => ({ id: c.id, price: c.price })) };
  if (path?.startsWith("catalog/")) return COSMETICS.map(({ price: _price, ...c }) => c);
  if (path === "account") return structuredClone(account);
  if (method === "POST" && path === "store/buy" && body?.id) {
    if (!account.infinite) account.shards -= PRICES.get(body.id) ?? 800;
    account.owned = [...account.owned, body.id];
    return structuredClone(account);
  }
  if (path === "streak/claim") {
    account.shards += account.streak.rewards[account.streak.day - 1];
    account.streak = { ...account.streak, claimed: true };
    return structuredClone(account);
  }
  return undefined;
}

// ---------------------------------------------------------------- skins
interface MockSkin {
  id: string;
  name: string;
  base64_data: string;
  variant: "classic" | "slim";
  description: string | null;
  added_at: string;
}

/** Steve's shirt and trousers (cyan and blue) moved to another hue; skin and hair stay. */
const LOOKS: { id: string; name: string; variant: "classic" | "slim"; hue: number | null; sat?: number; light?: number }[] = [
  { id: "skin-crimson", name: "Crimson Hoodie", variant: "classic", hue: 352, sat: 0.75, light: 0.85 },
  { id: "skin-steve", name: "Steve", variant: "classic", hue: null },
  { id: "skin-moss", name: "Moos", variant: "slim", hue: 105, sat: 0.55 },
  { id: "skin-night", name: "Nachtwache", variant: "classic", hue: 230, sat: 0.12, light: 0.55 },
  { id: "skin-gold", name: "Goldjunge", variant: "classic", hue: 42, sat: 0.8 },
  { id: "skin-lilac", name: "Flieder", variant: "slim", hue: 275, sat: 0.5, light: 1.1 },
];

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

let skinsPromise: Promise<MockSkin[]> | null = null;
let skins: MockSkin[] = [];
let appliedId = "skin-crimson";
let steveBase64 = "";

function loadSkins(): Promise<MockSkin[]> {
  skinsPromise ??= (async () => {
    const blob = await (await fetch("/skins/steve.png")).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
    const source = ctx.getImageData(0, 0, canvas.width, canvas.height);
    steveBase64 = canvas.toDataURL("image/png").split(",")[1];
    skins = LOOKS.map((look, i) => {
      const img = new ImageData(new Uint8ClampedArray(source.data), source.width, source.height);
      if (look.hue != null) {
        for (let p = 0; p < img.data.length; p += 4) {
          if (!img.data[p + 3]) continue;
          const [h, s, l] = rgbToHsl(img.data[p], img.data[p + 1], img.data[p + 2]);
          if (s < 0.25 || h < 150 || h > 285) continue;
          const rgb = hslToRgb((look.hue + (h - 180) + 360) % 360, Math.min(1, s * (look.sat ?? 1)), Math.min(0.95, l * (look.light ?? 1)));
          img.data.set(rgb, p);
        }
      }
      ctx.putImageData(img, 0, 0);
      return {
        id: look.id,
        name: look.name,
        base64_data: canvas.toDataURL("image/png").split(",")[1],
        variant: look.variant,
        description: null,
        added_at: new Date(Date.UTC(2026, 9, 20 + i)).toISOString(),
      };
    });
    return skins;
  })();
  return skinsPromise;
}

function profile() {
  const textures = { textures: { SKIN: { url: `http://textures.minecraft.net/texture/${appliedId}` } } };
  return {
    id: "00000000000000000000000000000001",
    name: "crime77",
    properties: [{ name: "textures", value: btoa(JSON.stringify(textures)) }],
  };
}

async function skinCommand(cmd: string, args: Args): Promise<unknown> {
  await loadSkins();
  switch (cmd) {
    case "get_all_skins":
      return structuredClone(skins);
    case "get_user_skin_data":
      return profile();
    case "apply_skin_from_base64": {
      const hit = skins.find((s) => s.base64_data === args.base64Data || s.base64_data === args.base64_data);
      if (hit) appliedId = hit.id;
      return null;
    }
    case "update_skin_properties": {
      const hit = skins.find((s) => s.id === args.id);
      if (!hit) return null;
      hit.name = String(args.name ?? hit.name);
      hit.variant = args.variant === "slim" ? "slim" : "classic";
      return structuredClone(hit);
    }
    case "add_skin_locally": {
      const payload = (args.payload ?? {}) as { target_skin_name?: string; target_skin_variant?: "classic" | "slim" };
      const skin: MockSkin = {
        id: `skin-${Date.now().toString(36)}`,
        name: payload.target_skin_name || "Skin",
        base64_data: steveBase64,
        variant: payload.target_skin_variant ?? "classic",
        description: null,
        added_at: new Date().toISOString(),
      };
      skins = [...skins, skin];
      return structuredClone(skin);
    }
    case "remove_skin": {
      const before = skins.length;
      skins = skins.filter((s) => s.id !== args.id);
      return skins.length < before;
    }
    case "get_base64_from_skin_source_command":
      return steveBase64;
    default:
      return undefined;
  }
}

const SKIN_COMMANDS = new Set([
  "get_all_skins",
  "get_user_skin_data",
  "apply_skin_from_base64",
  "update_skin_properties",
  "add_skin_locally",
  "remove_skin",
  "get_base64_from_skin_source_command",
]);

export function handle(cmd: string, args: Args): unknown {
  if (cmd === "crime_store_request") return store(args as { method?: string; path?: string; body?: { id?: string } | null });
  if (SKIN_COMMANDS.has(cmd)) return skinCommand(cmd, args);
  // Skin renders have no disk cache in the browser: a miss, and a failed store,
  // so lib/skin-preview.ts keeps the render as a blob URL (otherwise every tile
  // showed the fallback Steve).
  if (cmd === "get_cached_skin_render") return Promise.resolve(null);
  if (cmd === "store_skin_render") return Promise.reject(new Error("no skin render cache in the browser mock"));
  return undefined; // the wardrobe and everything else: tauriMock.ts
}
