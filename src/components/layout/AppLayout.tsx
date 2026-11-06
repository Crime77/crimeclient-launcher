"use client";

import { type ReactNode, useEffect, useMemo } from "react";
import { Clapperboard, Gem, Layers, Play, Puzzle, Shirt } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SideNav, type NavItem } from "./SideNav";
import { TopBar } from "./TopBar";
import { BACKGROUND_EFFECTS, useBackgroundEffectStore } from "../../store/background-effect-store";
import { GridBackground } from "../effects/GridBackground";
import CustomMediaBackground from "../effects/CustomMediaBackground";
import { Snowfall } from "../../features/snow-effect/Snowfall";
import { useSnowEffectStore } from "../../store/snow-effect-store";
import { useLauncherTheme } from "../../hooks/useLauncherTheme";
import { useClipsStore } from "../../store/clips-store";
import { useProfileStore } from "../../store/profile-store";
import { ProfileWizardV2Modal } from "../modals/ProfileWizardV2Modal";
import { ProfileSettingsModal } from "../modals/ProfileSettingsModal";
import { SettingsModal } from "../modals/SettingsModal";
import { ProfileDuplicateModal } from "../modals/ProfileDuplicateModal";

interface AppLayoutProps {
  children: ReactNode;
  activeTab: string;
  onNavChange: (tabId: string) => void;
}

const IS_LINUX = typeof navigator !== "undefined" && /linux/i.test(navigator.userAgent) && !/android/i.test(navigator.userAgent);

/** The window: fixed navigation on the left, title bar and page on the right, everything on the flat background. */
export function AppLayout({ children, activeTab, onNavChange }: AppLayoutProps) {
  const { t } = useTranslation();
  const { currentEffect, customMediaUrl, customMediaOnlyOnPlay, customMediaHideEffects } = useBackgroundEffectStore();
  const isCustomMediaVisible = Boolean(customMediaUrl) && (!customMediaOnlyOnPlay || activeTab === "play");
  const shouldShowEffects = !(isCustomMediaVisible && customMediaHideEffects);
  const { isEnabled: isSnowEnabled } = useSnowEffectStore();
  const { selectedTheme, isThemeActive } = useLauncherTheme();

  const clipsEnabled = useClipsStore((state) => state.enabled);
  const refreshClips = useClipsStore((state) => state.refresh);
  useEffect(() => {
    void refreshClips();
  }, [refreshClips]);

  const navItems: NavItem[] = useMemo(
    () => [
      { id: "play", icon: Play, label: t("nav.play") },
      { id: "profiles", icon: Layers, label: t("nav.profiles") },
      { id: "mods", icon: Puzzle, label: t("nav.mods") },
      { id: "skins", icon: Shirt, label: t("nav.skins") },
      { id: "shop", icon: Gem, label: t("nav.shop") },
      ...(clipsEnabled && !IS_LINUX ? [{ id: "clips", icon: Clapperboard, label: t("nav.clips") }] : []),
    ],
    [t, clipsEnabled],
  );

  // Ctrl+1 ... Ctrl+n switch pages (shown in the navigation on hover)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      const index = Number.parseInt(e.key, 10) - 1;
      if (Number.isNaN(index) || index < 0 || index >= navItems.length) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      e.preventDefault();
      onNavChange(navItems[index].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navItems, onNavChange]);

  const segments = activeTab.split("/");
  const root = segments[0] === "profilesv2" ? "profiles" : segments[0];
  const profiles = useProfileStore((s) => s.profiles);
  const title = useMemo(() => {
    const item = navItems.find((n) => n.id === root);
    if (item) return item.label;
    if (root === "settings") return t("nav.settings");
    return root ? root.charAt(0).toUpperCase() + root.slice(1).replace(/-/g, " ") : t("nav.play");
  }, [navItems, root, t]);
  const subtitle = useMemo(() => {
    if (root === "profiles" && segments[1]) return profiles.find((p) => p.id === segments[1])?.name;
    return undefined;
  }, [root, segments, profiles]);

  const themeImage = isThemeActive && selectedTheme?.backgroundImage && activeTab === "play" ? selectedTheme.backgroundImage : null;

  return (
    <div className="h-screen w-full overflow-hidden relative flex bg-bg text-fg">
      <SideNav items={navItems} activeTab={activeTab} onNavChange={onNavChange} />

      <div className="relative flex-1 min-w-0 flex flex-col">
        {/* page background: own image/video, launcher theme image or the grid; everything else is flat */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <CustomMediaBackground activeTab={activeTab} />
          {themeImage && (
            <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${themeImage})` }} />
          )}
          {shouldShowEffects && !themeImage && currentEffect === BACKGROUND_EFFECTS.GRID && <GridBackground />}
          {shouldShowEffects && isSnowEnabled && <Snowfall />}
        </div>

        <TopBar title={title} subtitle={subtitle} />

        <main className="relative z-10 flex-1 min-h-0">
          <div key={root} className="cc-enter h-full overflow-hidden">
            {children}
          </div>
        </main>
      </div>

      {IS_LINUX && <ResizeEdges />}

      {/* Global Modals Portal */}
      <ProfileWizardV2Modal />
      <ProfileSettingsModal />
      <SettingsModal />
      <ProfileDuplicateModal />
    </div>
  );
}

type ResizeDirection = "North" | "South" | "East" | "West" | "NorthEast" | "NorthWest" | "SouthEast" | "SouthWest";

/** The window has no system frame; on Linux the compositor gives no resize edges either, so draw invisible ones. */
function ResizeEdges() {
  const start = (direction: ResizeDirection) => async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().startResizeDragging(direction);
    } catch (err) {
      console.error("Resize failed:", err);
    }
  };
  const edge = "fixed z-[2000]";
  return (
    <>
      <div className={`${edge} top-0 left-2 right-2 h-1 cursor-n-resize`} onMouseDown={start("North")} />
      <div className={`${edge} bottom-0 left-2 right-2 h-1 cursor-s-resize`} onMouseDown={start("South")} />
      <div className={`${edge} left-0 top-2 bottom-2 w-1 cursor-w-resize`} onMouseDown={start("West")} />
      <div className={`${edge} right-0 top-2 bottom-2 w-1 cursor-e-resize`} onMouseDown={start("East")} />
      <div className={`${edge} top-0 left-0 w-2 h-2 cursor-nw-resize`} onMouseDown={start("NorthWest")} />
      <div className={`${edge} top-0 right-0 w-2 h-2 cursor-ne-resize`} onMouseDown={start("NorthEast")} />
      <div className={`${edge} bottom-0 left-0 w-2 h-2 cursor-sw-resize`} onMouseDown={start("SouthWest")} />
      <div className={`${edge} bottom-0 right-0 w-2 h-2 cursor-se-resize`} onMouseDown={start("SouthEast")} />
    </>
  );
}
