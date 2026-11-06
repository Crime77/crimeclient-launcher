"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronsUpDown, Settings, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import * as ConfigService from "../../services/launcher-config-service";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { PlayerHead } from "../common/PlayerHead";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { MinecraftAccountManager } from "../account/MinecraftAccountManager";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SideNavProps {
  items: NavItem[];
  activeTab: string;
  onNavChange: (tabId: string) => void;
}

/** Fixed left navigation: wordmark, the pages (Ctrl+1..n), account, settings and the launcher version. */
export function SideNav({ items, activeTab, onNavChange }: SideNavProps) {
  const { t } = useTranslation();
  const activeRoot = normalizeRoot(activeTab);

  return (
    <aside className="relative z-20 w-[208px] flex-shrink-0 flex flex-col bg-s1 border-r border-line">
      <div className="h-10 flex items-center gap-2.5 px-4 flex-shrink-0 border-b border-transparent" data-tauri-drag-region>
        <img src="/logo.png" alt="" className="w-[22px] h-[22px] object-contain" draggable={false} data-tauri-drag-region />
        <span
          className="font-display text-[15px] font-[680] tracking-[-0.01em] text-fg leading-none select-none"
          style={{ fontStretch: "118%" }}
          data-tauri-drag-region
        >
          CrimeClient
        </span>
      </div>

      <nav className="flex flex-col gap-px px-2 pt-2">
        {items.map((item, index) => (
          <NavButton
            key={item.id}
            item={item}
            active={item.id === activeRoot}
            shortcut={index < 9 ? `${index + 1}` : undefined}
            onClick={() => onNavChange(item.id)}
          />
        ))}
      </nav>

      <div className="flex-1" data-tauri-drag-region />

      <div className="px-2 pb-2 flex flex-col gap-px">
        <NavButton
          item={{ id: "settings", label: t("nav.settings"), icon: Settings }}
          active={activeRoot === "settings"}
          onClick={() => onNavChange("settings")}
        />
        <div className="h-px bg-line mx-1 my-2" />
        <AccountRow />
        <AppVersion />
      </div>
    </aside>
  );
}

/** profilesv2/... and profiles/... are the same page in the navigation. */
function normalizeRoot(tab: string): string {
  const root = tab.split("/")[0];
  return root === "profilesv2" ? "profiles" : root;
}

function NavButton({
  item,
  active,
  shortcut,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  shortcut?: string;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative h-8 w-full flex items-center gap-2.5 pl-3 pr-2 text-left text-[13px] font-[520]",
        "transition-colors duration-fast ease-out",
        active ? "bg-s3 text-fg" : "text-fg-3 hover:text-fg-2 hover:bg-s2",
      )}
      style={{ borderRadius: "var(--r-sm)" }}
    >
      <span
        className={cn(
          "absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-accent transition-transform duration-med ease-out origin-center",
          active ? "scale-y-100" : "scale-y-0",
        )}
      />
      <Icon size={16} strokeWidth={1.75} className={cn("flex-shrink-0", active ? "text-fg" : "text-fg-3 group-hover:text-fg-2")} />
      <span className="flex-1 truncate">{item.label}</span>
      {shortcut && (
        <span className="cc-num text-[10.5px] text-fg-4 opacity-0 group-hover:opacity-100 transition-opacity duration-fast">
          ^{shortcut}
        </span>
      )}
    </button>
  );
}

function AccountRow() {
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
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "w-full h-10 flex items-center gap-2.5 px-2 text-left transition-colors duration-fast",
            open ? "bg-s3" : "hover:bg-s2",
          )}
          style={{ borderRadius: "var(--r-sm)" }}
        >
          <span className="w-6 h-6 flex-shrink-0 overflow-hidden bg-s3" style={{ borderRadius: "var(--r-sm)" }}>
            <PlayerHead uuid={activeAccount?.id} username={name} size={24} overlay />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-[560] text-fg truncate leading-tight">
              {name ?? t("account.not_logged_in", { defaultValue: "Nicht angemeldet" })}
            </span>
            <span className="block text-[11px] text-fg-3 leading-tight">{t("nav.account", { defaultValue: "Account" })}</span>
          </span>
          <ChevronsUpDown size={14} className="text-fg-3 flex-shrink-0" />
        </button>
      </div>
      <Dropdown
        ref={dropdownRef}
        isOpen={open}
        onClose={() => setOpen(false)}
        triggerRef={anchorRef}
        width={300}
        position="top"
        align="start"
        offset={6}
      >
        <MinecraftAccountManager onClose={() => setOpen(false)} isInDropdown />
      </Dropdown>
    </>
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
    <div className="px-2 pt-2 pb-1 flex items-center justify-between text-[10.5px] text-fg-4 select-none">
      <span>Launcher</span>
      <span className="cc-num">{version ? `v${version}` : "–"}</span>
    </div>
  );
}
