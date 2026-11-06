"use client";

/**
 * ProfileLeftRailV3 — the navigation of the detail view: one quiet text list in two groups
 * (content types, world). The active entry gets s3 and the 2px accent bar, like the SideNav.
 */

import type React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/utils";
import type { Profile } from "../../../types/profile";

export type NavKey =
  | "mods" | "resourcepacks" | "shaderpacks" | "datapacks" | "nrc"
  | "crime_shader" | "worlds" | "screenshots" | "logs";

export const CONTENT_NAV_KEYS: NavKey[] = ["mods", "resourcepacks", "shaderpacks", "datapacks", "nrc"];

interface NavItem {
  key: NavKey;
  labelKey: string;
  count?: number;
}

interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

interface ProfileLeftRailV3Props {
  profile: Profile;
  activeNavItem: NavKey;
  onNavChange: (k: NavKey) => void;
}

export function ProfileLeftRailV3({ profile, activeNavItem, onNavChange }: ProfileLeftRailV3Props) {
  const { t } = useTranslation();

  const modCount = profile.mod_count ?? profile.mods?.length ?? 0;

  const groups: NavGroup[] = [
    {
      labelKey: "profiles.tabs.content",
      items: [
        { key: "mods",          labelKey: "profiles.content.mods",          count: modCount },
        { key: "resourcepacks", labelKey: "profiles.content.resourcePacks" },
        { key: "shaderpacks",   labelKey: "profiles.content.shaderPacks" },
        { key: "datapacks",     labelKey: "profiles.content.dataPacks" },
        { key: "nrc",           labelKey: "profiles.content.noriskClient" },
        // CrimeClient Rust: Photon's options (tabs/CrimeShaderTabV3.tsx)
        ...(profile.game === "horizon"
          ? [{ key: "crime_shader" as const, labelKey: "profiles.content.crimeShader" }]
          : []),
      ],
    },
    {
      labelKey: "profiles.v3.leftRail.world",
      items: [
        { key: "worlds",      labelKey: "profiles.tabs.worlds" },
        { key: "screenshots", labelKey: "profiles.tabs.screenshots" },
        { key: "logs",        labelKey: "profiles.tabs.logs" },
      ],
    },
  ];

  return (
    <nav className="w-[184px] flex-shrink-0 border-r border-line overflow-y-auto no-scrollbar px-2 pt-4 pb-4 flex flex-col gap-5">
      {groups.map((group, gi) => (
        <div key={gi}>
          <div className="cc-eyebrow px-3 mb-1.5">{t(group.labelKey)}</div>
          <div className="flex flex-col gap-px">
            {group.items.map((item) => (
              <NavButton
                key={item.key}
                active={item.key === activeNavItem}
                label={t(item.labelKey)}
                count={item.count}
                onClick={() => onNavChange(item.key)}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

interface NavButtonProps {
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ label, count, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={active ? "page" : undefined}
    className={cn(
      "group relative h-8 w-full flex items-center gap-2 pl-3 pr-2 text-left text-[13px] font-[520]",
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
    <span className="flex-1 truncate">{label}</span>
    {typeof count === "number" && count > 0 && (
      <span className={cn("cc-num text-[11px]", active ? "text-fg-3" : "text-fg-4")}>{count}</span>
    )}
  </button>
);
