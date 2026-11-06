"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";
import { Input }  from "../ui/Input";
import { Select } from "../ui/Select";
import { Copy, Loader2, TriangleAlert } from "lucide-react";
import type { Profile } from "../../types/profile"; // Assuming this path is correct

interface CopyWorldDialogProps {
  isOpen: boolean;
  sourceWorldName: string;
  sourceProfileId: string;
  availableProfiles: Profile[];
  isLoadingProfiles: boolean;
  isCopying: boolean;
  onClose: () => void;
  onConfirm: (params: {
    targetProfileId: string;
    targetWorldName: string;
  }) => void;
  initialError?: string | null;
}

export function CopyWorldDialog({
  isOpen,
  sourceWorldName,
  sourceProfileId,
  availableProfiles,
  isLoadingProfiles,
  isCopying,
  onClose,
  onConfirm,
  initialError,
}: CopyWorldDialogProps) {
  const { t } = useTranslation();
  const [targetProfileId, setTargetProfileId] = useState(sourceProfileId);
  const [targetWorldName, setTargetWorldName] = useState(sourceWorldName);
  const [internalError, setInternalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset state when dialog opens
      setTargetProfileId(sourceProfileId);
      setTargetWorldName(sourceWorldName);
      setInternalError(null); // Clear previous internal errors
    }
  }, [isOpen, sourceProfileId, sourceWorldName]);

  const handleConfirm = () => {
    if (!targetProfileId) {
      setInternalError(t('copy_world.error.select_profile'));
      return;
    }
    if (!targetWorldName.trim()) {
      setInternalError(t('copy_world.error.enter_name'));
      return;
    }
    setInternalError(null);
    onConfirm({
      targetProfileId,
      targetWorldName: targetWorldName.trim(),
    });
  };

  const displayError = internalError || initialError;

  if (!isOpen) {
    return null;
  }

  const profileOptions = availableProfiles.map(p => ({
    value: p.id,
    label: `${p.name} (${p.game_version} ${p.loader})`
  }));

  return (
    <Modal
      title={t('copy_world.title', { name: sourceWorldName })}
      titleIcon={<Copy size={16} strokeWidth={1.75} />}
      onClose={onClose}
      width="sm"
      footer={
        <div className="flex justify-end items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isCopying}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleConfirm}
            disabled={isCopying || isLoadingProfiles || !targetProfileId || !targetWorldName.trim()}
            icon={isCopying ? <Loader2 size={15} strokeWidth={1.75} className="animate-spin" /> : null}
          >
            {isCopying ? t('copy_world.button.copying') : t('copy_world.button.copy')}
          </Button>
        </div>
      }
    >
      <div className="px-5 py-5 flex flex-col gap-4">
        {displayError && (
          <div
            className="flex items-start gap-2 border border-err/30 bg-err/[0.06] px-3 py-2 text-[12px]"
            style={{ borderRadius: "var(--r-md)" }}
            role="alert"
          >
            <TriangleAlert size={14} strokeWidth={1.75} className="mt-px flex-shrink-0 text-err" />
            <span className="text-fg-2">
              <strong className="font-medium text-err">{t('common.error')}: </strong>
              {displayError}
            </span>
          </div>
        )}

        <div className="flex flex-col">
          <label htmlFor="copy-dialog-target-profile" className="mb-1.5 text-[12px] font-medium text-fg-2">
            {t('copy_world.copy_to_profile')}
          </label>
          {isLoadingProfiles ? (
            <div className="flex items-center gap-2 h-9 text-[12.5px] text-fg-3">
              <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
              {t('copy_world.loading_profiles')}
            </div>
          ) : (
            <Select
              value={targetProfileId}
              onChange={setTargetProfileId}
              options={profileOptions}
              disabled={isCopying || isLoadingProfiles}
              placeholder={t('copy_world.select_target_placeholder')}
            />
          )}
        </div>

        <div className="flex flex-col">
          <label htmlFor="target-world-name" className="mb-1.5 text-[12px] font-medium text-fg-2">
            {t('copy_world.new_world_name')}
          </label>
          <Input
            id="target-world-name"
            type="text"
            value={targetWorldName}
            onChange={(e) => setTargetWorldName(e.target.value)}
            placeholder={t('copy_world.enter_name_placeholder')}
            disabled={isCopying}
          />
        </div>
      </div>
    </Modal>
  );
} 