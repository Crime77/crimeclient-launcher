"use client";

import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";

import { useAppDragDropStore, type DragHoverKind } from "../../store/appStore";
import { cn } from "../../lib/utils";

const MAX_NAMED_FILES = 3;

const KIND_ICON: Record<DragHoverKind, string> = {
  modpack: "solar:box-bold",
  content: "solar:widget-add-bold",
  world: "solar:planet-bold",
  unsupported: "solar:close-circle-bold",
};

export function DragDropOverlay() {
  const { t } = useTranslation();
  const dragHover = useAppDragDropStore((state) => state.dragHover);

  if (!dragHover) return null;

  const { kind, fileNames } = dragHover;
  const rejected = kind === "unsupported";

  const named = fileNames.slice(0, MAX_NAMED_FILES);
  const remaining = fileNames.length - named.length;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-8 pointer-events-none bg-black/60 animate-in fade-in-0 duration-150"
    >
      <div
        className={cn(
          "cc-pop flex flex-col items-center gap-3 px-12 py-9 min-w-[340px] bg-s1 border border-dashed shadow-pop",
          rejected ? "border-err/50" : "border-line-3",
        )}
        style={{ borderRadius: "var(--r-lg)" }}
      >
        <Icon icon={KIND_ICON[kind]} className={cn("w-7 h-7", rejected ? "text-err" : "text-fg-2")} />

        <p className="font-display text-lg font-[620] text-fg text-center">
          {t(`dragdrop.overlay.${kind}`)}
        </p>

        {named.length > 0 && (
          <div className="flex flex-col items-center gap-1">
            {named.map((name) => (
              <span
                key={name}
                className="cc-num text-xs text-fg-3 break-all text-center max-w-md"
              >
                {name}
              </span>
            ))}
            {remaining > 0 && (
              <span className="text-xs text-fg-4">
                {t("dragdrop.overlay.more_files", { count: remaining })}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
