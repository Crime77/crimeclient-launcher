"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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

/** What is new in CrimeClient: versions in mono, the changes as plain lines. */
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
    <aside className={cn("flex flex-col min-h-0", className)} style={style}>
      <div className="flex items-baseline justify-between px-6 pt-5 pb-3 flex-shrink-0">
        <h2 className="cc-eyebrow">{t("play.news.title")}</h2>
        <span className="text-[11px] text-fg-4">{t("play.news.subtitle")}</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hover px-6 pb-6">
        {failed && <p className="text-[13px] text-fg-3">{t("play.news.unreachable")}</p>}
        {!entries && !failed && (
          <div className="space-y-5 pt-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-14 bg-s3 animate-skeleton-pulse" style={{ borderRadius: 2 }} />
                <div className="h-2.5 w-full bg-s2 animate-skeleton-pulse" style={{ borderRadius: 2 }} />
                <div className="h-2.5 w-4/5 bg-s2 animate-skeleton-pulse" style={{ borderRadius: 2 }} />
              </div>
            ))}
          </div>
        )}
        {entries && (
          <ol className="divide-y divide-line">
            {entries.map((entry, index) => (
              <li key={entry.version} className="py-4 first:pt-1">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className={cn("cc-num text-[13px] font-[600]", index === 0 ? "text-fg" : "text-fg-2")}>
                    {entry.version}
                  </span>
                  {index === 0 && (
                    <span className="text-[10.5px] font-[600] uppercase tracking-[0.06em] text-fg-3">
                      {t("play.news.latest")}
                    </span>
                  )}
                </div>
                <ul className="space-y-1.5">
                  {(german ? entry.de : entry.en).map((line) => (
                    <li key={line} className="flex gap-2.5 text-[13px] leading-[1.45] text-fg-2">
                      <span className="text-fg-4 select-none">–</span>
                      <span className="min-w-0">{line}</span>
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
