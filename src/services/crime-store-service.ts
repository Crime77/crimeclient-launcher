import { invoke } from "@tauri-apps/api/core";

/** One cosmetic as listed in the client's cosmetics/index.json. */
export interface CatalogCosmetic {
  id: string;
  name: string;
  slot: string;
  accent?: string;
  icon?: string;
}

export interface StoreItem {
  id: string;
  price: number;
}

/** The parts of the store API's account answer (mod-api/store_api.py) the shop uses. */
export interface StoreAccount {
  uuid: string;
  name: string;
  shards: number;
  rank: "" | "vip" | "dev";
  infinite: boolean;
  factor: number;
  owned: string[];
  streak: { day: number; claimed: boolean; rewards: number[]; next: number };
}

function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  return invoke<T>("crime_store_request", { method, path, body: body ?? null });
}

export const getStoreItems = () => request<{ items: StoreItem[] }>("GET", "store").then((r) => r.items);

export const getCatalog = () =>
  request<CatalogCosmetic[]>("GET", "catalog/file?path=cosmetics/index.json");

export const getStoreAccount = () => request<StoreAccount>("GET", "account");

export const buyItem = (id: string) => request<StoreAccount>("POST", "store/buy", { id });

export const claimDailyBonus = () => request<StoreAccount>("POST", "streak/claim");

/** What the CrimeClient Rust profiles wear (src-tauri/src/commands/crime_wardrobe_command.rs). */
export interface Wardrobe {
  /** slot -> cosmetic id */
  worn: Record<string, string>;
  /** an uploaded cape or skin taken over from the Java client */
  custom_cape: boolean;
  custom_skin: boolean;
}

export const getWardrobe = () => invoke<Wardrobe>("crime_wardrobe_get");

/** Puts on `id` in `slot`, or takes the slot off with `null`. */
export const wearCosmetic = (slot: string, id: string | null) => invoke<Wardrobe>("crime_wardrobe_wear", { slot, id });

export const importJavaWardrobe = () => invoke<Wardrobe>("crime_wardrobe_import_java");
