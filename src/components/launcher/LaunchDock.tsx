"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Check, ChevronUp, Clock, Layers, Loader2, Package, Play, Square } from "lucide-react";
import { cn } from "../../lib/utils";
import { useProfileStore } from "../../store/profile-store";
import { useVersionSelectionStore } from "../../store/version-selection-store";
import { useProfileLaunch } from "../../hooks/useProfileLaunch";
import { LaunchState } from "../../store/launch-state-store";
import type { Profile } from "../../types/profile";
import { RolloutIndicator } from "./RolloutIndicator";

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

/** Profile picker plus the big play button at the bottom of the start page. */
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

  const failed = launchState === LaunchState.ERROR && !!statusMessage;
  const status = isLaunching
    ? statusMessage || t("launch.launching")
    : failed
      ? statusMessage
      : justLaunched
        ? t("launch.starting")
        : null;

  return (
    <div className="flex items-stretch gap-3 p-2 cc-glass-strong shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]" style={{ borderRadius: 22 }}>
      <div ref={pickerRef} className="relative flex-1 min-w-0">
        <button
          onClick={() => !isLaunching && setPickerOpen((o) => !o)}
          disabled={isLaunching || profiles.length === 0}
          className="cc-free w-full h-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.05] transition-colors disabled:opacity-60"
          style={{ borderRadius: 16 }}
        >
          <ProfileBadge profile={profile} />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">
              {t("play.profile")}
            </div>
            <div className="text-[15px] font-semibold text-white truncate">
              {profile?.name ?? t("play.no_profile")}
            </div>
            {profile && (
              <div className="flex items-center gap-3 mt-0.5 text-xs text-white/45">
                <span>
                  {LOADER_NAMES[profile.loader] ?? profile.loader} {profile.game_version}
                </span>
                <span className="flex items-center gap-1">
                  <Package size={12} /> {profile.mod_count ?? profile.mods.length}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {formatPlaytime(profile.playtime_seconds)}
                </span>
              </div>
            )}
          </div>
          <ChevronUp
            size={18}
            className={cn("text-white/40 transition-transform", !pickerOpen && "rotate-180")}
          />
        </button>

        {pickerOpen && (
          <div
            style={{ borderRadius: 18 }}
            className="absolute left-0 right-0 bottom-[calc(100%+12px)] z-50 p-1.5 cc-glass-strong shadow-[0_24px_60px_-12px_rgba(0,0,0,0.9)] animate-in fade-in slide-in-from-bottom-2 duration-150"
          >
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => choose(p)}
                  className={cn(
                    "cc-free w-full flex items-center gap-3 px-2.5 py-2 text-left transition-colors",
                    p.id === profile?.id ? "bg-white/[0.07]" : "hover:bg-white/[0.05]",
                  )}
                  style={{ borderRadius: 12 }}
                >
                  <ProfileBadge profile={p} small />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white truncate">{p.name}</div>
                    <div className="text-xs text-white/40">
                      {LOADER_NAMES[p.loader] ?? p.loader} {p.game_version}
                    </div>
                  </div>
                  {p.id === profile?.id && <Check size={16} style={{ color: "var(--accent)" }} />}
                </button>
              ))}
            </div>
            <div className="h-px bg-white/[0.07] my-1.5" />
            <button
              onClick={() => {
                setPickerOpen(false);
                navigate("/profiles");
              }}
              className="cc-free w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors"
              style={{ borderRadius: 12 }}
            >
              <Layers size={15} /> {t("play.manage_profiles")}
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => profile && handleLaunch()}
          disabled={!profile}
          className={cn(
            "cc-free cc-play-button group relative h-full min-h-[64px] w-[260px] flex items-center justify-center gap-3 overflow-hidden",
            isLaunching && "is-running",
          )}
          style={{ borderRadius: 16 }}
        >
          <span className="cc-play-shine" />
          {isLaunching ? (
            <Square size={18} fill="currentColor" />
          ) : (
            <Play size={22} fill="currentColor" className="transition-transform group-hover:scale-110" />
          )}
          <span className="flex flex-col items-start leading-tight">
            <span className="font-display text-xl font-bold tracking-wide uppercase">
              {isLaunching ? t("play.stop") : t("play.play")}
            </span>
            {status && (
              <span
                className={cn(
                  "text-[11px] font-medium max-w-[170px] truncate flex items-center gap-1",
                  failed ? "text-red-200" : "text-white/80",
                )}
                title={status}
              >
                {isLaunching && <Loader2 size={11} className="animate-spin" />}
                {status}
              </span>
            )}
          </span>
        </button>
        <div className="absolute -top-2 -right-2 w-7 h-7 z-10">
          <RolloutIndicator />
        </div>
      </div>
    </div>
  );
}

function ProfileBadge({ profile, small }: { profile: Profile | null; small?: boolean }) {
  const size = small ? "w-9 h-9 text-xs" : "w-12 h-12 text-sm";
  const letters = (profile?.name ?? "?").replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "?";
  return (
    <div
      className={cn("cc-free flex-shrink-0 grid place-items-center font-display font-bold text-white", size)}
      style={{
        borderRadius: small ? 10 : 14,
        background:
          profile?.loader === "vanilla"
            ? "linear-gradient(135deg, #3f8f3a, #24521f)"
            : "linear-gradient(135deg, var(--accent), var(--accent-hover))",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
      }}
    >
      {letters}
    </div>
  );
}
