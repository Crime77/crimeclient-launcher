"use client";

import type { ReactNode } from "react";
import { ArrowRight, FilePlus, FileUp, Layers, Package } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "../../lib/utils";

export type ProfileSource = "blank" | "modpack" | "file" | "launcher";

interface ProfileSourceChooserProps {
  onChoose: (source: ProfileSource) => void;
  isBusy?: boolean;
}

const ICON = { size: 16, strokeWidth: 1.75 } as const;

const IMPORT_SOURCES: { id: Exclude<ProfileSource, "blank">; icon: ReactNode }[] = [
  { id: "modpack", icon: <Package {...ICON} /> },
  { id: "file", icon: <FileUp {...ICON} /> },
  { id: "launcher", icon: <Layers {...ICON} /> },
];

export function ProfileSourceChooser({ onChoose, isBusy = false }: ProfileSourceChooserProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 px-5 py-5">
      <button
        type="button"
        onClick={() => onChoose("blank")}
        disabled={isBusy}
        className="group flex w-full items-center gap-4 px-4 py-4 text-left bg-s2 border border-line-2 hover:bg-s3 hover:border-line-3 transition-colors duration-fast disabled:opacity-50"
        style={{ borderRadius: "var(--r-lg)" }}
      >
        <span
          className="grid place-items-center w-10 h-10 flex-shrink-0 bg-s3 border border-line-2 text-fg-2 group-hover:text-fg"
          style={{ borderRadius: "var(--r-md)" }}
        >
          <FilePlus size={18} strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-fg">
            {t("profiles.import.source_blank_title")}
          </span>
          <span className="mt-0.5 block text-[12.5px] leading-relaxed text-fg-3">
            {t("profiles.import.source_blank_description")}
          </span>
        </span>
        <ArrowRight
          size={16}
          strokeWidth={1.75}
          className="flex-shrink-0 text-fg-4 transition-colors group-hover:text-fg-2"
        />
      </button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <span className="cc-eyebrow">{t("profiles.import.source_divider")}</span>
        <div className="h-px flex-1 bg-line" />
      </div>

      <div
        className="overflow-hidden border border-line divide-y divide-line"
        style={{ borderRadius: "var(--r-lg)" }}
      >
        {IMPORT_SOURCES.map((source) => (
          <button
            key={source.id}
            type="button"
            onClick={() => onChoose(source.id)}
            disabled={isBusy}
            className={cn(
              "group flex w-full items-center gap-3 px-4 h-14 text-left bg-s2 transition-colors duration-fast",
              "hover:bg-s3 disabled:opacity-50",
            )}
          >
            <span className="flex-shrink-0 text-fg-3 transition-colors group-hover:text-fg">{source.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-fg-2 group-hover:text-fg">
                {t(`profiles.import.source_${source.id}_title`)}
              </span>
              <span className="block truncate text-[12px] text-fg-4">
                {t(`profiles.import.source_${source.id}_description`)}
              </span>
            </span>
            <ArrowRight
              size={14}
              strokeWidth={1.75}
              className="flex-shrink-0 text-fg-4 opacity-0 transition-opacity group-hover:opacity-100"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
