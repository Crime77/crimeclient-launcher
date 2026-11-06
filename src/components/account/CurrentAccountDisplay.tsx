"use client";

import { ChevronDown, Plus } from "lucide-react";
import { cn } from "../../lib/utils";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { PlayerHead } from "../common/PlayerHead";
import { useEntranceAnimation } from "../../hooks/useEntranceAnimation";

interface CurrentAccountDisplayProps {
  onClick?: () => void;
  className?: string;
  compact?: boolean;
  /** kept for old call sites; both variants are the same flat chip now */
  variant?: "default" | "flat";
}

/** The signed-in account as a flat chip: head, name, a chevron for the switcher. */
export function CurrentAccountDisplay({
  onClick,
  className,
  compact = false,
}: CurrentAccountDisplayProps) {
  const { activeAccount } = useMinecraftAuthStore();
  const { t } = useTranslation();
  const buttonRef = useRef<HTMLDivElement>(null);
  useEntranceAnimation(
    buttonRef,
    { opacity: 0 },
    { opacity: 1, duration: 0.2, ease: "power2.out" },
  );

  const chip = cn(
    "h-8 inline-flex items-center gap-2 pl-1 pr-2 bg-s2 border border-line text-fg cursor-pointer select-none",
    "transition-colors duration-fast ease-out hover:bg-s3 hover:border-line-2",
    className,
  );

  if (!activeAccount) {
    return (
      <div ref={buttonRef} className={chip} onClick={onClick} style={{ borderRadius: "var(--r-md)" }}>
        <span className="w-6 h-6 flex items-center justify-center bg-s3 text-fg-3" style={{ borderRadius: "var(--r-sm)" }}>
          <Plus size={14} strokeWidth={1.75} />
        </span>
        <span className="text-[13px]">{t('auth.addAccount')}</span>
        <ChevronDown size={14} strokeWidth={1.75} className="text-fg-3 flex-shrink-0" />
      </div>
    );
  }

  const username =
    activeAccount.minecraft_username || activeAccount.username || t('auth.unknown');

  return (
    <div ref={buttonRef} className={chip} onClick={onClick} style={{ borderRadius: "var(--r-md)" }}>
      <span className="w-6 h-6 flex-shrink-0 overflow-hidden bg-s3" style={{ borderRadius: "var(--r-sm)" }}>
        <PlayerHead uuid={activeAccount.id} username={username} size={24} fill />
      </span>

      {!compact && (
        <span className="text-[13px] font-[520] truncate max-w-[160px]" title={username}>
          {username}
        </span>
      )}

      <ChevronDown size={14} strokeWidth={1.75} className="text-fg-3 flex-shrink-0" />
    </div>
  );
}
