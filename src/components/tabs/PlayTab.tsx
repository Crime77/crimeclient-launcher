"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CrimeNews } from "../news/CrimeNews";
import { ErrorMessage } from "../ui/ErrorMessage";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { useProfileStore } from "../../store/profile-store";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { useQualitySettingsStore } from "../../store/quality-settings-store";
import { isWebGLAvailable } from "@noriskclient/nrc-skin-renderer";
import { setDiscordState } from "../../utils/discordRpc";
import { PlayerRig } from "../launcher/PlayerRig";
import { LaunchDock } from "../launcher/LaunchDock";

/** Start page: greeting and the player on a large glass card, the launch dock below it, news on the right. */
export function PlayTab() {
  const { t } = useTranslation();
  const {
    profiles,
    selectedProfile,
    loading,
    error: profilesError,
    setSelectedProfile,
  } = useProfileStore();
  const { activeAccount } = useMinecraftAuthStore();
  const { cosmeticRenderer3d, setCosmeticRenderer3d } = useQualitySettingsStore();
  const webglOk = isWebGLAvailable();

  useEffect(() => {
    setDiscordState("Idling");
  }, []);

  useEffect(() => {
    if (!selectedProfile && profiles.length > 0) setSelectedProfile(profiles[0]);
  }, [selectedProfile, profiles, setSelectedProfile]);

  const playerName = activeAccount?.minecraft_username || activeAccount?.username;
  const hour = new Date().getHours();
  const greeting =
    hour < 5 || hour >= 22
      ? t("play.greeting.night")
      : hour < 11
        ? t("play.greeting.morning")
        : hour < 18
          ? t("play.greeting.day")
          : t("play.greeting.evening");

  // promo-outline shader settings for the 3D player preview
  const outline = { strength: 4, thickness: 3, sensitivity: 0.1 };

  return (
    <div className="flex h-full gap-4">
      <section className="relative flex-1 min-w-0 flex flex-col cc-glass overflow-hidden" style={{ borderRadius: 28 }}>
        {/* soft accent light behind the player */}
        <div
          className="absolute left-1/2 top-[18%] -translate-x-1/2 w-[560px] h-[560px] rounded-full blur-[100px] opacity-30 pointer-events-none"
          style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 65%)" }}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none bg-gradient-to-t from-black/55 to-transparent" />

        <div className="relative z-10 flex items-start justify-between p-8 pb-0">
          <div>
            <p className="text-sm font-medium text-white/50">{greeting}</p>
            <h1 className="font-display text-[44px] leading-[1.05] font-bold text-white mt-1">
              {playerName ?? "CrimeClient"}
            </h1>
            <p className="text-sm text-white/45 mt-2 max-w-[340px]">{t("play.tagline")}</p>
          </div>
          <label className="flex items-center gap-2.5 text-xs font-medium text-white/55 cc-glass rounded-full pl-3 pr-1.5 py-1.5">
            {t("settings.background.skin_animation")}
            <ToggleSwitch
              checked={cosmeticRenderer3d && webglOk}
              onChange={() => setCosmeticRenderer3d(!cosmeticRenderer3d)}
              disabled={!webglOk}
              size="sm"
            />
          </label>
        </div>

        <div className="relative z-0 flex-1 min-h-0 flex items-center justify-center">
          <div className="scale-[0.9] origin-center -mt-6">
            <PlayerRig playerName={playerName} outline={outline} />
          </div>
        </div>

        <div className="relative z-10 p-5 pt-0">
          {profilesError && !loading && <ErrorMessage message={profilesError} />}
          <LaunchDock />
        </div>
      </section>

      <CrimeNews className="w-[340px] flex-shrink-0 flex flex-col cc-glass overflow-hidden" style={{ borderRadius: 28 }} />
    </div>
  );
}
