"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { exit } from "@tauri-apps/plugin-process";
import { ArrowLeft, ArrowRight, Copy, Minus, Square, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { checkUpdateAvailable, downloadAndInstallUpdate } from "../../services/nrc-service";
import { closeClipEditorThen } from "../../services/clip-service";
import { parseErrorMessage } from "../../utils/error-utils";
import type { UpdateInfo } from "../../types/updater";
import { RunningInstancesIndicator } from "../process/RunningInstancesIndicator";
import { Tooltip } from "../ui/Tooltip";

interface TopBarProps {
  /** Shown left, after the history arrows */
  title: string;
  /** Optional second part, e.g. the open profile */
  subtitle?: string;
}

/** 36 px title bar over the page: history, page title, drag area, update, running games, window buttons. */
export function TopBar({ title, subtitle }: TopBarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <header
      className="relative z-20 h-10 flex-shrink-0 flex items-center gap-2 pl-3 border-b border-line bg-bg"
      data-tauri-drag-region
    >
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className="cc-icon-btn"
          onClick={() => navigate(-1)}
          title={t("navigation.back", { defaultValue: "Zurück" })}
        >
          <ArrowLeft size={15} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="cc-icon-btn"
          onClick={() => navigate(1)}
          title={t("navigation.forward", { defaultValue: "Vor" })}
        >
          <ArrowRight size={15} strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex items-baseline gap-2 min-w-0 pl-1 select-none" data-tauri-drag-region>
        <span className="text-[13px] font-[600] text-fg truncate" data-tauri-drag-region>
          {title}
        </span>
        {subtitle && (
          <>
            <span className="text-fg-4 text-[13px]" data-tauri-drag-region>
              /
            </span>
            <span className="text-[13px] text-fg-3 truncate" data-tauri-drag-region>
              {subtitle}
            </span>
          </>
        )}
      </div>

      <div className="flex-1 self-stretch" data-tauri-drag-region />

      <div className="flex items-center gap-1.5 pr-1">
        <UpdateButton />
        <RunningInstancesIndicator />
      </div>
      <WindowControls />
    </header>
  );
}

function UpdateButton() {
  const { t } = useTranslation();
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const check = () =>
      checkUpdateAvailable()
        .then((info) => info && setUpdate(info))
        .catch((err) => console.error("Failed to check for updates:", err));
    check();
    const timer = setInterval(check, 4 * 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  if (!update) return null;

  const install = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await toast.promise(downloadAndInstallUpdate(), {
        loading: t("header.update.downloading"),
        success: t("header.update.success"),
        error: (err) => t("header.update.failed", { error: parseErrorMessage(err) }),
      });
    } catch (err) {
      console.error("Failed to download and install update:", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Tooltip
      content={
        busy
          ? t("header.update.tooltip_updating")
          : t("header.update.tooltip_available", { version: update.version })
      }
    >
      <button
        type="button"
        onClick={install}
        className={cn(
          "flex items-center gap-2 h-7 px-2.5 text-xs font-[560] text-fg bg-s2 border border-line-2 hover:bg-s3 transition-colors duration-fast",
          busy && "cursor-progress",
        )}
        style={{ borderRadius: "var(--r-sm)" }}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full bg-accent", busy && "animate-pulse")} />
        Update
        <span className="cc-num text-fg-3">{update.version}</span>
      </button>
    </Tooltip>
  );
}

function WindowControls() {
  const { t } = useTranslation();
  const [maximized, setMaximized] = useState(false);

  const withWindow = async (fn: (w: import("@tauri-apps/api/window").Window) => Promise<void>) => {
    try {
      const { Window } = await import("@tauri-apps/api/window");
      await fn(Window.getCurrent());
    } catch (err) {
      console.error("Window control failed:", err);
    }
  };

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    withWindow(async (w) => {
      setMaximized(await w.isMaximized());
      unlisten = await w.onResized(async () => setMaximized(await w.isMaximized()));
    });
    return () => unlisten?.();
  }, []);

  return (
    <div className="flex items-stretch self-stretch">
      <button type="button" className="cc-window-btn h-full" title={t("window.minimize")} onClick={() => withWindow((w) => w.minimize())}>
        <Minus size={15} strokeWidth={1.5} />
      </button>
      <button
        type="button"
        className="cc-window-btn h-full"
        title={t("window.maximize")}
        onClick={() => withWindow((w) => w.toggleMaximize())}
      >
        {maximized ? <Copy size={12} strokeWidth={1.5} className="-scale-x-100" /> : <Square size={12} strokeWidth={1.5} />}
      </button>
      <button
        type="button"
        className="cc-window-btn is-close h-full"
        title={t("window.close")}
        onClick={() => closeClipEditorThen(() => exit(0)).catch(() => exit(0))}
      >
        <X size={16} strokeWidth={1.5} />
      </button>
    </div>
  );
}
