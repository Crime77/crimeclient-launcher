import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, File, Folder, FolderTree, Link2, RotateCcw } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Button } from "../../ui/buttons/Button";
import { Modal } from "../../ui/Modal";
import { open } from "@tauri-apps/plugin-dialog";

interface SymlinkConfigModalProps {
  externalPath: string;
  profileInstancePath: string; // Path to the profile's instance folder
  onConfirm: (targetPath: string) => void;
  onCancel: () => void;
}

export function SymlinkConfigModal({
  externalPath,
  profileInstancePath,
  onConfirm,
  onCancel,
}: SymlinkConfigModalProps) {
  const { t } = useTranslation();
  // Extract the folder name from the external path - this stays fixed
  const getFolderName = (path: string) => {
    const parts = path.replace(/\\/g, "/").split("/");
    return parts[parts.length - 1] || "folder";
  };

  const folderName = getFolderName(externalPath);
  const [targetDirectory, setTargetDirectory] = useState<string>("");
  const [selectedAbsolutePath, setSelectedAbsolutePath] = useState<string | null>(null);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const handleSelectTargetDirectory = async () => {
    try {
      // Use the last selected path or the profile instance path as default
      const defaultPath = selectedAbsolutePath || profileInstancePath;
      
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: defaultPath,
        title: t('symlink.select_target_title'),
      });

      if (selected && typeof selected === "string") {
        setSelectedAbsolutePath(selected);
        
        // Calculate relative path from profile instance path
        const normalizedProfile = profileInstancePath.replace(/\\/g, "/");
        const normalizedSelected = selected.replace(/\\/g, "/");
        
        if (normalizedSelected.startsWith(normalizedProfile)) {
          const relativePath = normalizedSelected
            .substring(normalizedProfile.length)
            .replace(/^\/+/, "");
          setTargetDirectory(relativePath);
        } else {
          // Selected folder is outside profile
          setTargetDirectory("");
          alert(t('symlink.select_folder_inside_profile'));
        }
      }
    } catch (error) {
      console.error("Failed to open directory picker:", error);
    }
  };

  const handleConfirm = () => {
    // Build the final path: targetDirectory/folderName
    const finalPath = targetDirectory 
      ? `${targetDirectory.replace(/^\/+|\/+$/g, "")}/${folderName}`
      : folderName;
    onConfirm(finalPath);
  };

  // Calculate the final absolute path where the symlink will be created
  const getFinalAbsolutePath = () => {
    const normalizedBase = profileInstancePath.replace(/\\/g, "/").replace(/\/$/, "");
    if (targetDirectory) {
      return `${normalizedBase}/${targetDirectory}/${folderName}`;
    }
    return `${normalizedBase}/${folderName}`;
  };

  const isFile =
    externalPath.includes('.') && !externalPath.endsWith('/') && !externalPath.endsWith('\\');

  return (
    <Modal
      title={t('symlink.configure')}
      onClose={onCancel}
      width="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="default"
            onClick={handleConfirm}
            icon={<Link2 size={15} strokeWidth={1.75} />}
          >
            {t('symlink.create')}
          </Button>
        </div>
      }
    >
      <div className="p-5 space-y-6">
        {/* External Source */}
        <section>
          <div className="flex items-center gap-1.5 mb-2 text-fg-3">
            {isFile ? <File size={13} strokeWidth={1.75} /> : <Folder size={13} strokeWidth={1.75} />}
            <span className="cc-eyebrow">
              {isFile ? t('symlink.external_file') : t('symlink.external_folder')}
            </span>
          </div>
          <div
            className="px-3 py-2.5 bg-s1 border border-line"
            style={{ borderRadius: "var(--r-md)" }}
          >
            <p className="cc-num text-[12px] text-fg-2 break-all">
              {externalPath}
            </p>
          </div>
          <p className="text-[12px] text-fg-3 mt-2 select-none">
            {isFile ? t('symlink.file_sync_hint') : t('symlink.folder_sync_hint')}
          </p>
        </section>

        {/* Advanced Settings - Collapsible */}
        <section className="border-y border-line">
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            aria-expanded={isAdvancedOpen}
            className="w-full h-10 flex items-center justify-between gap-3 text-left group"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-[13px] font-[560] text-fg">
                {t('symlink.advanced_custom_location')}
              </span>
              {targetDirectory && (
                <span className="cc-num text-[11px] text-fg-3 truncate">
                  {targetDirectory}/
                </span>
              )}
            </span>
            <ChevronDown
              size={15}
              strokeWidth={1.75}
              className={cn(
                "text-fg-3 group-hover:text-fg-2 flex-shrink-0 transition-transform duration-med",
                isAdvancedOpen && "rotate-180",
              )}
            />
          </button>

          {isAdvancedOpen && (
            <div className="pb-4 space-y-3">
              <p className="text-[12px] text-fg-3 leading-[1.5] select-none">
                {t('symlink.default_location_hint', { name: folderName })}
              </p>

              <Button
                onClick={handleSelectTargetDirectory}
                variant="secondary"
                size="sm"
                icon={<FolderTree size={14} strokeWidth={1.75} />}
              >
                {targetDirectory
                  ? t('symlink.current_location', { path: `${targetDirectory}/` })
                  : t('symlink.select_custom_location')}
              </Button>

              {/* Show final path where symlink will be created */}
              <div
                className="px-3 py-2.5 bg-s1 border border-line"
                style={{ borderRadius: "var(--r-md)" }}
              >
                <div className="cc-eyebrow mb-1">{t('symlink.created_at')}</div>
                <p className="cc-num text-[12px] text-fg-2 break-all">
                  {getFinalAbsolutePath()}
                </p>
              </div>

              {targetDirectory && (
                <button
                  type="button"
                  onClick={() => {
                    setTargetDirectory("");
                    setSelectedAbsolutePath(null);
                  }}
                  className="text-[12px] text-fg-3 hover:text-fg transition-colors duration-fast flex items-center gap-1.5"
                >
                  <RotateCcw size={12} strokeWidth={1.75} />
                  {t('symlink.reset_to_root')}
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
