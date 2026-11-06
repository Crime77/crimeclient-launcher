"use client";

import { useEffect, useState } from "react";
import {
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
} from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ThemeInitializer } from "./components/ThemeInitializer";
import { ScrollbarProvider } from "./components/ui/ScrollbarProvider";
import { GlobalToaster } from "./components/ui/GlobalToaster";
import { type Event as TauriEvent, listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "react-hot-toast";
import {
  type EventPayload as FrontendEventPayload,
  EventType as FrontendEventType,
  type MinecraftProcessExitedPayload,
} from "./types/events";
import { GlobalCrashReportModal } from "./components/modals/GlobalCrashReportModal";
import { ImportPackConfirmModal } from "./components/modals/ImportPackConfirmModal";
import { DragDropOverlay } from "./components/ui/DragDropOverlay";
import { MacCapturePermissionMonitor } from "./components/clips/MacCapturePermissionMonitor";
import { GlobalModalPortal } from "./components/ui/GlobalModalPortal";
import { useCrashModalStore } from "./store/crash-modal-store";
import { useLaunchStateStore } from "./store/launch-state-store";
import { useGlobalModal } from "./hooks/useGlobalModal";
import { Modal } from "./components/ui/Modal";
import { refreshNrcDataOnMount } from "./services/nrc-service";
import {
  getLauncherConfig,
  setProfileGroupingPreference,
} from "./services/launcher-config-service";
import { useGlobalDragAndDrop } from './hooks/useGlobalDragAndDrop';
import { loadIcons } from '@iconify/react';
import { WifiOff } from "lucide-react";

import { Button } from "./components/ui/buttons/Button";
import { GuardedButton } from "./components/ui/buttons/GuardedButton";
import ChildProtectionModal from "./components/modals/ChildProtectionModal";
import { useMinecraftAuthStore } from "./store/minecraft-auth-store";
import { useWelcomeStore } from "./store/welcome-store";
import { useDeepLinkHandler } from "./hooks/useDeepLinkHandler";
import { drainPendingDeepLinks } from "./services/deep-link-service";
import { WelcomeScreen } from "./components/welcome/WelcomeScreen";
import { useSettingsModalStore } from "./store/settings-modal-store";
import { useSkinStore } from "./store/useSkinStore";
import { invalidatePlayerAppearance } from "./services/cosmetic-cache";
import { useTranslation } from "react-i18next";

export type ProfilesTabContext = {
  currentGroupingCriterion: string;
  onGroupingChange: (newCriterion: string) => void;
};

export function App() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { openCrashModal } = useCrashModalStore();
  const { showModal, hideModal } = useGlobalModal();
  const { activeAccount } = useMinecraftAuthStore();

  const initializeAccounts = useMinecraftAuthStore((s) => s.initializeAccounts);
  const accountsLoaded = useMinecraftAuthStore((s) => s.accountsLoaded);
  useEffect(() => {
    initializeAccounts();
  }, [initializeAccounts]);

  const welcomeSkipped = useWelcomeStore((s) => s.skipped);
  const ready = accountsLoaded;
  const showWelcome = ready && !activeAccount && !welcomeSkipped;

  const activeTab = location.pathname.substring(1) || "play";

  const [currentGroupingCriterion, setCurrentGroupingCriterion] =
      useState<string>("none");

  useEffect(() => {
    const root = document.documentElement;
    const storedTheme = localStorage.getItem("norisk-theme-storage");
    if (storedTheme) {
      try {
        const themeData = JSON.parse(storedTheme);
        if (themeData.state?.accentColor?.value) {
          root.style.setProperty("--accent", themeData.state.accentColor.value);
          root.style.setProperty(
              "--accent-hover",
              themeData.state.accentColor.hoverValue,
          );

          const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
                hex,
            );
            return result
                ? `${Number.parseInt(result[1], 16)}, ${Number.parseInt(result[2], 16)}, ${Number.parseInt(result[3], 16)}`
                : null;
          };

          const rgbValue = hexToRgb(themeData.state.accentColor.value);
          if (rgbValue) {
            root.style.setProperty("--accent-rgb", rgbValue);
          }
        }

        if (themeData.state?.radiusTheme) {
          const radiusTheme = themeData.state.radiusTheme;
          root.setAttribute("data-radius-theme", radiusTheme);

          if (radiusTheme === "flat") {
            root.classList.add("radius-flat");
            root.style.setProperty("--radius", "0px");
          } else {
            root.classList.remove("radius-flat");
            const radiusMap: Record<string, string> = {
              sm: "var(--radius-sm)",
              md: "var(--radius-md)",
              lg: "var(--radius-lg)",
              xl: "var(--radius-xl)",
              "2xl": "var(--radius-2xl)",
            };
            root.style.setProperty("--radius", radiusMap[radiusTheme] || "var(--radius-md)");
          }
        }
      } catch (e) {
        console.error("Failed to parse stored theme:", e);
      }
    }
  }, []);

  useEffect(() => {
    const unlisten = listen<FrontendEventPayload>(
        "state_event",
        (event: TauriEvent<FrontendEventPayload>) => {
          if (
              event.payload.event_type === FrontendEventType.MinecraftSkinChanged
          ) {
            console.log("[App.tsx] Global MinecraftSkinChanged event");
            invalidatePlayerAppearance();
            useSkinStore.getState().bumpSkinRevision();
            return;
          }
          if (event.payload.event_type === FrontendEventType.OfflineMode) {
            console.log("[App.tsx] Global OfflineMode event");
            const anyLaunching = Object.values(
              useLaunchStateStore.getState().profiles,
            ).some((p) => p.isButtonLaunching);
            if (anyLaunching) {
              toast(t('app.offline_mode'), {
                id: 'offline-mode',
                duration: 8000,
                icon: <WifiOff size={16} strokeWidth={1.75} className="text-warn" />,
              });
            }
            return;
          }
          if (
              event.payload.event_type === FrontendEventType.MinecraftProcessExited
          ) {
            try {
              const exitPayload: MinecraftProcessExitedPayload = JSON.parse(
                  event.payload.message,
              );
              console.log(
                  "[App.tsx] Global MinecraftProcessExited event:",
                  exitPayload,
              );
              if (!exitPayload.success) {
                const crashMsg = `Minecraft crashed (Exit Code: ${exitPayload.exit_code ?? "N/A"}). See crash report for details.`;
                toast.error(crashMsg, { duration: 10000 });
                openCrashModal(exitPayload);
              }
            } catch (e) {
              console.error(
                  "[App.tsx] Failed to parse MinecraftProcessExitedPayload:",
                  e,
              );
              toast.error(t('app.errors.process_status'));
            }
          }
        },
    );

    return () => {
      unlisten.then((f) => f());
    };
  }, [openCrashModal]);

  // Listen for navigation events from other windows (e.g., log window)
  useEffect(() => {
    const unlisten = listen<{ profileId: string }>(
      "navigate-to-profile",
      (event) => {
        const { profileId } = event.payload;
        console.log("[App.tsx] Navigate to profile:", profileId);
        navigate(`/profilesv2/${profileId}`);
      },
    );

    return () => {
      unlisten.then((f) => f());
    };
  }, [navigate]);

  // Listen for deep link auth bridge requests
  useDeepLinkHandler<{ session_id: string; username: string }>(
    "deep-link-auth-request",
    ({ session_id, username }) => {
      console.log("[App.tsx] Deep link auth request for:", username);

      showModal(
        "deep-link-auth",
        <Modal
          title={t("deep_link.auth.title")}
          onClose={() => hideModal("deep-link-auth")}
          width="sm"
          footer={
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => hideModal("deep-link-auth")}
              >
                {t("common.cancel")}
              </Button>
              <GuardedButton
                variant="default"
                size="sm"
                onClick={async () => {
                  hideModal("deep-link-auth");
                  try {
                    const result = await invoke<{
                      success: boolean;
                      message: string;
                    }>("confirm_auth_bridge", {
                      sessionId: session_id,
                    });
                    if (result.success) {
                      toast.success(t("deep_link.auth.success"));
                    } else {
                      console.error("[App.tsx] Auth bridge confirm failed:", result.message);
                      toast.error(t("deep_link.auth.error"));
                    }
                  } catch (e) {
                    console.error("[App.tsx] Auth bridge confirm failed:", e);
                    toast.error(t("deep_link.auth.error"));
                  }
                }}
              >
                {t("deep_link.auth.confirm")}
              </GuardedButton>
            </div>
          }
        >
          <div className="p-5 text-[13px] text-fg-2 leading-relaxed">
            <p>{t("deep_link.auth.description", { username })}</p>
          </div>
        </Modal>,
      );
    },
  );

  // Also listen for auth results when no confirmation is needed (e.g., errors)
  useDeepLinkHandler<{ success: boolean; message: string }>(
    "deep-link-auth-result",
    ({ success, message }) => {
      if (!success) {
        if (message === "not_logged_in") {
          toast.error(t("deep_link.auth.not_logged_in"));
        } else {
          console.error("[App.tsx] Auth bridge confirm failed:", message);
          toast.error(t("deep_link.auth.error"));
        }
      }
    },
  );

  useEffect(() => {
    drainPendingDeepLinks();
  }, []);

  useEffect(() => {
    refreshNrcDataOnMount();
  }, []);

  // Icons beim App-Start vorladen
  useEffect(() => {
    const preloadIcons = async () => {
      await loadIcons([
        // Action Buttons
        'solar:play-bold',
        'solar:box-bold',
        'solar:settings-bold',

        // Group Tabs & Navigation
        'solar:add-circle-bold',
        'solar:user-id-bold',
        'solar:widget-bold',
        'solar:emoji-funny-circle-bold',
        'solar:shop-bold',

        // Search & Filters
        'solar:magnifer-bold',
        'solar:text-bold',
        'solar:clock-circle-bold',
        'solar:calendar-add-bold',
        'solar:layers-bold',
        'solar:gamepad-bold',
        'solar:lightbulb-bold',

        // Status & UI
        'solar:danger-triangle-bold',
        'solar:check-circle-bold',
        'solar:info-circle-bold',
        'solar:danger-circle-bold',
        'solar:close-circle-bold',

        // Common UI Elements
        'solar:alt-arrow-down-bold',
        'solar:alt-arrow-up-bold',
        'solar:refresh-bold',
        'solar:stop-bold',
        'solar:folder-bold',
        'solar:download-bold',
        'solar:upload-bold',
        'solar:code-bold',
        'solar:palette-bold',
      ]);
    };

    preloadIcons().catch(console.error);
  }, []);

  useEffect(() => {
    getLauncherConfig()
        .then((config) => {
          if (config && config.profile_grouping_criterion) {
            setCurrentGroupingCriterion(config.profile_grouping_criterion);
          } else {
            setCurrentGroupingCriterion("none");
          }
        })
        .catch((err) => {
          console.error(
              "Failed to get initial profile grouping from config:",
              err,
          );
          setCurrentGroupingCriterion("none");
        });
  }, []);

  const handleProfileGroupingChange = async (newCriterion: string) => {
    setCurrentGroupingCriterion(newCriterion);
    try {
      await setProfileGroupingPreference(newCriterion);
      console.log("[App.tsx] Grouping preference saved successfully.");
    } catch (error) {
      console.error("[App.tsx] Failed to save grouping preference:", error);
      toast.error(t('app.errors.save_grouping'));
    }
  };

  const handleNavChange = async (tabId: string) => {
    if (tabId === "settings") {
      useSettingsModalStore.getState().open();
      return;
    }

    navigate(`/${tabId}`);
  };

  const profilesTabContext: ProfilesTabContext = {
    currentGroupingCriterion,
    onGroupingChange: handleProfileGroupingChange,
  };

  useGlobalDragAndDrop();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <ThemeInitializer />
      <ScrollbarProvider />
      <GlobalToaster />
      <GlobalCrashReportModal />
      <ImportPackConfirmModal />
      <DragDropOverlay />
      {showWelcome && <WelcomeScreen />}
      <GlobalModalPortal />
      <MacCapturePermissionMonitor />
      <ChildProtectionModal />
      {ready && (
        <AppLayout activeTab={activeTab} onNavChange={handleNavChange}>
          <Outlet context={profilesTabContext} />
        </AppLayout>
      )}
    </div>
  );
}

export function useProfilesTabContext() {
  return useOutletContext<ProfilesTabContext>();
}
