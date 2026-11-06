"use client";

import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CrimeNews } from "../news/CrimeNews";
import { ServerLaunchCard, useHomeServer } from "../launcher/ServerLaunchCard";
import { ErrorMessage } from "../ui/ErrorMessage";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { useProfileStore } from "../../store/profile-store";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { useQualitySettingsStore } from "../../store/quality-settings-store";
import { isWebGLAvailable } from "@noriskclient/nrc-skin-renderer";
import { setDiscordState } from "../../utils/discordRpc";
import { PlayerRig } from "../launcher/PlayerRig";
import { LaunchDock } from "../launcher/LaunchDock";

/** Pack id of the CrimeClient standard profile (tools/build_modpack.py in CraftCosmetics). */
const CRIMECLIENT_PACK = "crimeclient";

/** Start page: the home server in one line, greeting and player on the left, news on the right, the launch bar below. */
export function PlayTab() {
  const { t } = useTranslation();
  const {
    profiles,
    standardProfiles,
    selectedProfile,
    loading,
    error: profilesError,
    setSelectedProfile,
  } = useProfileStore();
  const homeServer = useHomeServer();
  // "Join" starts the CrimeClient profile (the player's own copy first); without one, whatever the dock shows
  const serverProfileId = useMemo(() => {
    const all = [...profiles, ...(standardProfiles ?? [])];
    const crime =
      all.find((p) => p.selected_norisk_pack_id === CRIMECLIENT_PACK) ?? all.find((p) => /crimeclient/i.test(p.name));
    return (crime ?? selectedProfile ?? profiles[0])?.id ?? null;
  }, [profiles, standardProfiles, selectedProfile]);
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
    <div className="flex flex-col h-full">
      <div className="h-12 flex-shrink-0 flex items-center px-6 border-b border-line">
        <ServerLaunchCard
          serverName={homeServer.name}
          serverAddress={homeServer.address}
          profileId={serverProfileId}
          className="w-full"
        />
      </div>

      <div className="flex-1 min-h-0 flex">
        <section className="relative flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="relative z-10 flex items-start justify-between gap-6 px-8 pt-8">
            <div className="min-w-0">
              <p className="text-[13px] text-fg-3">{greeting}</p>
              <h1
                className="font-display text-[46px] leading-[1] font-[720] text-fg mt-2 truncate tracking-[-0.02em]"
                style={{ fontStretch: "122%" }}
              >
                {playerName ?? "CrimeClient"}
              </h1>
              <p className="text-[13px] text-fg-3 mt-3 max-w-[360px] leading-[1.5]">{t("play.tagline")}</p>
            </div>
            <label className="flex items-center gap-2.5 text-xs text-fg-3 flex-shrink-0 pt-1 cursor-pointer select-none">
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
            <div className="scale-[0.86] origin-center -mt-10">
              <PlayerRig playerName={playerName} outline={outline} />
            </div>
          </div>

          {profilesError && !loading && (
            <div className="relative z-10 px-6 pb-3">
              <ErrorMessage message={profilesError} />
            </div>
          )}
        </section>

        <CrimeNews className="w-[360px] flex-shrink-0 border-l border-line bg-bg/60" />
      </div>

      <LaunchDock />
    </div>
  );
}
