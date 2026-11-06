// Small display helpers shared by the Mods pages (search rows, version rows, detail page).

import i18n from "../../../i18n/i18n";

/** Loader names that Modrinth mixes into a project's categories; shown as loaders, not as category labels. */
export const LOADER_NAMES = new Set([
  "fabric",
  "forge",
  "neoforge",
  "quilt",
  "babric",
  "bta-babric",
  "legacy-fabric",
  "liteloader",
  "modloader",
  "nilloader",
  "ornithe",
  "rift",
  "java-agent",
  "bukkit",
  "bungeecord",
  "folia",
  "paper",
  "purpur",
  "spigot",
  "sponge",
  "velocity",
  "waterfall",
  "geyser",
  "datapack",
  "minecraft",
  "iris",
  "optifine",
  "canvas",
  "vanilla",
]);

function lang(): string {
  return i18n.language?.startsWith("de") ? "de-DE" : "en-US";
}

/** 1.2M, 18.4k, 950 (decimal separator follows the UI language). */
export function formatCompact(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  const fmt = (v: number, unit: string) =>
    `${v.toLocaleString(lang(), { maximumFractionDigits: v < 10 ? 1 : 0 })}${unit}`;
  if (n >= 1e9) return fmt(n / 1e9, "B");
  if (n >= 1e6) return fmt(n / 1e6, "M");
  if (n >= 1e3) return fmt(n / 1e3, "k");
  return n.toLocaleString(lang());
}

/** "3 days ago" / "vor 3 Tagen" in the short style. */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "–";
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "–";
  const seconds = (time - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(lang(), { numeric: "auto", style: "short" });
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [3600, "minute"],
    [86400, "hour"],
    [86400 * 30, "day"],
    [86400 * 365, "month"],
  ];
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(Math.round(seconds), "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < steps[3][0]) return rtf.format(Math.round(seconds / 86400), "day");
  if (abs < steps[4][0]) return rtf.format(Math.round(seconds / (86400 * 30)), "month");
  return rtf.format(Math.round(seconds / (86400 * 365)), "year");
}

/** 2026-10-30, for version tables (sorts and scans well in mono). */
export function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return "–";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "–";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 2.4 MB, 312 KB. */
export function formatBytes(size: number | null | undefined): string {
  const n = Number(size ?? 0);
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toLocaleString(lang(), { maximumFractionDigits: 1 })} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

/** "game-mechanics" -> "game mechanics". */
export function prettyCategory(name: string): string {
  return name.replace(/-/g, " ");
}

/** Categories without loader names, for the small labels on a row. */
export function contentCategories(categories: string[] | null | undefined): string[] {
  return (categories ?? []).filter((c) => !LOADER_NAMES.has(c.toLowerCase()));
}

/** The loader names among a project's categories. */
export function loaderCategories(categories: string[] | null | undefined): string[] {
  return (categories ?? []).filter((c) => LOADER_NAMES.has(c.toLowerCase()) && c !== "minecraft" && c !== "datapack");
}
