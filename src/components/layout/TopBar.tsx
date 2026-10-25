"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { exit } from "@tauri-apps/plugin-process";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Minus,
  Settings,
  Square,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import * as ConfigService from "../../services/launcher-config-service";
import { checkUpdateAvailable, downloadAndInstallUpdate } from "../../services/nrc-service";
import { closeClipEditorThen } from "../../services/clip-service";
import { parseErrorMessage } from "../../utils/error-utils";
import type { UpdateInfo } from "../../types/updater";
import { PlayerHead } from "../common/PlayerHead";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { MinecraftAccountManager } from "../account/MinecraftAccountManager";
import { RunningInstancesIndicator } from "../process/RunningInstancesIndicator";
import { Tooltip } from "../ui/Tooltip";

export interface TopNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface TopBarProps {
  items: TopNavItem[];
  activeTab: string;
  onNavChange: (tabId: string) => void;
}

/** CrimeClient's title bar: raven + wordmark, the tab pills in the middle, account and window buttons on the right. */
export function TopBar({ items, activeTab, onNavChange }: TopBarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const activeRoot = activeTab.split("/")[0];

  return (
    <header
      className="relative z-20 h-16 flex-shrink-0 flex items-center gap-4 pl-4 pr-2"
      data-tauri-drag-region
    >
      <div className="flex items-center gap-3 min-w-[220px]" data-tauri-drag-region>
        <img src="/logo.png" alt="" className="w-9 h-9 object-contain drop-shadow-[0_4px_12px_rgba(232,49,74,0.45)]" draggable={false} />
        <div className="leading-none select-none" data-tauri-drag-region>
          <div className="font-display text-[17px] font-bold tracking-tight text-white" data-tauri-drag-region>
            Crime<span style={{ color: "var(--accent)" }}>Client</span>
          </div>
          <AppVersion />
        </div>
        <div className="flex items-center ml-2 text-white/40">
          <button
            className="cc-icon-btn"
            onClick={() => navigate(-1)}
            title={t("navigation.back", { defaultValue: "Zurück" })}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="cc-icon-btn"
            onClick={() => navigate(1)}
            title={t("navigation.forward", { defaultValue: "Vor" })}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex justify-center" data-tauri-drag-region>
        <NavPills items={items} active={activeRoot} onSelect={onNavChange} />
      </div>

      <div className="flex items-center gap-1.5 min-w-[220px] justify-end">
        <UpdateButton />
        <RunningInstancesIndicator />
        <AccountChip />
        <button
          className="cc-icon-btn w-9 h-9"
          onClick={() => onNavChange("settings")}
          title={t("nav.settings")}
        >
          <Settings size={18} />
        </button>
        <div className="w-px h-6 bg-white/10 mx-1" />
        <WindowControls />
      </div>
    </header>
  );
}

function NavPills({
  items,
  active,
  onSelect,
}: {
  items: TopNavItem[];
  active: string;
  onSelect: (id: string) => void;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const el = refs.current[active];
    setIndicator(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
  }, [active, items]);

  return (
    <nav className="relative flex items-center gap-1 p-1 rounded-full cc-glass">
      {indicator && (
        <span
          className="absolute top-1 bottom-1 rounded-full transition-all duration-300 ease-out"
          style={{
            left: indicator.left,
            width: indicator.width,
            background: "linear-gradient(180deg, var(--accent), var(--accent-hover))",
            boxShadow: "0 6px 20px -6px var(--accent-shadow), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
        />
      )}
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[item.id] = el;
            }}
            onClick={() => onSelect(item.id)}
            className={cn(
              "cc-free relative z-10 flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-semibold transition-colors",
              isActive ? "text-white" : "text-white/55 hover:text-white",
            )}
            style={{ borderRadius: 9999 }}
          >
            <Icon size={16} strokeWidth={2.2} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function AppVersion() {
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    ConfigService.getAppVersion()
      .then(setVersion)
      .catch(() => setVersion(null));
  }, []);
  return (
    <div className="text-[10px] font-medium text-white/35 mt-1 tracking-wide" data-tauri-drag-region>
      Launcher {version ? `v${version}` : ""}
    </div>
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
        onClick={install}
        className={cn(
          "cc-free flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white",
          busy && "animate-pulse cursor-not-allowed",
        )}
        style={{ borderRadius: 9999, background: "var(--accent)" }}
      >
        <Download size={14} />
        Update
      </button>
    </Tooltip>
  );
}

function AccountChip() {
  const { t } = useTranslation();
  const anchorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const activeAccount = useMinecraftAuthStore((s) => s.activeAccount);
  const accountCount = useMinecraftAuthStore((s) => s.accounts.length);

  // Removing the last account hands over to the welcome gate; don't leave the manager floating above it.
  useEffect(() => {
    if (accountCount === 0) setOpen(false);
  }, [accountCount]);

  const name = activeAccount?.minecraft_username || activeAccount?.username;

  return (
    <>
      <div ref={anchorRef}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="cc-free flex items-center gap-2 h-9 pl-1 pr-2.5 cc-glass hover:bg-white/10 transition-colors"
          style={{ borderRadius: 9999 }}
        >
          <span className="w-7 h-7 overflow-hidden" style={{ borderRadius: 9999 }}>
            <PlayerHead uuid={activeAccount?.id} username={name} size={28} overlay />
          </span>
          <span className="text-[13px] font-semibold text-white max-w-[120px] truncate">
            {name ?? t("account.not_logged_in", { defaultValue: "Nicht angemeldet" })}
          </span>
          <ChevronDown size={14} className={cn("text-white/50 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      <Dropdown ref={dropdownRef} isOpen={open} onClose={() => setOpen(false)} triggerRef={anchorRef} width={300}>
        <MinecraftAccountManager onClose={() => setOpen(false)} isInDropdown />
      </Dropdown>
    </>
  );
}

function WindowControls() {
  const { t } = useTranslation();

  const withWindow = async (fn: (w: import("@tauri-apps/api/window").Window) => Promise<void>) => {
    try {
      const { Window } = await import("@tauri-apps/api/window");
      await fn(Window.getCurrent());
    } catch (err) {
      console.error("Window control failed:", err);
    }
  };

  return (
    <div className="flex items-center">
      <button className="cc-window-btn" title={t("window.minimize")} onClick={() => withWindow((w) => w.minimize())}>
        <Minus size={16} />
      </button>
      <button className="cc-window-btn" title={t("window.maximize")} onClick={() => withWindow((w) => w.toggleMaximize())}>
        <Square size={13} />
      </button>
      <button
        className="cc-window-btn hover:!bg-[#e8314a] hover:!text-white"
        title={t("window.close")}
        onClick={() => closeClipEditorThen(() => exit(0)).catch(() => exit(0))}
      >
        <X size={17} />
      </button>
    </div>
  );
}
