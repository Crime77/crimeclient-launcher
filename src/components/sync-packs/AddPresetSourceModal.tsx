"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { UnlistenFn, Event as TauriEvent } from "@tauri-apps/api/event";

import { Modal } from "../ui/Modal";
import { ProfileIconV2 } from "../profiles/ProfileIconV2";
import { useProfileStore } from "../../store/profile-store";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { cn } from "../../lib/utils";
import { parseErrorMessage } from "../../utils/error-utils";
import { formatRelativeTime } from "../../utils/format-relative-time";
import * as SyncPackService from "../../services/sync-pack-service";
import type { SeedCandidate, SyncTargetPreset } from "../../types/syncPacks";
import { Tooltip } from "../ui/Tooltip";

function shortPath(path: string): string {
  const parts = path.split(/[/\\]/).filter(Boolean);
  if (parts.length <= 3) return path;
  return ["...", ...parts.slice(-3)].join("\\");
}

interface DragDropPayload {
  type: "enter" | "over" | "drop" | "leave";
  paths?: string[];
}

export interface AddPresetSourceModalProps {
  preset: SyncTargetPreset;
  currentProfileId?: string | null;
  onClose: () => void;
  onConfirm: (source: {
    seedFrom?: string | null;
    externalPath?: string | null;
  }) => Promise<void>;
}

export function AddPresetSourceModal({
  preset,
  currentProfileId,
  onClose,
  onConfirm,
}: AddPresetSourceModalProps) {
  const { t } = useTranslation();
  const profiles = useProfileStore((state) => state.profiles);

  const [query, setQuery] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const busyRef = useRef(false);

  busyRef.current = isBusy;

  const { data: candidates, loading: isLoading } = useAsyncResource<SeedCandidate[]>(
    () =>
      SyncPackService.listSyncSeedCandidates(preset.path).then((list) =>
        list.filter((entry) => entry.exists),
      ),
    [preset.path],
    [],
    { cacheKey: `sync-seed:${preset.path}` },
  );

  const run = useCallback(
    async (source: { seedFrom?: string | null; externalPath?: string | null }) => {
      if (busyRef.current) return;
      setIsBusy(true);
      try {
        await onConfirm(source);
        onClose();
      } catch (err) {
        toast.error(
          t("syncPacks.drop.error", {
            name: preset.path,
            error: parseErrorMessage(err),
          }),
        );
      } finally {
        setIsBusy(false);
      }
    },
    [onClose, onConfirm, preset.path, t],
  );

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let disposed = false;

    getCurrentWebviewWindow()
      .onDragDropEvent((event: TauriEvent<unknown>) => {
        const payload = event.payload as DragDropPayload;
        if (payload.type === "enter" || payload.type === "over") {
          setIsDragOver(true);
        } else if (payload.type === "leave") {
          setIsDragOver(false);
        } else if (payload.type === "drop") {
          setIsDragOver(false);
          const first = payload.paths?.[0];
          if (first) run({ externalPath: first });
        }
      })
      .then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [run]);

  const isFolder = preset.kindType === "dir_link";

  const needle = query.trim().toLowerCase();
  const matching = needle
    ? candidates.filter(
        (candidate) =>
          candidate.profile_name.toLowerCase().includes(needle) ||
          candidate.path.toLowerCase().includes(needle),
      )
    : candidates;

  const currentIndex = currentProfileId
    ? matching.findIndex(
        (candidate) => candidate.profile_id === currentProfileId,
      )
    : -1;

  const visible =
    currentIndex > 0
      ? [matching[currentIndex], ...matching.filter((_, i) => i !== currentIndex)]
      : matching;

  const handlePick = useCallback(async () => {
    const selection = await openDialog({ directory: isFolder, multiple: false });
    if (typeof selection === "string") {
      await run({ externalPath: selection });
    }
  }, [isFolder, run]);

  return (
    <Modal
      title={t("syncPacks.seed.title", { path: preset.path })}
      titleSubtitle={t("syncPacks.seed.subtitle")}
      onClose={onClose}
      width="lg"
    >
      <div className="flex h-[540px] flex-col gap-4 px-5 py-4">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-2 flex flex-shrink-0 items-end gap-3">
            <div className="min-w-0">
              <div className="cc-eyebrow">
                {t("syncPacks.seed.fromProfile")}
              </div>
              {isFolder && (
                <div className="mt-1 text-[12px] text-fg-4">
                  {t("syncPacks.seed.fromProfileHint")}
                </div>
              )}
            </div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("syncPacks.seed.searchPlaceholder")}
              disabled={isLoading}
              className="ml-auto h-8 w-[240px] rounded-md border border-line bg-s2 px-3 text-[12.5px] text-fg outline-none transition-colors duration-fast placeholder:text-fg-4 hover:border-line-2 focus:border-line-3 disabled:opacity-40"
            />
          </div>

          {isLoading ? (
            <div
              className="min-h-0 flex-1 overflow-hidden border border-line divide-y divide-line bg-s2"
              style={{ borderRadius: "var(--r-md)" }}
            >
              {[0, 1, 2].map((index) => (
                <div key={index} className="flex w-full items-center gap-3 h-14 px-3">
                  <div className="h-8 w-8 flex-shrink-0 rounded-sm bg-s3" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="h-3 w-1/3 rounded-sm bg-s3" />
                    <div className="h-2.5 w-2/3 rounded-sm bg-s3/60" />
                  </div>
                  <div className="h-2.5 w-16 flex-shrink-0 rounded-sm bg-s3" />
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div
              className="border border-line bg-s2 px-4 py-4 text-[12.5px] text-fg-3"
              style={{ borderRadius: "var(--r-md)" }}
            >
              {candidates.length === 0
                ? t("syncPacks.seed.noProfiles")
                : t("syncPacks.seed.noMatch")}
            </div>
          ) : (
            <div
              className="min-h-0 flex-1 overflow-y-auto custom-scrollbar border border-line divide-y divide-line bg-s2"
              style={{ borderRadius: "var(--r-md)" }}
            >
              {visible.map((candidate) => {
                const profile = profiles.find(
                  (entry) => entry.id === candidate.profile_id,
                );
                return (
                  <button
                    key={candidate.profile_id}
                    type="button"
                    onClick={() =>
                      run(
                        isFolder
                          ? { externalPath: candidate.path }
                          : { seedFrom: candidate.path },
                      )
                    }
                    disabled={isBusy}
                    className="flex w-full items-center gap-3 h-14 px-3 text-left transition-colors duration-fast hover:bg-s3 disabled:opacity-30"
                  >
                    {profile ? (
                      <ProfileIconV2 profile={profile} size="xs" />
                    ) : (
                      <div className="h-8 w-8 flex-shrink-0 rounded-sm border border-line bg-s3" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-medium text-fg">
                          {candidate.profile_name}
                        </span>
                        {candidate.profile_id === currentProfileId && (
                          <span
                            className="flex-shrink-0 inline-flex items-center h-[18px] px-1.5 border border-line-2 text-[11px] text-fg-2"
                            style={{ borderRadius: "var(--r-sm)" }}
                          >
                            {t("syncPacks.seed.currentProfile")}
                          </span>
                        )}
                      </div>
                      <Tooltip
                        content={candidate.path}
                        position="top"
                        wrapperClassName="mt-0.5 min-w-0 max-w-full"
                      >
                        <div className="w-full truncate cc-num text-[11.5px] text-fg-4">
                          {shortPath(candidate.path)}
                        </div>
                      </Tooltip>
                    </div>

                    <div className="flex flex-shrink-0 flex-col items-end gap-0.5">
                      {isFolder && (
                        <span className="cc-num text-[11.5px] text-fg-3">
                          {t("syncPacks.seed.entryCount", {
                            count: candidate.entries,
                          })}
                        </span>
                      )}
                      <span className="cc-num text-[11px] text-fg-4">
                        {formatRelativeTime(candidate.last_played)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handlePick}
          disabled={isBusy}
          className={cn(
            "flex flex-shrink-0 flex-col items-center justify-center gap-1 border px-4 py-5 text-center transition-colors duration-fast disabled:opacity-30",
            isDragOver ? "border-line-3 bg-s3" : "border-line bg-bg/30 hover:border-line-2 hover:bg-s2",
          )}
          style={{ borderRadius: "var(--r-md)" }}
        >
          <span className="text-[13px] font-medium text-fg-2">
            {isFolder ? t("syncPacks.add.folder") : t("syncPacks.add.file")}
          </span>
          <span className="text-[12px] text-fg-4">
            {isDragOver
              ? t("syncPacks.drop.overlay")
              : isFolder
                ? t("syncPacks.seed.dropFolder")
                : t("syncPacks.seed.dropFile")}
          </span>
        </button>

        {!isFolder && (
        <button
          type="button"
          onClick={() => run({})}
          disabled={isBusy}
          className="flex-shrink-0 border border-line bg-s2 px-4 py-3 text-left transition-colors duration-fast hover:border-line-2 hover:bg-s3 disabled:opacity-30"
          style={{ borderRadius: "var(--r-md)" }}
        >
          <div className="text-[13px] font-medium text-fg-2">
            {t("syncPacks.seed.empty")}
          </div>
          <div className="mt-0.5 text-[12px] text-fg-4">
            {t("syncPacks.seed.emptyHint")}
          </div>
        </button>
        )}
      </div>
    </Modal>
  );
}

export default AddPresetSourceModal;
