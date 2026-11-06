"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Copy, FolderOpen, Image as ImageIcon, Loader2, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import type { ScreenshotInfo as ActualScreenshotInfo } from "../../types/profile";
import { IconButton } from "../ui/buttons/IconButton";
import { writeImage } from "@tauri-apps/plugin-clipboard-manager";
import { Image as TauriImage } from "@tauri-apps/api/image";
import { revealItemInDir } from "../../utils/opener-utils";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";

interface ProfileScreenshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  screenshot: ActualScreenshotInfo | null;
  onScreenshotDeleted: (deletedPath: string) => void;
}

export function ProfileScreenshotModal({
  isOpen,
  onClose,
  screenshot,
  onScreenshotDeleted,
}: ProfileScreenshotModalProps) {
  const { t } = useTranslation();
  const [isModalImageLoaded, setIsModalImageLoaded] = useState(false);
  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Reset image loaded state when the screenshot changes or modal opens/closes
    if (isOpen && screenshot) {
      setIsModalImageLoaded(false);
    }
  }, [isOpen, screenshot]);

  if (!isOpen || !screenshot) {
    return null;
  }

  const handleCopyImage = async () => {
    if (!screenshot?.path || isCopyingImage) return;

    setIsCopyingImage(true);

    const copyPromise = writeImage(screenshot.path);

    toast.promise(
      copyPromise,
      {
        loading: t('screenshots.copying'),
        success: () => {
          setIsCopyingImage(false);
          return t('screenshots.copy_success');
        },
        error: (err) => {
          setIsCopyingImage(false);
          console.error("Failed to copy screenshot image:", err);
          return t('screenshots.copy_failed', { error: err.toString() });
        },
      }
    );
  };

  const handleDeleteScreenshot = async () => {
    if (!screenshot?.path || isDeleting) return;

    // const confirmed = window.confirm(
    //   `Are you sure you want to permanently delete the screenshot "${screenshot.filename}"?`
    // );
    // if (!confirmed) return;

    setIsDeleting(true);

    const deletePromise = invoke("delete_file", { filePath: screenshot.path });

    toast.promise(
      deletePromise,
      {
        loading: t('screenshots.deleting', { name: screenshot.filename }),
        success: () => {
          onScreenshotDeleted(screenshot.path);
          onClose();
          setIsDeleting(false);
          return t('screenshots.deleted', { name: screenshot.filename });
        },
        error: (err) => {
          setIsDeleting(false);
          console.error("Failed to delete screenshot:", err);
          return t('screenshots.delete_failed', { error: err.toString() });
        },
      }
    );
  };

  const handleOpenFolder = async () => {
    if (!screenshot?.path) return;
    try {
      await revealItemInDir(screenshot.path);
      // No explicit success toast needed as the OS will show the folder
    } catch (error) {
      console.error("Failed to reveal item in folder:", error);
      toast.error(t('profiles.errors.open_folder_failed'));
    }
  };

  return (
    <Modal
      title={screenshot.filename}
      titleIcon={<ImageIcon size={16} strokeWidth={1.75} />}
      onClose={onClose}
      width="xl"
      closeOnClickOutside
      headerActions={
        isModalImageLoaded ? (
          <div className="flex items-center gap-0.5 mr-1 pr-2 border-r border-line">
            <IconButton
              icon={isCopyingImage ? <Loader2 size={16} className="animate-spin" strokeWidth={1.75} /> : <Copy size={16} strokeWidth={1.75} />}
              title={t('screenshots.copy_image')}
              onClick={handleCopyImage}
              disabled={isCopyingImage}
              variant="ghost"
              size="sm"
            />
            <IconButton
              icon={<FolderOpen size={16} strokeWidth={1.75} />}
              title={t('screenshots.open_location')}
              onClick={handleOpenFolder}
              variant="ghost"
              size="sm"
            />
            <IconButton
              icon={isDeleting ? <Loader2 size={16} className="animate-spin" strokeWidth={1.75} /> : <Trash2 size={16} strokeWidth={1.75} />}
              title={t('screenshots.delete_screenshot')}
              onClick={handleDeleteScreenshot}
              disabled={isDeleting}
              variant="ghost"
              size="sm"
              className="hover:!text-err"
            />
          </div>
        ) : undefined
      }
    >
      <div className="flex justify-center items-center p-4 bg-bg min-h-[400px] max-h-[calc(85vh-120px)] relative">
        {!isModalImageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center text-fg-3">
            <Loader2 size={20} strokeWidth={1.75} className="animate-spin" />
          </div>
        )}
        <img
          src={convertFileSrc(screenshot.path)}
          alt={`Enlarged screenshot: ${screenshot.filename}`}
          className={cn(
            "block max-w-full max-h-full w-auto h-auto object-contain transition-opacity duration-med ease-out",
            isModalImageLoaded ? "opacity-100" : "opacity-0"
          )}
          style={{ maxHeight: 'calc(85vh - 150px)', borderRadius: "var(--r-sm)" }}
          onLoad={() => setIsModalImageLoaded(true)}
          onError={() => {
            setIsModalImageLoaded(false);
            console.error("Failed to load image in modal for:", screenshot?.path);
            // Future: Could show a placeholder error within the modal image area
          }}
        />
      </div>
    </Modal>
  );
} 