"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useProfileDuplicateStore } from "../../store/profile-duplicate-store";
import { Modal } from "../ui/Modal";
import { SearchStyleInput } from "../ui/Input";
import { Button } from "../ui/buttons/Button";
import { Copy, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "react-hot-toast";
import { useProfileStore } from "../../store/profile-store";
import { copyProfile } from "../../services/profile-service";
import { parseErrorMessage } from "../../utils/error-utils";

export function ProfileDuplicateModal() {
  const { t } = useTranslation();
  const { isModalOpen, sourceProfile, closeModal } = useProfileDuplicateStore();
  const { fetchProfiles } = useProfileStore();
  const [newProfileName, setNewProfileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Set default name when modal opens
  useEffect(() => {
    if (isModalOpen && sourceProfile) {
      const defaultName = `${sourceProfile.name} (copy)`;
      setNewProfileName(defaultName);
    }
  }, [isModalOpen, sourceProfile]);

  if (!isModalOpen || !sourceProfile) {
    return null;
  }

  const handleDuplicate = async () => {
    if (!newProfileName.trim()) {
      toast.error(t('profile_duplicate.error.enter_name'));
      return;
    }

    try {
      setIsLoading(true);

      await copyProfile({
        source_profile_id: sourceProfile.id,
        new_profile_name: newProfileName.trim(),
        include_files: undefined,
      });

      toast.success(t('profile_duplicate.toast.success', { name: newProfileName.trim() }));
      
      // Refresh profiles and close modal
      await fetchProfiles();
      closeModal();
      setNewProfileName("");
    } catch (err) {
      console.error("Failed to duplicate profile:", err);
      toast.error(
        t('profile_duplicate.toast.failed', { error: parseErrorMessage(err) })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    closeModal();
    setNewProfileName("");
  };

  return (
    <Modal
      title={t('profile_duplicate.title')}
      onClose={handleClose}
      width="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            size="sm"
            disabled={isLoading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="default"
            onClick={handleDuplicate}
            disabled={isLoading || !newProfileName.trim()}
            size="sm"
            icon={
              isLoading
                ? <Loader2 size={15} strokeWidth={1.75} className="animate-spin" />
                : <Copy size={15} strokeWidth={1.75} />
            }
          >
            {isLoading ? t('profile_duplicate.button.duplicating') : t('profile_duplicate.button.duplicate')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 px-5 py-5">
        <div className="space-y-1">
          <p className="text-[13px] text-fg-2">
            {t('profile_duplicate.description', { name: sourceProfile.name })}
          </p>
          <p className="text-[12px] text-fg-4">
            {t('profile_duplicate.copy_notice')}
          </p>
        </div>

        <div>
          <label className="block text-[12px] font-medium text-fg-2 mb-1.5">
            {t('profile_duplicate.new_name_label')}
          </label>
          <SearchStyleInput
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            placeholder={t('profile_duplicate.name_placeholder')}
            disabled={isLoading}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isLoading && newProfileName.trim()) {
                handleDuplicate();
              }
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
