"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import {
  Backpack,
  Check,
  Crown,
  Download,
  Feather,
  Flag,
  HeartPulse,
  Loader2,
  type LucideIcon,
  PawPrint,
  RefreshCw,
  Shield,
  Sparkles,
  Swords,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { parseErrorMessage } from "../../utils/error-utils";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import {
  buyItem,
  claimDailyBonus,
  getCatalog,
  getStoreAccount,
  getStoreItems,
  getWardrobe,
  importJavaWardrobe,
  wearCosmetic,
  type CatalogCosmetic,
  type StoreAccount,
  type Wardrobe,
} from "../../services/crime-store-service";
import { Button } from "../ui/buttons/Button";
import { SearchInput } from "../ui/SearchInput";
import { Select } from "../ui/Select";
import { Checkbox } from "../ui/Checkbox";

/** Slot filters in shop order; shields and maces share one tab. */
const FILTERS: { id: string; slots: string[] }[] = [
  { id: "all", slots: [] },
  { id: "wings", slots: ["wings"] },
  { id: "head", slots: ["head"] },
  { id: "back", slots: ["back"] },
  { id: "cape", slots: ["cape"] },
  { id: "pet", slots: ["pet"] },
  { id: "aura", slots: ["aura"] },
  { id: "totem", slots: ["totem"] },
  { id: "weapons", slots: ["shield", "mace"] },
];

/** Stand-in when a cosmetic has no render in public/cosmetics (e.g. one that came later with the server catalogue). */
const SLOT_ICONS: Record<string, LucideIcon> = {
  wings: Feather,
  head: Crown,
  back: Backpack,
  cape: Flag,
  pet: PawPrint,
  aura: Sparkles,
  totem: HeartPulse,
  shield: Shield,
  mace: Swords,
};

type SortMode = "price_desc" | "price_asc" | "name";

interface ShopEntry extends CatalogCosmetic {
  price: number;
}

function useShards() {
  const { i18n } = useTranslation();
  return useCallback((n: number) => n.toLocaleString(i18n.language || "de"), [i18n.language]);
}

/** "3 h 12 min", "12 min", "< 1 min" until the next daily bonus. */
function formatWait(seconds: number): string {
  const minutes = Math.max(0, Math.floor(seconds / 60));
  if (minutes < 1) return "< 1 min";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`;
}

/**
 * Spend shards on cosmetics: the same store and account as the wardrobe in the client. Bought cosmetics are put on
 * here for CrimeClient Rust, which has no wardrobe screen; the Java client keeps its own in-game wardrobe.
 * Thumbnails are real renders from tools/render_shop_thumbs.js (public/cosmetics/<id>.png); cosmetics without one show
 * their slot icon.
 */
export function ShopTab() {
  const { t } = useTranslation();
  const formatShards = useShards();
  const activeAccount = useMinecraftAuthStore((s) => s.activeAccount);
  const [entries, setEntries] = useState<ShopEntry[] | null>(null);
  const [account, setAccount] = useState<StoreAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("price_desc");
  const [hideOwned, setHideOwned] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [buying, setBuying] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [wardrobe, setWardrobe] = useState<Wardrobe | null>(null);
  const [wearing, setWearing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [items, catalog] = await Promise.all([getStoreItems(), getCatalog()]);
      const byId = new Map(catalog.map((c) => [c.id, c]));
      setEntries(
        items
          .filter((i) => byId.has(i.id))
          .map((i) => ({ ...byId.get(i.id)!, price: i.price }))
          .sort((a, b) => b.price - a.price || a.name.localeCompare(b.name)),
      );
    } catch (err) {
      setError(parseErrorMessage(err));
    }
  }, []);

  const loadAccount = useCallback(async () => {
    setAccountError(null);
    if (!activeAccount) {
      setAccount(null);
      return;
    }
    try {
      setAccount(await getStoreAccount());
    } catch (err) {
      setAccountError(parseErrorMessage(err));
    }
  }, [activeAccount]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    getWardrobe()
      .then(setWardrobe)
      .catch((err) => console.warn("Wardrobe not loaded", err));
  }, []);

  // a new selection starts without the purchase question
  useEffect(() => setConfirming(false), [selectedId]);

  /** Puts `entry` on, or takes it off when it is worn already. */
  const toggleWorn = async (entry: ShopEntry) => {
    const worn = wardrobe?.worn[entry.slot] === entry.id;
    setWearing(entry.id);
    try {
      setWardrobe(await wearCosmetic(entry.slot, worn ? null : entry.id));
      toast.success(t(worn ? "shop.taken_off" : "shop.put_on", { name: entry.name }));
    } catch (err) {
      toast.error(parseErrorMessage(err));
    } finally {
      setWearing(null);
    }
  };

  const takeOffCustomCape = async () => {
    try {
      setWardrobe(await wearCosmetic("cape", null));
    } catch (err) {
      toast.error(parseErrorMessage(err));
    }
  };

  const importJava = async () => {
    try {
      setWardrobe(await importJavaWardrobe());
      toast.success(t("shop.java_imported"));
    } catch {
      toast.error(t("shop.java_import_failed"));
    }
  };

  const owned = useMemo(() => new Set(account?.owned ?? []), [account]);

  const shown = useMemo(() => {
    if (!entries) return [];
    const slots = FILTERS.find((f) => f.id === filter)?.slots ?? [];
    const q = query.trim().toLowerCase();
    const list = entries.filter(
      (e) =>
        (slots.length === 0 || slots.includes(e.slot)) &&
        (!q || e.name.toLowerCase().includes(q) || e.id.includes(q)) &&
        (!hideOwned || !owned.has(e.id)),
    );
    if (sort === "price_asc") return [...list].sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
    if (sort === "name") return [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list; // the load order: dearest first
  }, [entries, filter, query, hideOwned, owned, sort]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of FILTERS) {
      map[f.id] = entries?.filter((e) => f.slots.length === 0 || f.slots.includes(e.slot)).length ?? 0;
    }
    return map;
  }, [entries]);

  const selected = useMemo(() => entries?.find((e) => e.id === selectedId) ?? null, [entries, selectedId]);

  const buy = async () => {
    if (!selected) return;
    setBuying(true);
    try {
      setAccount(await buyItem(selected.id));
      toast.success(t("shop.bought", { name: selected.name }));
      setConfirming(false);
    } catch (err) {
      toast.error(t("shop.buy_failed", { error: parseErrorMessage(err) }));
    } finally {
      setBuying(false);
    }
  };

  const claim = async () => {
    if (!account) return;
    setClaiming(true);
    try {
      const reward = account.streak.rewards[account.streak.day - 1] ?? 0;
      setAccount(await claimDailyBonus());
      toast.success(t("shop.bonus_claimed", { amount: reward }));
    } catch (err) {
      toast.error(parseErrorMessage(err));
    } finally {
      setClaiming(false);
    }
  };

  const canAfford = (price: number) => !!account && (account.infinite || account.shards >= price);

  return (
    <div className="h-full flex flex-col">
      {/* header: title, daily bonus, balance */}
      <div className="flex items-start justify-between gap-6 px-6 pt-5 pb-4">
        <div className="min-w-0">
          <h1 className="font-display text-[22px] leading-[28px] font-[650] text-fg">{t("shop.title")}</h1>
          <p className="text-[13px] leading-5 text-fg-3 mt-1 truncate">{t("shop.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {account && (
            <DailyBonus account={account} claiming={claiming} onClaim={claim} formatShards={formatShards} />
          )}
          <ShardBalance
            account={account}
            error={accountError}
            signedIn={!!activeAccount}
            onRetry={loadAccount}
            formatShards={formatShards}
          />
        </div>
      </div>

      {/* slot tabs */}
      <div className="px-6 border-b border-line">
        <div className="flex items-end gap-1 -mb-px overflow-x-auto no-scrollbar" role="tablist">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "relative flex items-center gap-1.5 h-9 px-2.5 text-[13px] whitespace-nowrap transition-colors duration-fast",
                  active ? "text-fg font-[560]" : "text-fg-3 font-[450] hover:text-fg-2",
                )}
                style={{ borderRadius: 0 }}
              >
                {t(`shop.filter.${f.id}`)}
                <span className={cn("cc-num text-[11px]", active ? "text-fg-2" : "text-fg-4")}>
                  {entries ? counts[f.id] : "–"}
                </span>
                <span
                  className={cn(
                    "absolute left-2 right-2 bottom-0 h-[2px] transition-colors duration-fast",
                    active ? "bg-fg" : "bg-transparent",
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col">
          {/* toolbar: search, sort, owned */}
          <div className="flex items-center gap-2 px-6 py-3">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder={t("shop.search")}
              size="sm"
              className="w-[220px] min-w-0"
            />
            <Select
              value={sort}
              onChange={(v) => setSort(v as SortMode)}
              size="sm"
              className="w-[156px] flex-shrink-0"
              options={[
                { value: "price_desc", label: t("shop.sort.price_desc") },
                { value: "price_asc", label: t("shop.sort.price_asc") },
                { value: "name", label: t("shop.sort.name") },
              ]}
            />
            {account && (
              <Checkbox
                checked={hideOwned}
                onChange={(e) => setHideOwned(e.target.checked)}
                label={t("shop.hide_owned")}
                size="sm"
                className="ml-2 flex-shrink-0"
              />
            )}
            <div className="flex-1" />
            {entries && (
              <span className="cc-num text-[11px] text-fg-4 flex-shrink-0">
                {shown.length}/{entries.length}
              </span>
            )}
          </div>

          {/* grid */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 pb-6">
            {error ? (
              <div className="h-full grid place-items-center text-center">
                <div>
                  <p className="text-[13px] text-fg-2">{t("shop.unreachable")}</p>
                  <p className="text-xs text-fg-3 mt-1">{error}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-4 mx-auto"
                    icon={<RefreshCw size={14} strokeWidth={1.75} />}
                    onClick={load}
                  >
                    {t("shop.retry")}
                  </Button>
                </div>
              </div>
            ) : !entries ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-3">
                {Array.from({ length: 12 }, (_, i) => (
                  <div key={i} className="p-2 bg-s1 border border-line rounded-xl">
                    <div className="aspect-square bg-s2 rounded-md animate-skeleton-pulse" />
                    <div className="h-2.5 w-12 mt-3 bg-s2 rounded-sm" />
                    <div className="h-3 w-24 mt-2 mb-1 bg-s2 rounded-sm" />
                  </div>
                ))}
              </div>
            ) : shown.length === 0 ? (
              <div className="h-full grid place-items-center text-center">
                <div>
                  <p className="text-[13px] text-fg-2">{t("shop.empty")}</p>
                  <p className="text-xs text-fg-3 mt-1">{t("shop.empty_hint")}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-3">
                {shown.map((entry) => (
                  <ShopTile
                    key={entry.id}
                    entry={entry}
                    owned={owned.has(entry.id)}
                    worn={wardrobe?.worn[entry.slot] === entry.id}
                    affordable={!account || canAfford(entry.price)}
                    selected={selectedId === entry.id}
                    onSelect={() => setSelectedId(entry.id)}
                    formatShards={formatShards}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <ShopDetail
          entry={selected}
          account={account}
          signedIn={!!activeAccount}
          owned={!!selected && owned.has(selected.id)}
          worn={!!selected && wardrobe?.worn[selected.slot] === selected.id}
          wearing={!!selected && wearing === selected.id}
          confirming={confirming}
          buying={buying}
          wardrobe={wardrobe}
          formatShards={formatShards}
          onClose={() => setSelectedId(null)}
          onBuy={() => setConfirming(true)}
          onCancelBuy={() => setConfirming(false)}
          onConfirmBuy={buy}
          onWear={() => selected && toggleWorn(selected)}
          onTakeOffCustomCape={takeOffCustomCape}
          onImportJava={importJava}
        />
      </div>
    </div>
  );
}

/** A small faceted shard, the currency mark next to prices. */
function ShardGlyph({ size = 10, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill="none"
      className={cn("flex-shrink-0", className)}
      aria-hidden="true"
    >
      <path d="M5 0.75 9.25 5 5 9.25 0.75 5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M0.75 5h8.5M5 0.75 3.4 5 5 9.25 6.6 5 5 0.75" stroke="currentColor" strokeWidth="0.8" opacity="0.55" />
    </svg>
  );
}

function Price({
  value,
  formatShards,
  className,
}: {
  value: number;
  formatShards: (n: number) => string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 cc-num", className)}>
      <ShardGlyph />
      {formatShards(value)}
    </span>
  );
}

function DailyBonus({
  account,
  claiming,
  onClaim,
  formatShards,
}: {
  account: StoreAccount;
  claiming: boolean;
  onClaim: () => void;
  formatShards: (n: number) => string;
}) {
  const { t } = useTranslation();
  const { day, claimed, rewards, next } = account.streak;
  const reward = rewards[day - 1] ?? 0;
  return (
    <div
      className="flex items-center gap-3 h-10 pl-3 pr-1 bg-s1 border border-line rounded-md"
      title={rewards.map((r, i) => `${t("shop.streak_day", { day: i + 1 })}: +${r}`).join("\n")}
    >
      <div className="leading-none">
        <div className="cc-eyebrow leading-none">{t("shop.daily")}</div>
        <div className="flex items-center gap-[3px] mt-[7px]" aria-label={t("shop.streak_day", { day })}>
          {rewards.map((_, i) => {
            const done = i < day - 1 || (i === day - 1 && claimed);
            const today = i === day - 1 && !claimed;
            return (
              <span
                key={i}
                className={cn("h-[3px] w-[10px] rounded-[1px]", done ? "bg-fg-2" : today ? "bg-fg-3" : "bg-s4")}
              />
            );
          })}
        </div>
      </div>
      {claimed ? (
        <span className="cc-num text-[11px] text-fg-3 pr-2 whitespace-nowrap">
          {t("shop.next_bonus", { time: formatWait(next) })}
        </span>
      ) : (
        <Button
          variant="secondary"
          size="xs"
          onClick={onClaim}
          disabled={claiming}
          icon={claiming ? <Loader2 size={13} className="animate-spin" /> : undefined}
        >
          {t("shop.claim", { amount: formatShards(reward) })}
        </Button>
      )}
    </div>
  );
}

function ShardBalance({
  account,
  error,
  signedIn,
  onRetry,
  formatShards,
}: {
  account: StoreAccount | null;
  error: string | null;
  signedIn: boolean;
  onRetry: () => void;
  formatShards: (n: number) => string;
}) {
  const { t } = useTranslation();
  if (!signedIn) {
    return <div className="text-[13px] text-fg-3">{t("shop.sign_in_first")}</div>;
  }
  if (error) {
    return (
      <Button variant="secondary" size="sm" onClick={onRetry} title={error} icon={<RefreshCw size={14} strokeWidth={1.75} />}>
        {t("shop.account_failed")}
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-3 h-10 px-3 bg-s1 border border-line rounded-md">
      <span className="cc-eyebrow">{t("shop.shards")}</span>
      <span className="flex items-center gap-1.5 text-fg">
        <ShardGlyph size={11} className="text-fg-3" />
        <span className="cc-num text-[15px] font-[560] min-w-[3ch]">
          {!account ? "…" : account.infinite ? "∞" : formatShards(account.shards)}
        </span>
      </span>
      {account?.rank && (
        <span className="cc-num text-[11px] leading-none text-fg-2 px-1.5 py-[3px] border border-line-2 rounded-sm">
          {account.rank === "dev" ? "Dev" : `VIP ×${account.factor}`}
        </span>
      )}
    </div>
  );
}

/** Module-wide memory of ids without a render, so a remounted tile shows its icon at once. */
const missingThumbs = new Set<string>();

/** The real render of a cosmetic (public/cosmetics/<id>.png), or its slot icon small and muted. */
function CosmeticThumb({ entry, iconSize = 28, className }: { entry: CatalogCosmetic; iconSize?: number; className?: string }) {
  const [failed, setFailed] = useState(() => missingThumbs.has(entry.id));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(missingThumbs.has(entry.id));
    setLoaded(false);
  }, [entry.id]);

  if (failed) {
    const Icon = SLOT_ICONS[entry.slot] ?? Sparkles;
    return (
      <div className={cn("grid place-items-center", className)}>
        <Icon size={iconSize} strokeWidth={1.5} className="text-fg-4" />
      </div>
    );
  }
  return (
    <img
      src={`/cosmetics/${entry.id}.png`}
      alt=""
      draggable={false}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => {
        missingThumbs.add(entry.id);
        setFailed(true);
      }}
      className={cn(
        "object-contain select-none transition-opacity duration-med ease-out",
        loaded ? "opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}

function StatusLabel({ worn }: { worn: boolean }) {
  const { t } = useTranslation();
  return worn ? (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-[520] text-fg">
      <span className="w-1.5 h-1.5 rounded-full bg-ok" />
      {t("shop.worn")}
    </span>
  ) : (
    <span className="text-[11px] font-[520] text-fg-3">{t("shop.owned")}</span>
  );
}

function ShopTile({
  entry,
  owned,
  worn,
  affordable,
  selected,
  onSelect,
  formatShards,
}: {
  entry: ShopEntry;
  owned: boolean;
  worn: boolean;
  affordable: boolean;
  selected: boolean;
  onSelect: () => void;
  formatShards: (n: number) => string;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group text-left p-2 bg-s1 border rounded-xl",
        "transition-[transform,border-color,background-color] duration-fast ease-out hover:-translate-y-px",
        selected ? "border-line-3" : "border-line hover:border-line-2",
      )}
      style={{ borderRadius: "var(--r-lg)" }}
    >
      <div className="relative aspect-square bg-s2 rounded-md overflow-hidden">
        <CosmeticThumb entry={entry} className="absolute inset-0 w-full h-full" />
      </div>
      <div className="px-1 pt-2.5 pb-0.5">
        <div className="flex items-center justify-between gap-2 h-4">
          <span className="cc-eyebrow truncate">{t(`shop.slot.${entry.slot}`)}</span>
          {owned ? (
            <StatusLabel worn={worn} />
          ) : (
            <Price
              value={entry.price}
              formatShards={formatShards}
              className={cn("text-[11px] flex-shrink-0", affordable ? "text-fg-2" : "text-fg-4")}
            />
          )}
        </div>
        <div className="text-[13px] leading-5 font-[520] text-fg truncate mt-1" title={entry.name}>
          {entry.name}
        </div>
      </div>
    </button>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 h-9 text-[12px]">
      <span className="text-fg-3">{label}</span>
      <span className="text-fg-2 text-right min-w-0 truncate">{children}</span>
    </div>
  );
}

/** Side panel: the picked cosmetic large, its price and status, and the one main action (buy, put on, take off). */
function ShopDetail({
  entry,
  account,
  signedIn,
  owned,
  worn,
  wearing,
  confirming,
  buying,
  wardrobe,
  formatShards,
  onClose,
  onBuy,
  onCancelBuy,
  onConfirmBuy,
  onWear,
  onTakeOffCustomCape,
  onImportJava,
}: {
  entry: ShopEntry | null;
  account: StoreAccount | null;
  signedIn: boolean;
  owned: boolean;
  worn: boolean;
  wearing: boolean;
  confirming: boolean;
  buying: boolean;
  wardrobe: Wardrobe | null;
  formatShards: (n: number) => string;
  onClose: () => void;
  onBuy: () => void;
  onCancelBuy: () => void;
  onConfirmBuy: () => void;
  onWear: () => void;
  onTakeOffCustomCape: () => void;
  onImportJava: () => void;
}) {
  const { t } = useTranslation();
  const affordable = !!entry && !!account && (account.infinite || account.shards >= entry.price);
  const left = entry && account ? account.shards - entry.price : 0;

  useEffect(() => {
    if (!entry) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (confirming) onCancelBuy();
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entry, confirming, onCancelBuy, onClose]);

  return (
    <aside className="w-[264px] xl:w-[300px] flex-shrink-0 flex flex-col border-l border-line bg-s1">
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
        {!entry ? (
          <div>
            <div className="h-[26vh] min-h-[150px] max-h-[268px] bg-s2 border border-line rounded-lg grid place-items-center">
              <Sparkles size={28} strokeWidth={1.5} className="text-fg-4" />
            </div>
            <p className="text-[13px] text-fg-2 mt-4">{t("shop.detail.empty")}</p>
            <p className="text-xs text-fg-3 mt-1 leading-[1.5]">{t("shop.detail.empty_hint")}</p>
          </div>
        ) : (
          <div key={entry.id} className="cc-enter">
            <div className="relative h-[26vh] min-h-[150px] max-h-[268px] bg-s2 border border-line rounded-lg overflow-hidden">
              <CosmeticThumb entry={entry} iconSize={40} className="absolute inset-0 m-auto h-[88%] w-[88%]" />
              <button
                type="button"
                onClick={onClose}
                className="cc-icon-btn absolute top-1.5 right-1.5"
                title={t("common.close")}
                aria-label={t("common.close")}
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            </div>

            <div className="mt-4">
              <div className="cc-eyebrow">{t(`shop.slot.${entry.slot}`)}</div>
              <h2 className="font-display text-[18px] leading-6 font-[650] text-fg mt-1 break-words">{entry.name}</h2>
              <div className="cc-num text-[11px] text-fg-4 mt-1 truncate">{entry.id}</div>
            </div>

            <div className="mt-4 border-y border-line divide-y divide-line">
              <DetailRow label={t("shop.price")}>
                <Price value={entry.price} formatShards={formatShards} className="text-fg" />
              </DetailRow>
              {signedIn && account && (owned ? (
                <DetailRow label={t("shop.status")}>
                  <StatusLabel worn={worn} />
                </DetailRow>
              ) : !account.infinite ? (
                <DetailRow label={t("shop.after_purchase")}>
                  <span className={cn("cc-num", left < 0 ? "text-err" : "text-fg-2")}>{formatShards(left)}</span>
                </DetailRow>
              ) : null)}
            </div>
          </div>
        )}
      </div>

      {/* the one main action, always in view: put on / take off, or buy (with a confirmation step) */}
      {entry && (
        <div className="flex-shrink-0 px-4 pt-3 pb-4 border-t border-line">
          {owned ? (
            <>
              <Button
                variant={worn ? "secondary" : "default"}
                size="md"
                className="w-full"
                onClick={onWear}
                disabled={wearing}
                title={t(worn ? "shop.take_off" : "shop.wear_hint")}
                icon={
                  wearing ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : worn ? (
                    <X size={15} strokeWidth={1.75} />
                  ) : (
                    <Check size={15} strokeWidth={1.75} />
                  )
                }
              >
                {t(worn ? "shop.take_off" : "shop.wear")}
              </Button>
              <p className="text-[11px] leading-4 text-fg-3 mt-2">{t("shop.java_wardrobe_hint")}</p>
            </>
          ) : confirming ? (
            <div className="cc-pop">
              <p className="text-xs leading-[1.5] text-fg-2">
                {account?.infinite
                  ? t("shop.confirm_free")
                  : t("shop.confirm_text", { price: formatShards(entry.price), left: formatShards(left) })}
              </p>
              <div className="flex gap-2 mt-3">
                <Button variant="ghost" size="md" className="flex-1" onClick={onCancelBuy} disabled={buying}>
                  {t("shop.cancel")}
                </Button>
                <Button
                  size="md"
                  className="flex-[1.4]"
                  onClick={onConfirmBuy}
                  disabled={buying}
                  icon={buying ? <Loader2 size={15} className="animate-spin" /> : undefined}
                >
                  {t("shop.confirm_buy")}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button
                size="md"
                className="w-full"
                onClick={onBuy}
                disabled={!account || !affordable}
                title={account && !affordable ? t("shop.not_enough") : undefined}
              >
                {t("shop.buy_for", { price: formatShards(entry.price) })}
              </Button>
              <p className="text-[11px] leading-4 text-fg-3 mt-2">
                {!signedIn
                  ? t("shop.sign_in_first")
                  : account && !affordable
                    ? t("shop.missing", { amount: formatShards(entry.price - account.shards) })
                    : t("shop.java_wardrobe_hint")}
              </p>
            </>
          )}
        </div>
      )}

      {/* what the CrimeClient Rust profiles wear besides shop items */}
      <div className="flex-shrink-0 border-t border-line px-4 pt-2.5 pb-3 bg-bg/40">
        <div className="cc-eyebrow">{t("shop.rust_wardrobe")}</div>
        {wardrobe?.custom_cape && (
          <div className="flex items-center gap-2 h-8 mt-2 pl-2.5 pr-1 bg-s2 border border-line rounded-md text-[12px] text-fg-2">
            <Flag size={13} strokeWidth={1.75} className="text-fg-3" />
            <span className="flex-1 truncate">{t("shop.custom_cape")}</span>
            <button
              type="button"
              onClick={onTakeOffCustomCape}
              title={t("shop.take_off")}
              aria-label={t("shop.take_off")}
              className="cc-icon-btn w-6 h-6"
            >
              <X size={13} strokeWidth={1.75} />
            </button>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start mt-1 px-2"
          onClick={onImportJava}
          title={t("shop.java_import_hint")}
          icon={<Download size={14} strokeWidth={1.75} />}
        >
          {t("shop.java_import")}
        </Button>
      </div>
    </aside>
  );
}
