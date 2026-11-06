import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";
import { cn } from "../../lib/utils";

const appWindow = getCurrentWindow();

interface WindowTitleBarProps {
  title: string;
  /** second part after a slash, e.g. the account */
  subtitle?: string;
  /** sits between the title and the window buttons (status, progress) */
  children?: ReactNode;
  /** placed right after the logo, before the title (e.g. a menu bar) */
  lead?: ReactNode;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose: () => void;
  closeDisabled?: boolean;
  className?: string;
}

/** 40 px title bar of the separate windows, the same shape as the main window's TopBar. */
export function WindowTitleBar({
  title,
  subtitle,
  children,
  lead,
  onMinimize,
  onMaximize,
  onClose,
  closeDisabled = false,
  className,
}: WindowTitleBarProps) {
  const { t } = useTranslation();

  return (
    <header
      className={cn(
        "relative z-20 flex h-10 flex-shrink-0 select-none items-center border-b border-line bg-bg pl-3",
        className,
      )}
      data-tauri-drag-region
    >
      <img
        src="/logo.png"
        alt=""
        draggable={false}
        className="pointer-events-none h-4 w-4 flex-shrink-0 object-contain"
      />
      {lead}
      <div className="pointer-events-none flex min-w-0 items-baseline gap-2 pl-2.5">
        <span className="truncate text-[13px] font-[600] text-fg">{title}</span>
        {subtitle && (
          <>
            <span className="text-[13px] text-fg-4">/</span>
            <span className="truncate text-[13px] text-fg-3">{subtitle}</span>
          </>
        )}
      </div>

      <div className="flex-1 self-stretch" data-tauri-drag-region />

      {children}

      <div className="flex items-stretch self-stretch">
        {onMinimize && (
          <button type="button" className="cc-window-btn h-full" title={t("window.minimize")} onClick={onMinimize}>
            <Minus size={15} strokeWidth={1.5} />
          </button>
        )}
        {onMaximize && (
          <button type="button" className="cc-window-btn h-full" title={t("window.maximize")} onClick={onMaximize}>
            <Square size={12} strokeWidth={1.5} />
          </button>
        )}
        <button
          type="button"
          className="cc-window-btn is-close h-full disabled:pointer-events-none disabled:opacity-40"
          title={t("window.close")}
          onClick={onClose}
          disabled={closeDisabled}
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}

interface LogWindowTitlebarProps {
  title?: string;
  subtitle?: string;
}

export function LogWindowTitlebar({ title, subtitle }: LogWindowTitlebarProps) {
  const { t } = useTranslation();
  const displayTitle = title || t("logs.window_title");

  return (
    <WindowTitleBar
      title={displayTitle}
      subtitle={subtitle}
      onMinimize={() => appWindow.minimize()}
      onMaximize={() => appWindow.toggleMaximize()}
      onClose={() => appWindow.close()}
    />
  );
}
