"use client";

import { useTranslation } from "react-i18next";
import type { Profile } from "../../../types/profile";
import { ToggleSwitch } from "../../ui/ToggleSwitch";
import { SettingsRow, SettingsSection } from "./SettingsRow";
// import { Label } from "../../ui/Label"; // No longer needed for this specific checkbox

interface DesignerSettingsTabProps {
  editedProfile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
}

export function DesignerSettingsTab({
  editedProfile,
  updateProfile,
}: DesignerSettingsTabProps) {
  const { t } = useTranslation();

  const handleKeepLocalAssetsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateProfile({
      norisk_information: {
        ...(editedProfile.norisk_information || { 
          is_experimental: editedProfile.norisk_information?.is_experimental || false 
        }), 
        keep_local_assets: event.target.checked,
      },
    });
  };

  return (
    <div className="select-none">
      <SettingsSection title={t('designer.asset_management')}>
        <SettingsRow
          htmlFor="keepLocalAssetsDesigner"
          label={t('designer.keep_local_assets')}
          description={t('designer.keep_local_assets_description')}
        >
          <ToggleSwitch
            checked={editedProfile.norisk_information?.keep_local_assets || false}
            onChange={(checked) =>
              handleKeepLocalAssetsChange({ target: { checked } } as React.ChangeEvent<HTMLInputElement>)
            }
          />
        </SettingsRow>
        {/* Add more designer-specific settings here in the future if needed */}
      </SettingsSection>
    </div>
  );
}
