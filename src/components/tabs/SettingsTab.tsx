"use client";

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Bug,
  Clapperboard,
  FolderOpen,
  Loader2,
  Palette,
  RotateCw,
  Settings,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { Button } from ".././ui/buttons/Button";
import type { LauncherConfig } from "../../types/launcherConfig";
import * as ConfigService from "../../services/launcher-config-service";
import { useSettingsModalStore } from "../../store/settings-modal-store";
import { cn } from "../../lib/utils";
import { toast } from "react-hot-toast";
import { Modal } from ".././ui/Modal";
import { SearchWithFilters } from ".././ui/SearchWithFilters";
import { SettingsSearchContext } from ".././ui/settings/SettingsSearchContext";
import { openLauncherDirectory } from "../../services/tauri-service";
import { DebugSection, getDebugTabs } from "./DebugSection";
import { GeneralTab } from "./settings/GeneralTab";
import { AppearanceTab } from "./settings/AppearanceTab";
import { AdvancedTab } from "./settings/AdvancedTab";
import { ClipsTab } from "./settings/ClipsTab";
import { SettingsConfigProvider } from "./settings/settings-context";
import { useTranslation } from "react-i18next";
import { setDiscordState } from "../../utils/discordRpc";
import { parseErrorMessage } from "../../utils/error-utils";
import { useClipSettingsSync } from "../../hooks/useClipSettingsSync";
import { isMacOS, supportsClips } from "../../utils/platform";

type SettingsTabId = "general" | "appearance" | "clips" | "advanced" | "debug";

const SETTINGS_TAB_IDS: SettingsTabId[] = [
  "general",
  "appearance",
  "clips",
  "advanced",
  "debug",
];

interface SettingsTabProps {
  onClose: () => void;
}

export function SettingsTab({ onClose }: SettingsTabProps) {
  const { t } = useTranslation();
  const [config, setConfig] = useState<LauncherConfig | null>(null);
  const [tempConfig, setTempConfig] = useState<LauncherConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  useClipSettingsSync(config, saving);
  const requested = useSettingsModalStore.getState().tab;
  const [activeTab, setActiveTab] = useState<SettingsTabId>(() =>
    SETTINGS_TAB_IDS.includes(requested as SettingsTabId)
      ? (requested as SettingsTabId)
      : "general",
  );

  const onlyTab = useSettingsModalStore.getState().only
    ? (SETTINGS_TAB_IDS.includes(requested as SettingsTabId)
        ? (requested as SettingsTabId)
        : null)
    : null;

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(sidebarSearch), 150);
    return () => clearTimeout(id);
  }, [sidebarSearch]);
  const sidebarQuery = debouncedSearch.trim().toLowerCase();

  useEffect(() => { setDiscordState("Configuring Settings"); }, []);

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [activeTab, sidebarQuery]);


  const sectionDefs: Record<SettingsTabId, { id: string; label: string }[]> = {
    general: [
      { id: "language", label: t("settings.language") },
      { id: "behaviour", label: t("settings.sections.behaviour") },
      { id: "interface", label: t("settings.sections.downloads") },
    ],
    appearance: [
      { id: "accent", label: t("settings.accent_color.title") },
      { id: "theme", label: t("settings.theme.title") },
      { id: "font", label: t("settings.font.title") },
      { id: "ui", label: t("settings.sections.ui") },
      { id: "background", label: t("settings.background.title") },
      { id: "custom-background", label: t("settings.custom_background.title") },
    ],
    clips: supportsClips()
      ? [
          ...(isMacOS() ? [{ id: "clips-permissions", label: t("settings.clips.permissions.title") }] : []),
          { id: "clips-general", label: t("settings.clips.title") },
          { id: "clips-hotkeys", label: t("settings.clips.hotkeys.title") },
          { id: "clips-buffer", label: t("settings.clips.buffer.title") },
          { id: "clips-quality", label: t("settings.clips.quality.title") },
          { id: "clips-audio", label: t("settings.clips.audio.title") },
          { id: "clips-storage", label: t("settings.clips.storage.title") },
        ]
      : [],
    advanced: [
      { id: "login_cache", label: t("settings.sections.login_cache") },
      { id: "gamedir", label: t("settings.game_data_dir.title") },
      { id: "hooks", label: t("settings.hooks.title") },
      { id: "licenses", label: t("settings.licenses.title") },
    ],
    debug: getDebugTabs(t),
  };

  const allTabs: {
    id: SettingsTabId;
    label: string;
    description: string;
    icon: LucideIcon;
    children?: { id: string; label: string }[];
  }[] = [
    {
      id: "general",
      label: t("settings.tabs.general"),
      description: t("settings.tabs.general.description"),
      icon: Settings,
      children: sectionDefs.general,
    },
    {
      id: "appearance",
      label: t("settings.tabs.appearance"),
      description: t("settings.tabs.appearance.description"),
      icon: Palette,
      children: sectionDefs.appearance,
    },
    ...(supportsClips()
      ? [{
          id: "clips" as const,
          label: t("settings.tabs.clips"),
          description: t("settings.tabs.clips.description"),
          icon: Clapperboard,
          children: sectionDefs.clips,
        }]
      : []),
    {
      id: "advanced",
      label: t("settings.tabs.advanced"),
      description: t("settings.tabs.advanced.description"),
      icon: SlidersHorizontal,
      children: sectionDefs.advanced,
    },
    {
      id: "debug",
      label: t("settings.tabs.debug"),
      description: t("settings.tabs.debug.description"),
      icon: Bug,
      children: sectionDefs.debug,
    },
  ];

  const tabConfig = onlyTab ? allTabs.filter((tab) => tab.id === onlyTab) : allTabs;
  const currentTab = allTabs.find((tab) => tab.id === activeTab) ?? allTabs[0];

  const selectTab = (id: SettingsTabId) => {
    setSidebarSearch("");
    setActiveTab(id);
  };
  const contentRef = useRef<HTMLDivElement>(null);
  const sidebarListRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!activeSection) return;
    const el = sidebarListRef.current?.querySelector(`[data-section-id="${activeSection}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeSection]);

  const spySuppressRef = useRef(false);
  const spyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(`settings-section-${id}`);
    if (!el) return;
    spySuppressRef.current = true;
    setActiveSection(id);
    if (spyTimeoutRef.current) clearTimeout(spyTimeoutRef.current);
    spyTimeoutRef.current = setTimeout(() => {
      spySuppressRef.current = false;
    }, 500);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (sidebarQuery) return;
    const root = contentRef.current;
    const defs = sectionDefs[activeTab];
    if (!root || !defs?.length) {
      setActiveSection(null);
      return;
    }
    const onScroll = () => {
      if (spySuppressRef.current) return;
      const rootTop = root.getBoundingClientRect().top;
      const line = 80;
      let current = defs[0].id;
      for (const d of defs) {
        const el = document.getElementById(`settings-section-${d.id}`);
        if (!el) continue;
        if (el.getBoundingClientRect().top - rootTop <= line) current = d.id;
      }
      setActiveSection(current);
    };
    onScroll();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, sidebarQuery, config, tempConfig]);

  const isResettingRef = useRef<boolean>(false);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null); try {
      const loadedConfig = await ConfigService.getLauncherConfig();
      const configWithHooks = {
        ...loadedConfig,
        hooks: loadedConfig.hooks || {
          pre_launch: null,
          wrapper: null,
          post_exit: null,
        },
      };
      setConfig(configWithHooks);
      setTempConfig({ ...configWithHooks });
    } catch (err) {
      console.error("Failed to load launcher config:", err);
      setError(parseErrorMessage(err));
      setConfig(null);
      setTempConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const autoSaveConfig = useCallback(async (configToSave: LauncherConfig) => {
    if (isResettingRef.current) {
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        const updatedConfig =
          await ConfigService.setLauncherConfig(configToSave);
        setConfig(updatedConfig);
        toast.success(t("settings.toast.auto_saved"), {
          duration: 2000,
          position: "bottom-right",
        });
      } catch (err) {
        console.error("Failed to auto-save configuration:", err);
        const errorMessage = parseErrorMessage(err);
        toast.error(t("settings.toast.auto_save_failed", { error: errorMessage }));
      } finally {
        setSaving(false);
      }
    }, 500);
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (
      tempConfig &&
      config &&
      JSON.stringify(config) !== JSON.stringify(tempConfig)
    ) {
      autoSaveConfig(tempConfig);
    }
  }, [tempConfig, config, autoSaveConfig]);

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-2.5 h-24 text-[13px] text-fg-3">
          <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />
          {t("settings.loading")}
        </div>
      );
    }

    if (error) {
      return (
        <div
          className="flex items-start gap-3 border border-err/30 bg-err/10 p-4"
          style={{ borderRadius: "var(--r-md)" }}
        >
          <AlertTriangle size={16} strokeWidth={1.75} className="text-err flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h3 className="text-[13px] font-[560] text-fg">{t("settings.error.title")}</h3>
            <p className="font-mono text-xs text-fg-2 mt-1 break-words">{error}</p>
            <Button
              onClick={loadConfig}
              variant="secondary"
              size="sm"
              className="mt-3"
              icon={<RotateCw size={14} strokeWidth={1.75} />}
            >
              {t("common.try_again")}
            </Button>
          </div>
        </div>
      );
    }

    if (!config || !tempConfig) {
      return <p className="text-[13px] text-fg-3 py-6">{t("settings.error.no_config")}</p>;
    }

    const bodyOf: Partial<Record<SettingsTabId, ReactNode>> = {
      general: <GeneralTab />,
      appearance: <AppearanceTab />,
      clips: <ClipsTab />,
      advanced: <AdvancedTab />,
    };

    if (sidebarQuery && !onlyTab) {
      const order: SettingsTabId[] = ["general", "appearance", "advanced"];
      const ordered = [activeTab, ...order.filter((id) => id !== activeTab)].filter(
        (id) => bodyOf[id],
      ) as SettingsTabId[];
      return (
        <div className="space-y-8">
          {ordered.map((id) => (
            <Fragment key={id}>{bodyOf[id]}</Fragment>
          ))}
        </div>
      );
    }

    if (activeTab === "debug") return <DebugSection />;
    return bodyOf[activeTab] ?? null;
  };

  const searching = Boolean(sidebarQuery && !onlyTab);

  return (
    <Modal
      title={onlyTab ? tabConfig[0]?.label ?? t("nav.settings") : t("nav.settings")}
      titleIcon={<Settings size={16} strokeWidth={1.75} />}
      onClose={onClose}
      width="xl"
      className="!max-w-[1080px] h-[86vh] max-h-[780px] flex flex-col"
      contentClassName="!overflow-hidden"
      headerActions={
        <Button
          variant="ghost"
          size="sm"
          icon={<FolderOpen size={14} strokeWidth={1.75} />}
          title={t("settings.open_directory.tooltip")}
          onClick={async () => {
            try {
              await openLauncherDirectory();
            } catch (err) {
              console.error("Failed to open launcher directory:", err);
              toast.error(t("settings.open_directory.error", { error: parseErrorMessage(err) }));
            }
          }}
        >
          {t("settings.open_directory")}
        </Button>
      }
    >
      <div className="flex h-full min-h-0">
        {/* section list: a quiet text list, the active tab marked like the sidebar */}
        <aside className="w-[216px] flex-shrink-0 flex flex-col border-r border-line">
          <div className="px-3 pt-3 pb-2">
            <SearchWithFilters
              placeholder={t("common.search")}
              searchValue={sidebarSearch}
              onSearchChange={setSidebarSearch}
              showSort={false}
              showFilter={false}
              compact
              className="w-full"
            />
          </div>
          <nav ref={sidebarListRef} className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-3">
            {tabConfig.map((tab) => {
              const isActive = activeTab === tab.id;
              const TabIcon = tab.icon;
              return (
                <div key={tab.id} className="mb-px">
                  <button
                    type="button"
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group relative h-8 w-full flex items-center gap-2.5 pl-3 pr-2 text-left text-[13px] font-[520] outline-none",
                      "transition-colors duration-fast ease-out",
                      isActive && !searching ? "bg-s3 text-fg" : "text-fg-3 hover:text-fg-2 hover:bg-s2",
                    )}
                    style={{ borderRadius: "var(--r-sm)" }}
                    onClick={() => selectTab(tab.id)}
                  >
                    <span
                      className={cn(
                        "absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-accent transition-transform duration-med ease-out",
                        isActive && !searching ? "scale-y-100" : "scale-y-0",
                      )}
                    />
                    <TabIcon
                      size={16}
                      strokeWidth={1.75}
                      className={cn(
                        "flex-shrink-0",
                        isActive && !searching ? "text-fg" : "text-fg-3 group-hover:text-fg-2",
                      )}
                    />
                    <span className="flex-1 truncate">{tab.label}</span>
                  </button>

                  {isActive && !sidebarQuery && tab.children && tab.children.length > 0 && (
                    <div className="ml-[19px] mt-0.5 mb-2 flex flex-col border-l border-line">
                      {tab.children.map((child) => {
                        const childActive = activeSection === child.id;
                        return (
                          <button
                            type="button"
                            key={child.id}
                            data-section-id={child.id}
                            className={cn(
                              "w-full text-left -ml-px pl-3 pr-2 h-7 border-l outline-none truncate text-[12.5px]",
                              "transition-[color,border-color] duration-fast",
                              childActive
                                ? "border-fg-2 text-fg"
                                : "border-transparent text-fg-3 hover:text-fg-2",
                            )}
                            onClick={() => scrollToSection(child.id)}
                          >
                            {child.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        <div
          ref={contentRef}
          className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden custom-scrollbar"
        >
          <div className="max-w-[760px] px-8 pt-6 pb-12">
            <header className="mb-7">
              <h2 className="font-display text-[20px] font-[650] leading-tight text-fg">
                {searching ? t("settings.search_results") : currentTab.label}
              </h2>
              <p className="text-[13px] text-fg-3 mt-1">
                {searching ? `"${sidebarSearch.trim()}"` : currentTab.description}
              </p>
            </header>
            <SettingsConfigProvider value={{ config, tempConfig, setTempConfig, saving }}>
              <SettingsSearchContext.Provider value={sidebarQuery}>
                {renderTabContent()}
              </SettingsSearchContext.Provider>
            </SettingsConfigProvider>
          </div>
        </div>
      </div>
    </Modal>
  );
}
