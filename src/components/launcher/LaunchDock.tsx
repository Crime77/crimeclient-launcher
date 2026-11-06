"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Check, ChevronsUpDown, Layers, Play, Square } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import type { EventPayload } from "../../types/events";
import { cn } from "../../lib/utils";
import { useProfileStore } from "../../store/profile-store";
import { useVersionSelectionStore } from "../../store/version-selection-store";
import { useProfileLaunch } from "../../hooks/useProfileLaunch";
import { LaunchState } from "../../store/launch-state-store";
import type { Profile } from "../../types/profile";
import { ProfileIcon } from "../profiles/ProfileIcon";

const LOADER_NAMES: Record<string, string> = {
  vanilla: "Vanilla",
  fabric: "Fabric",
  forge: "Forge",
  quilt: "Quilt",
  neoforge: "NeoForge",
};

function formatPlaytime(seconds: number | undefined): string {
  if (!seconds) return "0 h";
  const hours = seconds / 3600;
  return hours >= 10 ? `${Math.round(hours)} h` : `${hours.toFixed(1).replace(".", ",")} h`;
}

/** Launch bar at the bottom of the start page: profile picker on the left, PLAY on the right. */
export function LaunchDock() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profiles, selectedProfile, setSelectedProfile } = useProfileStore();
  const { selectedVersion, setSelectedVersion } = useVersionSelectionStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [justLaunched, setJustLaunched] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const profile = useMemo(
    () => profiles.find((p) => p.id === selectedVersion) ?? selectedProfile ?? profiles[0] ?? null,
    [profiles, selectedVersion, selectedProfile],
  );

  // the launch hook works on the shared version selection, keep it in sync with the shown profile
  useEffect(() => {
    if (profile && selectedVersion !== profile.id) setSelectedVersion(profile.id);
  }, [profile, selectedVersion, setSelectedVersion]);

  const { handleLaunch, isLaunching, statusMessage, launchState } = useProfileLaunch({
    profileId: profile?.id ?? "",
    onLaunchSuccess: () => {
      setJustLaunched(true);
      setTimeout(() => setJustLaunched(false), 3000);
    },
    onLaunchError: (error: string) => console.error("Launch error:", error),
  });

  useEffect(() => {
    if (!pickerOpen) return;
    const close = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [pickerOpen]);

  const choose = (p: Profile) => {
    setSelectedProfile(p);
    setSelectedVersion(p.id);
    setPickerOpen(false);
  };

  // progress of the current launch step (the backend reports 0..1 per step, not for the whole launch)
  const [stepProgress, setStepProgress] = useState<number | null>(null);
  useEffect(() => {
    if (!isLaunching || !profile) {
      setStepProgress(null);
      return;
    }
    let unlisten: (() => void) | undefined;
    listen<EventPayload>("state_event", (event) => {
      if (event.payload.target_id !== profile.id || event.payload.progress == null) return;
      const p = event.payload.progress;
      setStepProgress(Math.max(0, Math.min(1, p > 1 ? p / 100 : p)));
    })
      .then((fn) => (unlisten = fn))
      .catch(() => {});
    return () => unlisten?.();
  }, [isLaunching, profile]);

  const failed = launchState === LaunchState.ERROR && !!statusMessage;
  const status = isLaunching
    ? statusMessage || t("launch.launching")
    : failed
      ? statusMessage
      : justLaunched
        ? t("launch.starting")
        : null;

  return (
    <div className="flex items-stretch gap-3 h-[72px] px-4 py-3 bg-s1 border-t border-line">
      <div ref={pickerRef} className="relative min-w-0 w-[min(440px,48%)]">
        <button
          type="button"
          onClick={() => !isLaunching && setPickerOpen((o) => !o)}
          disabled={isLaunching || profiles.length === 0}
          className={cn(
            "w-full h-full flex items-center gap-3 pl-2 pr-3 text-left border transition-colors duration-fast disabled:opacity-60",
            pickerOpen ? "bg-s3 border-line-2" : "bg-s2 border-line hover:border-line-2 hover:bg-s3",
          )}
          style={{ borderRadius: "var(--r-md)" }}
        >
          <ProfileBadge profile={profile} />
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-[600] text-fg truncate leading-tight">
              {profile?.name ?? t("play.no_profile")}
            </div>
            {profile && (
              <div className="cc-num text-[11px] text-fg-3 truncate mt-1 leading-none">
                {(LOADER_NAMES[profile.loader] ?? profile.loader).toLowerCase()} {profile.game_version}
                <span className="text-fg-4"> · </span>
                {profile.mod_count ?? profile.mods.length} mods
                <span className="text-fg-4"> · </span>
                {formatPlaytime(profile.playtime_seconds)}
              </div>
            )}
          </div>
          <ChevronsUpDown size={15} className="text-fg-3 flex-shrink-0" />
        </button>

        {pickerOpen && (
          <div className="cc-popover cc-pop absolute left-0 right-0 bottom-[calc(100%+8px)] z-50 p-1">
            <div className="px-2 pt-1.5 pb-1 cc-eyebrow">{t("play.profile")}</div>
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
              {profiles.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => choose(p)}
                  className={cn(
                    "w-full flex items-center gap-3 px-2 py-1.5 text-left transition-colors duration-fast",
                    p.id === profile?.id ? "bg-s3" : "hover:bg-s3",
                  )}
                  style={{ borderRadius: "var(--r-sm)" }}
                >
                  <ProfileBadge profile={p} small />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-[540] text-fg truncate">{p.name}</div>
                    <div className="cc-num text-[11px] text-fg-3">
                      {(LOADER_NAMES[p.loader] ?? p.loader).toLowerCase()} {p.game_version}
                    </div>
                  </div>
                  {p.id === profile?.id && <Check size={14} className="text-fg-2" />}
                </button>
              ))}
            </div>
            <div className="h-px bg-line my-1 -mx-1" />
            <button
              type="button"
              onClick={() => {
                setPickerOpen(false);
                navigate("/profiles");
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] text-fg-2 hover:text-fg hover:bg-s3 transition-colors duration-fast"
              style={{ borderRadius: "var(--r-sm)" }}
            >
              <Layers size={14} strokeWidth={1.75} /> {t("play.manage_profiles")}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex items-center px-2">
        {status && (
          <span
            className={cn("text-xs truncate", failed ? "text-err" : "text-fg-3")}
            title={status}
          >
            {status}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => profile && handleLaunch()}
        disabled={!profile}
        className={cn(
          "cc-play-button group relative w-[232px] flex items-center justify-center gap-3 overflow-hidden",
          isLaunching && "is-running",
        )}
        style={{ borderRadius: "var(--r-md)" }}
      >
        {isLaunching && (
          <span
            className="absolute left-0 bottom-0 h-[2px] bg-accent transition-[width] duration-slow ease-out"
            style={{ width: `${Math.round((stepProgress ?? 0.04) * 100)}%` }}
          />
        )}
        {isLaunching ? (
          <Square size={14} fill="currentColor" />
        ) : (
          <Play size={17} fill="currentColor" className="transition-transform duration-fast group-hover:translate-x-0.5" />
        )}
        <span
          className="font-display text-[17px] font-[720] uppercase tracking-[0.08em] leading-none"
          style={{ fontStretch: "120%" }}
        >
          {isLaunching ? t("play.stop") : t("play.play")}
        </span>
      </button>
    </div>
  );
}

function ProfileBadge({ profile, small }: { profile: Profile | null; small?: boolean }) {
  return (
    <div
      className={cn(
        "flex-shrink-0 grid place-items-center overflow-hidden bg-s3 border border-line-2",
        small ? "w-7 h-7" : "w-10 h-10",
      )}
      style={{ borderRadius: "var(--r-sm)" }}
    >
      {profile ? (
        <ProfileIcon
          profileId={profile.id}
          banner={profile.banner}
          profileName={profile.name}
          accentColor="var(--fg-3)"
          onSuccessfulUpdate={() => {}}
          isEditable={false}
          variant="bare"
          className="w-full h-full"
          placeholderIcon="ph:package-duotone"
          iconClassName={small ? "w-3.5 h-3.5 text-fg-3" : "w-4 h-4 text-fg-3"}
        />
      ) : null}
    </div>
  );
}
