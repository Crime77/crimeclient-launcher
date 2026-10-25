"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import {
  Check,
  Crown,
  Feather,
  Gem,
  Gift,
  Loader2,
  type LucideIcon,
  PawPrint,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Swords,
  Backpack,
  Flag,
  HeartPulse,
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
  type CatalogCosmetic,
  type StoreAccount,
} from "../../services/crime-store-service";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";

/** Slot filters in shop order; shields and maces share one tab. */
const FILTERS: { id: string; slots: string[]; icon: LucideIcon }[] = [
  { id: "all", slots: [], icon: Sparkles },
  { id: "wings", slots: ["wings"], icon: Feather },
  { id: "head", slots: ["head"], icon: Crown },
  { id: "back", slots: ["back"], icon: Backpack },
  { id: "cape", slots: ["cape"], icon: Flag },
  { id: "pet", slots: ["pet"], icon: PawPrint },
  { id: "aura", slots: ["aura"], icon: Sparkles },
  { id: "totem", slots: ["totem"], icon: HeartPulse },
  { id: "weapons", slots: ["shield", "mace"], icon: Swords },
];

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

interface ShopEntry extends CatalogCosmetic {
  price: number;
}

const formatShards = (n: number) => n.toLocaleString("de-DE");

/** Spend shards on cosmetics: the same store and account as the wardrobe in the client. */
export function ShopTab() {
  const { t } = useTranslation();
  const activeAccount = useMinecraftAuthStore((s) => s.activeAccount);
  const [entries, setEntries] = useState<ShopEntry[] | null>(null);
  const [account, setAccount] = useState<StoreAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [hideOwned, setHideOwned] = useState(false);
  const [confirm, setConfirm] = useState<ShopEntry | null>(null);
  const [buying, setBuying] = useState(false);
  const [claiming, setClaiming] = useState(false);

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

  const owned = useMemo(() => new Set(account?.owned ?? []), [account]);

  const shown = useMemo(() => {
    if (!entries) return [];
    const slots = FILTERS.find((f) => f.id === filter)?.slots ?? [];
    const q = query.trim().toLowerCase();
    return entries.filter(
      (e) =>
        (slots.length === 0 || slots.includes(e.slot)) &&
        (!q || e.name.toLowerCase().includes(q) || e.id.includes(q)) &&
        (!hideOwned || !owned.has(e.id)),
    );
  }, [entries, filter, query, hideOwned, owned]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of FILTERS) {
      map[f.id] = entries?.filter((e) => f.slots.length === 0 || f.slots.includes(e.slot)).length ?? 0;
    }
    return map;
  }, [entries]);

  const buy = async () => {
    if (!confirm) return;
    setBuying(true);
    try {
      setAccount(await buyItem(confirm.id));
      toast.success(t("shop.bought", { name: confirm.name }));
      setConfirm(null);
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
  const bonus = account && !account.streak.claimed ? account.streak.rewards[account.streak.day - 1] : null;

  return (
    <div className="h-full flex flex-col">
      {/* header: title, balance, daily bonus */}
      <div className="flex items-end justify-between gap-6 px-8 pt-7 pb-5">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">{t("shop.title")}</h1>
          <p className="text-sm text-white/45 mt-1">{t("shop.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2.5">
          {bonus != null && (
            <button
              onClick={claim}
              disabled={claiming}
              className="cc-free flex items-center gap-2 h-11 px-4 text-[13px] font-semibold text-emerald-200 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 transition-colors disabled:opacity-60"
              style={{ borderRadius: 14 }}
            >
              {claiming ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
              {t("shop.daily_bonus", { day: account!.streak.day, amount: bonus })}
            </button>
          )}
          <ShardBalance account={account} error={accountError} signedIn={!!activeAccount} onRetry={loadAccount} />
        </div>
      </div>

      {/* filters */}
      <div className="flex items-center gap-3 px-8 pb-4 flex-wrap">
        <div className="flex items-center gap-1 p-1 cc-glass flex-wrap" style={{ borderRadius: 9999 }}>
          {FILTERS.map((f) => {
            const Icon = f.icon;
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "cc-free flex items-center gap-1.5 h-8 px-3 text-[13px] font-semibold transition-colors",
                  active ? "text-white" : "text-white/55 hover:text-white hover:bg-white/[0.06]",
                )}
                style={{
                  borderRadius: 9999,
                  background: active ? "linear-gradient(180deg, var(--accent), var(--accent-hover))" : undefined,
                }}
              >
                <Icon size={14} />
                {t(`shop.filter.${f.id}`)}
                <span className={cn("text-[11px] tabular-nums", active ? "text-white/75" : "text-white/35")}>
                  {counts[f.id]}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex-1" />
        <label className="flex items-center gap-2 text-[13px] text-white/60 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideOwned}
            onChange={(e) => setHideOwned(e.target.checked)}
            className="accent-[var(--accent)] w-4 h-4"
          />
          {t("shop.hide_owned")}
        </label>
        <div
          className="flex items-center gap-2 h-10 px-3.5 w-60 bg-white/[0.04] border border-white/[0.09] focus-within:border-[var(--accent)] transition-colors"
          style={{ borderRadius: 9999 }}
        >
          <Search size={15} className="text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("shop.search")}
            className="flex-1 min-w-0 bg-transparent outline-none text-sm text-white placeholder:text-white/35"
          />
        </div>
      </div>

      {/* grid */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-8 pb-8">
        {error ? (
          <div className="h-full grid place-items-center text-center">
            <div>
              <p className="text-white/70">{t("shop.unreachable")}</p>
              <p className="text-xs text-white/35 mt-1">{error}</p>
              <Button variant="flat" size="sm" className="mt-4 mx-auto" icon={<RefreshCw size={14} />} onClick={load}>
                {t("shop.retry")}
              </Button>
            </div>
          </div>
        ) : !entries ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="h-[230px] bg-white/[0.04] animate-skeleton-pulse" style={{ borderRadius: 20 }} />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <div className="h-full grid place-items-center text-white/45">{t("shop.empty")}</div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4">
            {shown.map((entry) => (
              <ShopCard
                key={entry.id}
                entry={entry}
                owned={owned.has(entry.id)}
                affordable={canAfford(entry.price)}
                signedIn={!!account}
                onBuy={() => setConfirm(entry)}
              />
            ))}
          </div>
        )}
      </div>

      {confirm && (
        <Modal title={t("shop.confirm_title")} onClose={() => !buying && setConfirm(null)} width="sm">
          <div className="p-6 flex items-center gap-5">
            <ItemArt entry={confirm} size={96} />
            <div className="min-w-0">
              <div className="font-display text-xl font-bold text-white">{confirm.name}</div>
              <div className="text-sm text-white/45">{t(`shop.slot.${confirm.slot}`)}</div>
              <div className="mt-3 text-sm text-white/70">
                {account?.infinite
                  ? t("shop.confirm_free")
                  : t("shop.confirm_text", {
                      price: formatShards(confirm.price),
                      left: formatShards((account?.shards ?? 0) - confirm.price),
                    })}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 px-6 pb-6">
            <Button variant="flat" size="sm" onClick={() => setConfirm(null)} disabled={buying}>
              {t("shop.cancel")}
            </Button>
            <Button
              size="sm"
              onClick={buy}
              disabled={buying}
              icon={buying ? <Loader2 size={15} className="animate-spin" /> : <Gem size={15} />}
            >
              {t("shop.buy_for", { price: formatShards(confirm.price) })}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ShardBalance({
  account,
  error,
  signedIn,
  onRetry,
}: {
  account: StoreAccount | null;
  error: string | null;
  signedIn: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  if (!signedIn) {
    return <div className="text-sm text-white/45">{t("shop.sign_in_first")}</div>;
  }
  if (error) {
    return (
      <button
        onClick={onRetry}
        title={error}
        className="cc-free flex items-center gap-2 h-11 px-4 text-[13px] text-white/60 hover:text-white cc-glass"
        style={{ borderRadius: 14 }}
      >
        <RefreshCw size={15} /> {t("shop.account_failed")}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-3 h-11 pl-2 pr-4 cc-glass-strong" style={{ borderRadius: 14 }}>
      <div
        className="w-8 h-8 grid place-items-center text-white"
        style={{ borderRadius: 10, background: "linear-gradient(135deg, #a78bfa, #6d28d9)" }}
      >
        <Gem size={16} />
      </div>
      <div className="leading-tight">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{t("shop.shards")}</div>
        <div className="font-display text-base font-bold text-white tabular-nums">
          {!account ? "…" : account.infinite ? "∞" : formatShards(account.shards)}
        </div>
      </div>
      {account?.rank && (
        <span
          className="ml-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{
            background: account.rank === "dev" ? "var(--accent)" : "linear-gradient(135deg, #fde68a, #d97706)",
            color: account.rank === "dev" ? "#fff" : "#3b2400",
          }}
        >
          {account.rank === "dev" ? "Dev" : `VIP ×${account.factor}`}
        </span>
      )}
    </div>
  );
}

function ItemArt({ entry, size }: { entry: CatalogCosmetic; size?: number }) {
  const Icon = SLOT_ICONS[entry.slot] ?? Sparkles;
  const accent = entry.accent ?? "#e8314a";
  return (
    <div
      className="relative grid place-items-center overflow-hidden flex-shrink-0"
      style={{
        width: size ?? "100%",
        height: size ?? 120,
        borderRadius: 16,
        background: `radial-gradient(circle at 50% 35%, ${accent}66 0%, ${accent}1f 55%, transparent 80%), rgba(255,255,255,0.03)`,
      }}
    >
      <Icon
        size={(size ?? 120) * 0.42}
        strokeWidth={1.6}
        style={{ color: accent, filter: `drop-shadow(0 6px 18px ${accent}aa)` }}
      />
    </div>
  );
}

function ShopCard({
  entry,
  owned,
  affordable,
  signedIn,
  onBuy,
}: {
  entry: ShopEntry;
  owned: boolean;
  affordable: boolean;
  signedIn: boolean;
  onBuy: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="group flex flex-col gap-3 p-3 bg-white/[0.035] border border-white/[0.07] hover:bg-white/[0.06] hover:border-white/[0.13] transition-all hover:-translate-y-0.5"
      style={{ borderRadius: 20 }}
    >
      <ItemArt entry={entry} />
      <div className="px-1 min-w-0">
        <div className="text-sm font-semibold text-white truncate" title={entry.name}>
          {entry.name}
        </div>
        <div className="text-xs text-white/40">{t(`shop.slot.${entry.slot}`)}</div>
      </div>
      {owned ? (
        <div
          className="flex items-center justify-center gap-1.5 h-9 text-[13px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-400/20"
          style={{ borderRadius: 12 }}
        >
          <Check size={15} /> {t("shop.owned")}
        </div>
      ) : (
        <button
          onClick={onBuy}
          disabled={!signedIn || !affordable}
          title={signedIn && !affordable ? t("shop.not_enough") : undefined}
          className={cn(
            "cc-free flex items-center justify-center gap-1.5 h-9 text-[13px] font-bold transition-all",
            signedIn && affordable
              ? "cc-play-button"
              : "bg-white/[0.05] text-white/40 border border-white/[0.07] cursor-not-allowed",
          )}
          style={{ borderRadius: 12 }}
        >
          <Gem size={14} /> {formatShards(entry.price)}
        </button>
      )}
    </div>
  );
}
