"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ModrinthSearchV2 } from "../modrinth/v2/ModrinthSearchV2";
import type { Profile } from "../../types/profile";
import { useProfileStore } from "../../store/profile-store";
import { ErrorMessage } from "../ui/ErrorMessage";
import { setDiscordState } from "../../utils/discordRpc";
import { traceStart, traceMark } from "../../utils/perf-trace";

interface ModrinthTabV2Props {
  profiles?: Profile[];
}

/** The Mods page: a short header, then the search (toolbar, filter column, result rows). */
export function ModrinthTabV2({
  profiles: initialProfiles = [],
}: ModrinthTabV2Props) {
  const { t } = useTranslation();
  const {
    profiles: storeProfiles,
    loading,
    error,
    fetchProfiles,
  } = useProfileStore();

  const profiles = initialProfiles.length > 0 ? initialProfiles : storeProfiles;

  useEffect(() => { setDiscordState("Browsing Mods"); }, []);

  useEffect(() => { traceStart('modstab'); }, []);

  useEffect(() => {
    traceMark('modstab', `profiles: ${profiles.length} from store (loading=${loading})`);
  }, [profiles.length, loading]);

  useEffect(() => {
    if (initialProfiles.length === 0 && storeProfiles.length === 0 && !loading) {
      fetchProfiles();
    }
  }, [initialProfiles.length, storeProfiles.length, loading, fetchProfiles]);

  const handleInstallSuccess = useCallback(() => {}, []);

  const memoizedSearch = useMemo(
    () => (
      <ModrinthSearchV2
        profiles={profiles}
        onInstallSuccess={handleInstallSuccess}
        className="h-full"
        traceScope="modstab"
      />
    ),
    [profiles, handleInstallSuccess],
  );

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      <header className="flex-shrink-0 px-6 pt-5 pb-4">
        <h1 className="font-display text-[22px] leading-[1.15] font-[650] text-fg">{t("mods.page.title")}</h1>
        <p className="text-[13px] text-fg-3 mt-1">{t("mods.page.subtitle")}</p>
      </header>

      {error && (
        <div className="px-6 pb-3 flex-shrink-0">
          <ErrorMessage message={error} />
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden px-6">{memoizedSearch}</div>
    </div>
  );
}

export default ModrinthTabV2;
