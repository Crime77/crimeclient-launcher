"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";

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
}

/** Right-hand panel on the play tab: what is new in CrimeClient (replaces NoRisk's blog news). */
export function CrimeNews({ className }: CrimeNewsProps) {
  const { i18n } = useTranslation();
  const accentColor = useThemeStore((state) => state.accentColor);
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
    <div className={cn(className)}>
      <div className="flex items-center gap-3 mb-4">
        <Icon icon="solar:document-text-bold" className="w-7 h-7" style={{ color: accentColor.value }} />
        <h2 className="font-minecraft text-2xl lowercase text-white">{german ? "Neu im Client" : "What's new"}</h2>
      </div>
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
        {failed && (
          <p className="font-minecraft text-xl text-white/60">
            {german ? "Changelog gerade nicht erreichbar." : "Changelog not reachable right now."}
          </p>
        )}
        {!entries && !failed && (
          <p className="font-minecraft text-xl text-white/60">{german ? "Lädt …" : "Loading …"}</p>
        )}
        {entries?.map((entry, index) => (
          <div
            key={entry.version}
            className="rounded-lg border p-3 bg-black/30"
            style={{ borderColor: index === 0 ? `${accentColor.value}aa` : `${accentColor.value}33` }}
          >
            <span
              className="inline-block font-minecraft text-lg px-2 rounded mb-2 text-white"
              style={{ backgroundColor: index === 0 ? accentColor.value : `${accentColor.value}55` }}
            >
              v{entry.version}
            </span>
            <ul className="space-y-1.5">
              {(german ? entry.de : entry.en).map((line) => (
                <li key={line} className="font-minecraft text-lg leading-tight text-white/85 flex gap-2">
                  <span style={{ color: accentColor.value }}>•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
