"use client";

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, MoreHorizontal } from "lucide-react";

import { cn } from "../../lib/utils";
import type { SyncPack, SyncPackModEntry } from "../../types/syncPacks";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { Tooltip } from "../ui/Tooltip";
import { RowAction, SyncPackRow, prettyPath, selectionKey, targetIcon } from "./SyncPackRow";
import { SyncPackModRow } from "./SyncPackModRow";
import { SyncPackDropZone } from "./SyncPackDropZone";
import type { SyncPacksController } from "./useSyncPacks";
import { SyncPackIcon } from "./SyncPackIcon";
import { IconPicker } from "../profiles/IconPicker";
import { useGlobalModal } from "../../hooks/useGlobalModal";
import {
  ThemedDropdown,
  ThemedDropdownDivider,
  ThemedDropdownItem,
} from "../profiles/v3/shared/ThemedDropdown";

export interface SyncPackCardProps {
  pack: SyncPack;
  controller: SyncPacksController;
  iconFor: (entry: SyncPackModEntry) => string | null;
  selection: Set<string>;
  onToggleSelect: (key: string) => void;
}

export function SyncPackCard({
  pack,
  controller,
  iconFor,
  selection,
  onToggleSelect,
}: SyncPackCardProps) {
  const { t } = useTranslation();

  const {
    profile,
    browseProfile,
    subscribedIds,
    expandedPack,
    setExpandedPack,
    localJars,
    matrix,
    showBusy,
    isDragOver,
    resolvingMod,
    setBrowsePack,
    setPresetPrompt,
    pickPaths,
    togglePack,
    deletePack,
    openFolder,
    renamePack,
    setPackIcon,
    removeTarget,
    removeMod,
    removeJar,
    setModEnabled,
    setOverride,
    resolveMod,
  } = controller;

  const inUse = subscribedIds.has(pack.id);
  const isOpen = expandedPack === pack.id;
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const { showModal, hideModal } = useGlobalModal();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(pack.name);
  const editingRef = useRef(false);

  const startRename = () => {
    setDraftName(pack.name);
    editingRef.current = true;
    setRenaming(true);
  };

  const finishRename = (save: boolean) => {
    if (!editingRef.current) return;
    editingRef.current = false;
    setRenaming(false);

    const next = draftName.trim();
    if (!save || !next || next === pack.name) return;
    void renamePack(pack.id, next);
  };
  const jars = localJars[pack.id] ?? [];
  const packMatrix = matrix[pack.id] ?? [];
  const isEmpty =
    pack.targets.length === 0 && pack.mods.length === 0 && jars.length === 0;

  const summary = [
    pack.targets.length > 0 &&
      t("syncPacks.targetCount", { count: pack.targets.length }),
    pack.mods.length > 0 && t("syncPacks.modCount", { count: pack.mods.length }),
    jars.length > 0 && t("syncPacks.drop.localJars", { count: jars.length }),
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <div
      className={cn(
        "group overflow-hidden border bg-s1 transition-colors duration-fast",
        inUse ? "border-line-2" : "border-line",
      )}
      style={{ borderRadius: "var(--r-lg)" }}
    >
      <div
        onClick={() => setExpandedPack(isOpen ? null : pack.id)}
        className="group/head flex cursor-pointer items-center gap-3 h-14 px-3 transition-colors duration-fast hover:bg-s2"
      >
        <Tooltip
          content={t("syncPacks.changeIcon")}
          position="top"
          wrapperClassName="flex-shrink-0"
        >
          <button
            onClick={(event) => {
              event.stopPropagation();
              const modalId = `sync-pack-icon-${pack.id}`;
              showModal(
                modalId,
                <IconPicker
                  onClose={() => hideModal(modalId)}
                  onSelect={(chosen) => void setPackIcon(pack.id, chosen)}
                />,
              );
            }}
            type="button"
            className="block rounded-sm transition-opacity duration-fast hover:opacity-80"
          >
            <SyncPackIcon packId={pack.id} icon={pack.icon} size="sm" />
          </button>
        </Tooltip>

        <div className="min-w-0 flex-1">
          {renaming ? (
            <input
              autoFocus
              value={draftName}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => setDraftName(event.target.value)}
              onBlur={() => finishRename(true)}
              onKeyDown={(event) => {
                if (event.key === "Enter") finishRename(true);
                if (event.key === "Escape") finishRename(false);
              }}
              className="w-full h-6 -ml-1 px-1 bg-s3 border border-line-3 rounded-sm text-[13.5px] font-semibold text-fg outline-none placeholder:text-fg-4"
            />
          ) : (
          <Tooltip
            content={pack.name}
            position="top"
            wrapperClassName="min-w-0 max-w-full"
          >
            <h3 className="w-full truncate text-[13.5px] font-semibold text-fg">
              {pack.name}
            </h3>
          </Tooltip>
          )}
          <div className="truncate text-[12px] text-fg-3">
            {isEmpty ? t("syncPacks.targets.empty") : summary}
          </div>
        </div>

        {profile && (
          <Tooltip
            content={t("syncPacks.activeForProfile", { profile: profile.name })}
            position="top"
            wrapperClassName="flex-shrink-0"
          >
            <div onClick={(event) => event.stopPropagation()}>
              <ToggleSwitch
                checked={inUse}
                onChange={(next) => togglePack(pack, next)}
                disabled={showBusy}
                size="sm"
              />
            </div>
          </Tooltip>
        )}

        <div
          className="relative flex-shrink-0"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            ref={menuRef}
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={t("common.actions")}
            type="button"
            className={cn(
              "cc-icon-btn",
              menuOpen ? "opacity-100 bg-s3 text-fg" : "opacity-0 group-hover/head:opacity-100 focus-visible:opacity-100",
            )}
          >
            <MoreHorizontal size={16} strokeWidth={1.75} />
          </button>
          <ThemedDropdown
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            width="w-52"
            triggerRef={menuRef}
          >
            <ThemedDropdownItem
              icon="solar:pen-linear"
              onClick={() => {
                setMenuOpen(false);
                startRename();
              }}
            >
              {t("syncPacks.rename")}
            </ThemedDropdownItem>
            <ThemedDropdownItem
              icon="solar:folder-linear"
              onClick={() => {
                setMenuOpen(false);
                openFolder(pack.id);
              }}
            >
              {t("syncPacks.openFolder")}
            </ThemedDropdownItem>
            <ThemedDropdownDivider />
            <ThemedDropdownItem
              icon="solar:trash-bin-trash-linear"
              tone="danger"
              onClick={() => {
                setMenuOpen(false);
                deletePack(pack);
              }}
            >
              {t("syncPacks.delete")}
            </ThemedDropdownItem>
          </ThemedDropdown>
        </div>

        <ChevronDown
          size={15}
          strokeWidth={1.75}
          className="flex-shrink-0 text-fg-4 transition-[color,transform] duration-fast group-hover/head:text-fg-2"
          style={{ transform: isOpen ? "rotate(180deg)" : undefined }}
        />
      </div>

      {isOpen && (
        <div className="border-t border-line">
          {!isEmpty && (
            <div className="divide-y divide-line border-b border-line">
              {pack.targets.map((target) => (
                <SyncPackRow
                  key={target.id}
                  selectable
                  selected={selection.has(selectionKey(pack.id, "target", target.path))}
                  onToggleSelect={() =>
                    onToggleSelect(selectionKey(pack.id, "target", target.path))
                  }
                  icon={targetIcon(target.kind)}
                  title={target.path}
                  subtitle={
                    target.external_path
                      ? prettyPath(target.external_path)
                      : undefined
                  }
                  subtitleTitle={
                    target.external_path
                      ? prettyPath(target.external_path)
                      : undefined
                  }
                  actions={
                    <>
                      <RowAction
                        label={t("syncPacks.openFolder")}
                        icon="solar:folder-open-bold"
                        onClick={() => openFolder(pack.id, target.path)}
                      />
                      <RowAction
                        label={t("syncPacks.targets.remove")}
                        icon="solar:trash-bin-trash-bold"
                        onClick={() => removeTarget(pack.id, target)}
                        danger
                      />
                    </>
                  }
                />
              ))}

              {pack.mods.map((entry) => (
                <SyncPackModRow
                  key={entry.id}
                  selectable
                  selected={selection.has(selectionKey(pack.id, "mod", entry.id))}
                  onToggleSelect={() =>
                    onToggleSelect(selectionKey(pack.id, "mod", entry.id))
                  }
                  entry={entry}
                  matrix={packMatrix.find((row) => row.mod_id === entry.id)}
                  iconUrl={iconFor(entry)}
                  resolving={resolvingMod === entry.id}
                  onToggleEnabled={(enabled) =>
                    setModEnabled(pack.id, entry, enabled)
                  }
                  onRemove={() => removeMod(pack.id, entry)}
                  onResolve={(mcVersion, loader) =>
                    resolveMod(pack.id, entry, mcVersion, loader)
                  }
                  onSetOverride={(mcVersion, value, resolveAfter) =>
                    setOverride(pack.id, entry, mcVersion, value, resolveAfter)
                  }
                />
              ))}

              {jars.map((fileName) => (
                <SyncPackRow
                  key={fileName}
                  selectable
                  selected={selection.has(selectionKey(pack.id, "jar", fileName))}
                  onToggleSelect={() =>
                    onToggleSelect(selectionKey(pack.id, "jar", fileName))
                  }
                  icon="solar:box-minimalistic-bold"
                  title={fileName}
                  actions={
                    <RowAction
                      label={t("syncPacks.targets.remove")}
                      icon="solar:trash-bin-trash-bold"
                      onClick={() => removeJar(pack.id, fileName)}
                      danger
                    />
                  }
                />
              ))}
            </div>
          )}

          <SyncPackDropZone
            pack={pack}
            isDragOver={isDragOver}
            showBusy={showBusy}
            canBrowse={!!browseProfile}
            onPickPaths={(directory) => pickPaths(pack.id, directory)}
            onPickPreset={(preset) => setPresetPrompt({ packId: pack.id, preset })}
            onBrowseMods={() => setBrowsePack(pack)}
          />
        </div>
      )}
    </div>
  );
}
