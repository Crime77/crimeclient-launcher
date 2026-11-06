"use client";

import { useState } from "react";
import { Check, Image as ImageIcon, Link, Trash2, Upload } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";
import { cn } from "../../lib/utils";
import { BLOCK_ICONS } from "../../data/block-icons";
import { useProfileIconLibraryStore } from "../../store/useProfileIconLibraryStore";

/** A chosen icon — either a remote image URL or an absolute file path on disk. */
export type ChosenIcon = { url: string } | { path: string };

interface IconPickerProps {
  /** Currently selected icon, used to highlight the active tile. */
  selected?: ChosenIcon | null;
  /** Called with the chosen icon. The picker closes itself afterwards. */
  onSelect: (icon: ChosenIcon) => void;
  onClose: () => void;
}

const GRID_STYLE: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(56px, 1fr))",
  gap: "6px",
};

// Tunes how an icon image renders once its real dimensions are known:
//  - tiny textures (<=64px) render crisp (pixelated) instead of blurry
//  - animated MC textures are vertical sprite sheets (height > width) — anchor
//    to the top so only the first animation frame shows instead of two halves
export function handleIconImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.naturalWidth === 0) return;
  // Assigned definitively (with defaults) so a reused <img> element resets
  // correctly when its src changes from e.g. a block texture to a photo.
  img.style.imageRendering = img.naturalWidth <= 64 ? "pixelated" : "auto";
  img.style.objectPosition = img.naturalHeight > img.naturalWidth ? "top" : "center";
}

export function IconPicker({ selected, onSelect, onClose }: IconPickerProps) {
  const { t } = useTranslation();
  const { customIcons, addCustomFile, addCustomUrl, removeCustomIcon } =
    useProfileIconLibraryStore();
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");

  const pick = (icon: ChosenIcon) => {
    onSelect(icon);
    onClose();
  };

  const isSelected = (icon: ChosenIcon): boolean => {
    if (!selected) return false;
    if ("url" in icon && "url" in selected) return icon.url === selected.url;
    if ("path" in icon && "path" in selected) return icon.path === selected.path;
    return false;
  };

  const handleUpload = async () => {
    try {
      const selectedPath = await open({
        title: t("profiles.iconPicker.uploadFile"),
        multiple: false,
        directory: false,
        filters: [
          { name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] },
        ],
      });
      if (typeof selectedPath === "string" && selectedPath) {
        addCustomFile(selectedPath);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("Dialog cancelled")) return;
      console.error("Failed to select custom icon file:", err);
      toast.error(t("profiles.errors.image_dialog_failed"));
    }
  };

  const handleAddUrl = () => {
    const trimmed = urlValue.trim();
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("unsupported protocol");
      }
    } catch {
      toast.error(t("profiles.iconPicker.invalidUrl"));
      return;
    }
    addCustomUrl(trimmed);
    setUrlValue("");
    setShowUrlInput(false);
  };

  const tileClass = (active: boolean) =>
    cn(
      "relative aspect-square rounded-md overflow-hidden border transition-colors duration-fast",
      active ? "border-fg-3 bg-s3" : "border-line bg-s2 hover:border-line-3",
    );

  const activeStyle = (_active: boolean): React.CSSProperties => ({});

  const activeMark = (active: boolean) =>
    active ? (
      <span className="absolute right-0.5 bottom-0.5 grid place-items-center w-4 h-4 rounded-sm bg-fg text-bg pointer-events-none">
        <Check size={11} strokeWidth={2.5} />
      </span>
    ) : null;

  return (
    <Modal
      title={t("profiles.iconPicker.title")}
      titleIcon={<ImageIcon size={16} strokeWidth={1.75} />}
      onClose={onClose}
      width="lg"
    >
      <div className="px-5 py-4 space-y-5">
        {/* Blocks */}
        <section className="space-y-2">
          <h3 className="flex items-baseline gap-2">
            <span className="cc-eyebrow">{t("profiles.iconPicker.blocks")}</span>
            <span className="cc-num text-[11px] text-fg-4">{BLOCK_ICONS.length}</span>
          </h3>
          <div style={GRID_STYLE}>
            {BLOCK_ICONS.map((block) => {
              const active = isSelected({ url: block.url });
              return (
                <button
                  key={block.id}
                  type="button"
                  title={block.name}
                  className={tileClass(active)}
                  style={activeStyle(active)}
                  aria-pressed={active}
                  onClick={() => pick({ url: block.url })}
                >
                  <img
                    src={block.url}
                    alt={block.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onLoad={handleIconImgLoad}
                  />
                  {activeMark(active)}
                </button>
              );
            })}
          </div>
        </section>

        {/* Custom */}
        <section className="space-y-2 pt-4 border-t border-line">
          <h3 className="flex items-baseline gap-2">
            <span className="cc-eyebrow">{t("profiles.iconPicker.custom")}</span>
            {customIcons.length > 0 && (
              <span className="cc-num text-[11px] text-fg-4">{customIcons.length}</span>
            )}
          </h3>

          {showUrlInput && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddUrl();
                  if (e.key === "Escape") setShowUrlInput(false);
                }}
                placeholder={t("profiles.iconPicker.addUrlPlaceholder")}
                className="flex-1 h-8 bg-s2 border border-line rounded-md px-3 text-[12.5px] text-fg placeholder:text-fg-4 outline-none transition-colors duration-fast hover:border-line-2 focus:border-line-3"
              />
              <Button size="sm" variant="secondary" onClick={handleAddUrl}>
                {t("profiles.iconPicker.add")}
              </Button>
            </div>
          )}

          <div style={GRID_STYLE}>
            {/* Upload file tile */}
            <button
              type="button"
              title={t("profiles.iconPicker.uploadFile")}
              onClick={handleUpload}
              className="relative aspect-square rounded-md border border-line bg-s2 hover:bg-s3 hover:border-line-2 flex flex-col items-center justify-center gap-1 px-1 text-fg-3 hover:text-fg transition-colors duration-fast"
            >
              <Upload size={16} strokeWidth={1.75} />
              <span className="text-[10.5px] leading-tight text-center">
                {t("profiles.iconPicker.uploadFile")}
              </span>
            </button>

            {/* Add URL tile */}
            <button
              type="button"
              title={t("profiles.iconPicker.addUrl")}
              onClick={() => setShowUrlInput((v) => !v)}
              aria-pressed={showUrlInput}
              className={cn(
                "relative aspect-square rounded-md border flex flex-col items-center justify-center gap-1 px-1 transition-colors duration-fast",
                showUrlInput
                  ? "border-line-3 bg-s3 text-fg"
                  : "border-line bg-s2 text-fg-3 hover:bg-s3 hover:border-line-2 hover:text-fg",
              )}
            >
              <Link size={16} strokeWidth={1.75} />
              <span className="text-[10.5px] leading-tight text-center">
                {t("profiles.iconPicker.addUrl")}
              </span>
            </button>

            {/* Custom icons */}
            {customIcons.map((ci) => {
              const chosen: ChosenIcon =
                ci.kind === "file" ? { path: ci.value } : { url: ci.value };
              const src = ci.kind === "file" ? convertFileSrc(ci.value) : ci.value;
              const active = isSelected(chosen);
              return (
                <div
                  key={ci.id}
                  className={cn(tileClass(active), "group")}
                  style={activeStyle(active)}
                >
                  <button
                    type="button"
                    className="w-full h-full"
                    onClick={() => pick(chosen)}
                  >
                    <img
                      src={src}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onLoad={handleIconImgLoad}
                    />
                  </button>
                  {activeMark(active)}
                  <button
                    type="button"
                    title={t("profiles.iconPicker.remove")}
                    aria-label={t("profiles.iconPicker.remove")}
                    onClick={() => removeCustomIcon(ci.id)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center rounded-sm bg-bg/80 text-fg-2 hover:text-err opacity-0 group-hover:opacity-100 transition-opacity duration-fast"
                  >
                    <Trash2 size={12} strokeWidth={1.75} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </Modal>
  );
}
