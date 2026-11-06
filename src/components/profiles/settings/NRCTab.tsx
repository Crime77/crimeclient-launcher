"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Profile } from "../../../types/profile";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, TriangleAlert, Wrench } from "lucide-react";
import { SettingsRow, SettingsSection } from "./SettingsRow";
import { useThemeStore } from "../../../store/useThemeStore";
import { Button } from "../../ui/buttons/Button";
import { toast } from "react-hot-toast";
import * as ProfileService from "../../../services/profile-service";
import { parseErrorMessage } from "../../../utils/error-utils";
import type { NoriskModpacksConfig, NoriskPackDefinition } from "../../../types/noriskPacks";
import { PackPicker } from "../PackPicker";
import { loadPacks, usePacks } from "../../../hooks/usePacks";

interface NRCTabProps {
  profile: Profile;
  editedProfile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
  onRefresh?: () => Promise<Profile>;
}

export function NRCTab({
  profile,
  editedProfile,
  updateProfile,
  onRefresh,
}: NRCTabProps) {
  const { t } = useTranslation();
  const { packs: noriskPacks, loading } = usePacks();
  const [packCompatibilityWarning, setPackCompatibilityWarning] = useState<string | null>(null);
  const [showYellowWarning, setShowYellowWarning] = useState(false);
  const [checkingCompatibility, setCheckingCompatibility] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const isBackgroundAnimationEnabled = useThemeStore(
    (state) => state.isBackgroundAnimationEnabled,
  );
  const tabRef = useRef<HTMLDivElement>(null);



  const selectedPackId = editedProfile.selected_norisk_pack_id || "";

  // Check pack compatibility when selection changes
  useEffect(() => {
    const checkPackCompatibility = async () => {
      if (!editedProfile.selected_norisk_pack_id || editedProfile.selected_norisk_pack_id === "") {
        setPackCompatibilityWarning(null);
        setShowYellowWarning(false);
        return;
      }

      setCheckingCompatibility(true);
      setPackCompatibilityWarning(null);
      setShowYellowWarning(false);

      try {
        // Get resolved packs with all mods
        const resolvedPacks = await loadPacks();

        // Check if the selected pack has NoRisk Client mods
        if (!resolvedPacks[editedProfile.selected_norisk_pack_id]) {
          setShowYellowWarning(true);
          return;
        }
      } catch (err) {
        console.warn("Failed to check pack compatibility:", err);
        setShowYellowWarning(true);
      } finally {
        setCheckingCompatibility(false);
      }
    };

    checkPackCompatibility();
  }, [editedProfile.selected_norisk_pack_id]);

  const handleRepair = async () => {
    try {
      setIsRepairing(true);
      await ProfileService.repairProfile(profile.id);
      toast.success(t('profiles.repair_success'));
    } catch (err) {
      console.error("Failed to repair profile:", err);
      const errorMessage = parseErrorMessage(err);
      toast.error(t('profiles.repair_failed', { error: errorMessage }));
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <div ref={tabRef} className="space-y-8 select-none">
      <SettingsSection title={t('profiles.settings.nrc')}>
        {/* CrimeClient pack selection */}
        <SettingsRow
          stacked
          label={t('nrc.pack_label')}
          description={t('nrc.info_description')}
        >
          <div className="max-w-[420px]">
            <PackPicker
              packs={noriskPacks}
              value={editedProfile.selected_norisk_pack_id || null}
              onChange={(packId) => updateProfile({ selected_norisk_pack_id: packId })}
              loading={loading}
            />
          </div>

          {/* Show warning or description */}
          {showYellowWarning ? (
            <p className="mt-2.5 flex items-start gap-2 text-[12px] leading-[1.5] text-warn">
              <TriangleAlert size={14} strokeWidth={1.75} className="flex-shrink-0 mt-px" />
              {t('nrc.incompatible_warning')}
            </p>
          ) : editedProfile.selected_norisk_pack_id === null || editedProfile.selected_norisk_pack_id === "" ? (
            <p className="mt-2.5 flex items-start gap-2 text-[12px] leading-[1.5] text-warn">
              <TriangleAlert size={14} strokeWidth={1.75} className="flex-shrink-0 mt-px" />
              {t('nrc.no_features_warning')}
            </p>
          ) : (
            editedProfile.selected_norisk_pack_id && noriskPacks[editedProfile.selected_norisk_pack_id] && (
              <p className="mt-2.5 text-[12px] leading-[1.5] text-fg-3 max-w-[560px]">
                {noriskPacks[editedProfile.selected_norisk_pack_id].description}
              </p>
            )
          )}

          {/* Compatibility Checking */}
          {checkingCompatibility && (
            <div className="mt-2.5 flex items-center gap-2 text-[12px] text-fg-3">
              <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
              {t('nrc.checking_compatibility')}
            </div>
          )}

          {/* Compatibility Warning */}
          {packCompatibilityWarning && (
            <div
              className="mt-2.5 flex items-start gap-2 px-3 py-2 border border-err/35 bg-err/10 text-[12px] text-err"
              style={{ borderRadius: "var(--r-md)" }}
            >
              <TriangleAlert size={14} strokeWidth={1.75} className="flex-shrink-0 mt-px" />
              <p>{packCompatibilityWarning}</p>
            </div>
          )}
        </SettingsRow>
      </SettingsSection>

      {/* Repair Profile Section */}
      <SettingsSection title={t('profiles.settings.maintenance')}>
        <SettingsRow
          label={t('nrc.repair_title')}
          description={t('nrc.repair_description')}
        >
          <Button
            onClick={handleRepair}
            disabled={isRepairing}
            variant="secondary"
            size="sm"
            icon={
              isRepairing ? (
                <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
              ) : (
                <Wrench size={14} strokeWidth={1.75} />
              )
            }
          >
            {isRepairing ? t('nrc.repairing') : t('nrc.repair')}
          </Button>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
