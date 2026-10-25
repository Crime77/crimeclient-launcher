"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { cn } from "../../lib/utils";

/** The client's changelog, served by the CrimeClient update API (same file the website shows). */
const CHANGELOG_URL = "https://crime77.duckdns.org/mod/api/launcher/changelog.json";
const SHOWN = 8;

interface ChangelogEntry {
  version: string;
  de: string[];
  en: string[];
}

interface CrimeNewsProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Right-hand panel on the play tab: what is new in CrimeClient, as a timeline. */
export function CrimeNews({ className, style }: CrimeNewsProps) {
  const { t, i18n } = useTranslation();
  const [entries, setEntries] = useState<ChangelogEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const german = i18n.language?.startsWith("de");

  useEffect(() => {
    let cancelled = false;
    fetch(CHANGELOG_URL, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((list: ChangelogEntry[]) => {
        if (!cancelled) setEntries(list.slice(0, SHOWN));
      })
      .catch((err) => {
        console.warn("[CrimeNews] changelog not reachable:", err);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className={cn(className)} style={style}>
      <div className="flex items-center gap-3 px-6 pt-6 pb-4">
        <div
          className="w-9 h-9 grid place-items-center text-white"
          style={{ borderRadius: 12, background: "linear-gradient(135deg, var(--accent), var(--accent-hover))" }}
        >
          <Sparkles size={18} />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-white leading-tight">{t("play.news.title")}</h2>
          <p className="text-xs text-white/40">{t("play.news.subtitle")}</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hover px-6 pb-6">
        {failed && <p className="text-sm text-white/50">{t("play.news.unreachable")}</p>}
        {!entries && !failed && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-white/[0.04] animate-skeleton-pulse" />
            ))}
          </div>
        )}
        {entries && (
          <ol className="relative border-l border-white/[0.08] ml-1.5">
            {entries.map((entry, index) => (
              <li key={entry.version} className="relative pl-5 pb-6 last:pb-0">
                <span
                  className="absolute -left-[5px] top-1.5 w-[9px] h-[9px] rounded-full"
                  style={{
                    background: index === 0 ? "var(--accent)" : "rgba(255,255,255,0.25)",
                    boxShadow: index === 0 ? "0 0 0 4px rgba(var(--accent-rgb),0.2)" : undefined,
                  }}
                />
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-display text-sm font-bold text-white">v{entry.version}</span>
                  {index === 0 && (
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                      style={{ background: "var(--accent)" }}
                    >
                      {t("play.news.latest")}
                    </span>
                  )}
                </div>
                <ul className="space-y-1.5">
                  {(german ? entry.de : entry.en).map((line) => (
                    <li key={line} className="text-[13px] leading-snug text-white/70">
                      {line}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}
