"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, MoreHorizontal, Play, Scissors, Smartphone, Star, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { convertFileSrc } from "@tauri-apps/api/core";

import { cn } from "../../lib/utils";
import { Button } from "../ui/buttons/Button";
import { EmptyState } from "../ui/EmptyState";
import { Modal } from "../ui/Modal";
import { SettingsContextMenu, type ContextMenuItem } from "../ui/SettingsContextMenu";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { useThemeStore } from "../../store/useThemeStore";
import {
  deleteClip,
  exportGif,
  renameClip,
  setClipFavourite,
  getClipStorageUsage,
  listClips,
  openClipEditor,
  revealClip,
  samePath,
  type ClipEntry,
  type ClipStorageUsage,
} from "../../services/clip-service";
import { ClipIconButton } from "./ClipIconButton";
import { ClipThumbnail } from "./ClipThumbnail";
import { RenameClipModal } from "./RenameClipModal";
import { VerticalExport } from "./VerticalExport";
import { useClipEngineEvents } from "./useClipEngineEvents";
import { parseErrorMessage } from "../../utils/error-utils";
import { isMacOS } from "../../utils/platform";

export type ClipSort = "newest" | "oldest" | "largest";

type Translate = (key: string, options?: Record<string, unknown>) => string;

interface ClipGalleryProps {
  search?: string;
  sort?: ClipSort;
  favouritesOnly?: boolean;
  game?: string | null;
  onGamesChange?: (games: string[]) => void;
}

export function ClipGallery({
  search = "",
  sort = "newest",
  favouritesOnly = false,
  game = null,
  onGamesChange,
}: ClipGalleryProps) {
  const { t } = useTranslation();
  const { confirm, confirmDialog } = useConfirmDialog();

  const [clips, setClips] = useState<ClipEntry[] | null>(null);
  const [usage, setUsage] = useState<ClipStorageUsage | null>(null);
  const [selected, setSelected] = useState<ClipEntry | null>(null);
  const [vertical, setVertical] = useState<ClipEntry | null>(null);
  const [renaming, setRenaming] = useState<ClipEntry | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [gifting, setGifting] = useState<string[]>([]);
  const gifs = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    try {
      const [entries, storage] = await Promise.all([listClips(), getClipStorageUsage()]);
      setClips(entries);
      setUsage(storage);
      return entries;
    } catch (e) {
      console.error("Could not read the clip folder", e);
      setClips([]);
      return [];
    }
  }, []);

  const follow = useCallback(
    async (made: { path: string; source: string }) => {
      const fresh = (await refresh()).find((entry) => samePath(entry.path, made.path));
      if (!fresh) return;
      setSelected((current) => (current && samePath(current.path, made.source) ? fresh : current));
    },
    [refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const games = useMemo(() => {
    const seen = new Set<string>();
    for (const clip of clips ?? []) {
      if (clip.game) seen.add(clip.game);
    }
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [clips]);

  useEffect(() => {
    onGamesChange?.(games);
  }, [games, onGamesChange]);

  const gifDone = useCallback((source: string | null) => {
    for (const path of gifs.current) {
      if (source === null || samePath(path, source)) gifs.current.delete(path);
    }
    setGifting([...gifs.current]);
  }, []);

  useClipEngineEvents({
    clip_saved: () => void refresh(),
    clip_trimmed: (clip) => void follow(clip),
    clip_exported: (clip) => void follow(clip),
    clip_gif_exported: (gif) => {
      if (![...gifs.current].some((path) => samePath(path, gif.source))) return;
      gifDone(gif.source);
      toast.success(
        gif.truncated ? t("clips.gallery.gif_done_shortened") : t("clips.gallery.gif_done"),
      );
    },
    clip_error: (error) => {
      if (error.code !== "clip_write" && error.code !== "protocol") return;
      gifDone(error.source ?? null);
    },
    clip_engine_stopped: () => gifDone(null),
  });

  const makeGif = useCallback(
    async (clip: ClipEntry) => {
      gifs.current.add(clip.path);
      setGifting([...gifs.current]);
      try {
        await exportGif(clip.path);
      } catch (e) {
        gifDone(clip.path);
        console.error("Could not start the GIF export", e);
        toast.error(parseErrorMessage(e));
      }
    },
    [gifDone],
  );

  const setFavourite = useCallback(
    async (clip: ClipEntry, favourite: boolean) => {
      setClips((current) =>
        current?.map((entry) =>
          entry.path === clip.path ? { ...entry, favourite } : entry,
        ) ?? current,
      );
      try {
        await setClipFavourite(clip.path, favourite);
      } catch (e) {
        console.error("Could not mark the clip", e);
        toast.error(t("clips.gallery.favourite_failed"));
      }
      await refresh();
    },
    [refresh, t],
  );

  const rename = useCallback(
    async (clip: ClipEntry, wanted: string): Promise<boolean> => {
      try {
        const moved = await renameClip(clip.path, wanted);
        setSelected((current) =>
          current?.path === clip.path ? { ...current, path: moved, name: wanted } : current,
        );
        await refresh();
        return true;
      } catch (e) {
        console.error("Could not rename the clip", e);
        toast.error(parseErrorMessage(e));
        return false;
      }
    },
    [refresh],
  );

  const edit = useCallback((clip: ClipEntry) => {
    openClipEditor(clip.path, clip.name).catch((e) => {
      console.error("Could not open the clip editor", e);
      toast.error(parseErrorMessage(e));
    });
  }, []);

  const remove = useCallback(
    async (clip: ClipEntry) => {
      const sure = await confirm({
        title: t("clips.gallery.delete"),
        message: t("clips.gallery.delete_message", { name: clip.name }),
        confirmText: t("clips.gallery.delete_confirm"),
        cancelText: t("clips.gallery.cancel"),
        type: "danger",
      });
      if (!sure) return;

      setBusy(clip.path);
      try {
        await deleteClip(clip.path);
        setSelected((current) => (current?.path === clip.path ? null : current));
        await refresh();
      } catch (e) {
        toast.error(t("clips.gallery.delete_failed"));
        console.error("Could not delete the clip", e);
      } finally {
        setBusy(null);
      }
    },
    [confirm, refresh, t],
  );

  const shown = useMemo(() => {
    if (clips === null) return null;

    const needle = search.trim().toLowerCase();
    const matching = clips.filter((clip) => {
      if (favouritesOnly && !clip.favourite) return false;
      if (game && clip.game !== game) return false;
      return !needle || clip.name.toLowerCase().includes(needle);
    });

    return [...matching].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return a.createdAt - b.createdAt;
        case "largest":
          return b.sizeBytes - a.sizeBytes;
        default:
          return b.createdAt - a.createdAt;
      }
    });
  }, [clips, search, sort, favouritesOnly, game]);

  const months = useMemo(() => {
    if (shown === null) return null;
    if (sort === "largest") return [{ key: "all", label: null, clips: shown }];

    const out: { key: string; label: string | null; clips: ClipEntry[] }[] = [];
    for (const clip of shown) {
      const when = new Date(clip.createdAt * 1000);
      const key = `${when.getFullYear()}-${when.getMonth()}`;
      const open = out[out.length - 1];
      if (open && open.key === key) {
        open.clips.push(clip);
      } else {
        out.push({
          key,
          label: when.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
          clips: [clip],
        });
      }
    }
    return out;
  }, [shown, sort]);

  if (clips === null || shown === null || months === null) {
    return (
      <p className="flex items-center justify-center gap-2 py-8 text-xs text-fg-3">
        <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
        {t("clips.gallery.loading")}
      </p>
    );
  }

  if (clips.length === 0) {
    return (
      <EmptyState
        icon="solar:video-library-bold"
        message={t("clips.gallery.empty")}
        description={t("clips.gallery.empty_hint")}
        smallDescription
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {usage && (
        <StorageBar
          usage={usage}
          count={clips.length}
          shown={shown.length}
          filtered={shown.length !== clips.length}
          t={t}
        />
      )}

      {shown.length === 0 && (
        <EmptyState
          icon={search.trim() ? "solar:magnifer-bold" : "solar:star-bold"}
          message={
            search.trim()
              ? t("clips.gallery.no_match", { search: search.trim() })
              : t("clips.gallery.no_favourites")
          }
          description={search.trim() ? undefined : t("clips.gallery.no_favourites_hint")}
          smallDescription
          compact
          fullHeight={false}
        />
      )}

      {months.map((month) => (
        <div key={month.key} className="flex flex-col gap-3">
          {month.label && (
            <div className="flex items-baseline gap-2 border-b border-line pb-2">
              <h3 className="text-[13px] font-[600] text-fg">
                {month.label}
              </h3>
              <span className="font-mono text-[11px] text-fg-3">
                {month.clips.length}
              </span>
            </div>
          )}

          <div className="grid grid-cols-[repeat(auto-fill,minmax(216px,1fr))] gap-x-4 gap-y-5">
            {month.clips.map((clip, index) => (
              <ClipCard
                key={clip.path}
                clip={clip}
                index={index}
                busy={busy === clip.path || gifting.includes(clip.path)}
                onPlay={() => {
                  setSelected(clip);
                }}
                onReveal={() =>
                  void revealClip(clip.path).catch((e) => toast.error(parseErrorMessage(e)))
                }
                onEdit={() => edit(clip)}
                onDelete={() => void remove(clip)}
                onFavourite={(favourite) => void setFavourite(clip, favourite)}
                onRename={() => setRenaming(clip)}
                onThumbnail={refresh}
                onVertical={() => setVertical(clip)}
                onGif={() => void makeGif(clip)}
                t={t}
              />
            ))}
          </div>
        </div>
      ))}

      {selected && (
        <ClipPlayer
          key={selected.path}
          clip={selected}
          onClose={() => setSelected(null)}
          onVertical={() => setVertical(selected)}
          t={t}
        />
      )}

      {renaming && (
        <RenameClipModal
          key={renaming.path}
          currentName={renaming.name}
          onClose={() => setRenaming(null)}
          onConfirm={(name) => rename(renaming, name)}
        />
      )}

      {vertical && (
        <VerticalExport
          src={convertFileSrc(vertical.path)}
          path={vertical.path}
          onClose={() => setVertical(null)}
          onDone={() => {
            setVertical(null);
            void refresh();
          }}
          t={t}
        />
      )}

      {confirmDialog}
    </div>
  );
}

function ClipCard({
  clip,
  index,
  busy,
  onPlay,
  onReveal,
  onEdit,
  onDelete,
  onFavourite,
  onRename,
  onThumbnail,
  onVertical,
  onGif,
  t,
}: {
  clip: ClipEntry;
  index: number;
  busy: boolean;
  onPlay: () => void;
  onReveal: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onFavourite: (favourite: boolean) => void;
  onRename: () => void;
  onThumbnail: () => void;
  onVertical: () => void;
  onGif: () => void;
  t: Translate;
}) {
  const animated = useThemeStore((state) => state.isBackgroundAnimationEnabled);
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  const openMenu = (x: number, y: number) =>
    setMenuAt({
      x: Math.max(8, Math.min(x, window.innerWidth - MENU_WIDTH - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - MENU_HEIGHT - 8)),
    });

  const menuItems: ContextMenuItem<ClipEntry>[] = [
    { id: "edit", label: t("clips.gallery.edit"), icon: "solar:scissors-bold", onClick: onEdit },
    { id: "rename", label: t("clips.gallery.rename"), icon: "solar:pen-bold", onClick: onRename },
    { id: "vertical", label: t("clips.gallery.vertical"), icon: "solar:smartphone-bold", onClick: onVertical },
    ...(isMacOS()
      ? []
      : [{ id: "gif", label: t("clips.gallery.gif"), icon: "solar:gallery-bold", onClick: onGif }]),
    { id: "reveal", label: t("clips.gallery.reveal"), icon: "solar:folder-with-files-bold", onClick: onReveal },
    {
      id: "delete",
      label: t("clips.gallery.delete"),
      icon: "solar:trash-bin-trash-bold",
      destructive: true,
      separator: true,
      onClick: onDelete,
    },
  ];

  const favouriteLabel = clip.favourite
    ? t("clips.gallery.unfavourite")
    : t("clips.gallery.favourite");

  return (
    <div
      className={cn(
        "group relative flex min-w-0 flex-col",
        animated && "animate-in fade-in duration-500 fill-mode-both",
        busy && "pointer-events-none",
      )}
      style={{
        animationDelay: animated ? `${Math.min(index, 24) * 0.04}s` : undefined,
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        openMenu(event.clientX, event.clientY);
      }}
    >
      <button
        type="button"
        onClick={onPlay}
        className="relative block w-full overflow-hidden rounded-md border border-line bg-s2 transition-colors duration-fast group-hover:border-line-3 focus:outline-none focus-visible:border-line-3"
        aria-label={t("clips.gallery.play")}
      >
        <ClipThumbnail clip={clip} onStored={onThumbnail} />
        <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md bg-black/70 text-fg opacity-0 transition-opacity duration-fast group-hover:opacity-100">
          <Play size={16} strokeWidth={1.75} fill="currentColor" />
        </span>
        {clip.durationSeconds !== null && (
          <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded-sm bg-black/75 px-1.5 font-mono text-[10.5px] leading-[18px] text-fg">
            {formatLength(clip.durationSeconds)}
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/70 text-fg-2">
            <Loader2 size={20} strokeWidth={1.75} className="animate-spin" />
          </span>
        )}
      </button>

      <div className="absolute left-1.5 top-1.5 z-20">
        <ClipIconButton
          icon={<Star size={14} strokeWidth={1.75} fill={clip.favourite ? "currentColor" : "none"} />}
          label={favouriteLabel}
          aria-pressed={clip.favourite}
          surface="overlay"
          onClick={() => onFavourite(!clip.favourite)}
          className={
            clip.favourite
              ? "text-fg"
              : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
          }
        />
      </div>

      <div
        ref={moreRef}
        className={cn(
          "absolute right-1.5 top-1.5 z-20 transition-opacity duration-fast",
          menuAt ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
        )}
      >
        <ClipIconButton
          icon={<MoreHorizontal size={15} strokeWidth={1.75} />}
          label={t("content.actions.more")}
          withTooltip={false}
          surface="overlay"
          onClick={() => {
            if (menuAt) {
              setMenuAt(null);
              return;
            }
            const box = moreRef.current?.getBoundingClientRect();
            if (box) openMenu(box.right - MENU_WIDTH, box.bottom + 4);
          }}
        />
      </div>

      {menuAt &&
        createPortal(
          <SettingsContextMenu
            target={clip}
            isOpen
            position={menuAt}
            items={menuItems}
            onClose={() => setMenuAt(null)}
            triggerButtonRef={moreRef}
            compact
          />,
          document.body,
        )}

      <div className="flex min-w-0 flex-col gap-0.5 pt-2">
        <span className="truncate text-[13px] font-[560] leading-[18px] text-fg" title={clip.name}>
          {clip.name}
        </span>
        <div className="flex min-w-0 items-center gap-1.5 text-[11.5px] leading-4 text-fg-3">
          <span className="truncate">{formatWhen(clip.createdAt, t)}</span>
          <span className="shrink-0 text-fg-4">·</span>
          <span className="shrink-0 font-mono text-[11px]">{formatBytes(clip.sizeBytes)}</span>
          {clip.game && (
            <>
              <span className="shrink-0 text-fg-4">·</span>
              <span className="truncate">{clip.game}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const MENU_WIDTH = 176;
const MENU_HEIGHT = 220;

function formatLength(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}

function ClipPlayer({
  clip,
  onClose,
  onVertical,
  t,
}: {
  clip: ClipEntry;
  onClose: () => void;
  onVertical: () => void;
  t: Translate;
}) {
  const src = useMemo(() => convertFileSrc(clip.path), [clip.path]);

  const [duration, setDuration] = useState(0);
  const [ratio, setRatio] = useState(16 / 9);

  const edit = useCallback(() => {
    openClipEditor(clip.path, clip.name).catch((e) => {
      console.error("Could not open the clip editor", e);
      toast.error(parseErrorMessage(e));
    });
  }, [clip.name, clip.path]);

  const footer = (
    <div className="flex items-center justify-end gap-3">
      <Button
        variant="secondary"
        size="sm"
        icon={<Smartphone size={15} strokeWidth={1.75} />}
        onClick={onVertical}
      >
        {t("clips.vertical.open")}
      </Button>
      <Button
        variant="default"
        size="sm"
        icon={<Scissors size={15} strokeWidth={1.75} />}
        onClick={edit}
        disabled={duration <= 0}
      >
        {t("clips.trim.open")}
      </Button>
    </div>
  );

  return (
    <Modal
      title={clip.name}
      titleIcon={<Video size={16} strokeWidth={1.75} />}
      titleSubtitle={
        <span className="text-xs text-fg-3">
          {formatWhen(clip.createdAt, t)} <span className="text-fg-4">·</span>{" "}
          <span className="font-mono text-[11px]">{formatBytes(clip.sizeBytes)}</span>
        </span>
      }
      onClose={onClose}
      width="xl"
      footer={footer}
    >
      <div className="p-4">
        <div
          className="mx-auto w-full max-h-[calc(90vh-14rem)] overflow-hidden rounded-md border border-line bg-black"
          style={{
            aspectRatio: `${ratio}`,
            maxWidth: `calc((90vh - 14rem) * ${ratio})`,
          }}
        >
          <video
            src={src}
            controls
            autoPlay
            playsInline
            onLoadedMetadata={(event) => {
              const video = event.currentTarget;
              setDuration(video.duration);
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                setRatio(video.videoWidth / video.videoHeight);
              }
            }}
            className="block h-full w-full object-contain"
          />
        </div>
      </div>
    </Modal>
  );
}

function StorageBar({
  usage,
  count,
  shown,
  filtered,
  t,
}: {
  usage: ClipStorageUsage;
  count: number;
  shown: number;
  filtered: boolean;
  t: Translate;
}) {
  const unlimited = usage.limitBytes === 0;
  const ratio = unlimited ? 0 : Math.min(1, usage.usedBytes / usage.limitBytes);
  const crowded = ratio > 0.9;

  return (
    <div className="flex items-center gap-3">
      <span className="whitespace-nowrap text-xs text-fg-2">
        {filtered
          ? t("clips.gallery.count_filtered", { shown, count })
          : t("clips.gallery.count", { count })}
      </span>
      <span className="flex-1" />
      <span
        className={cn(
          "whitespace-nowrap font-mono text-[11px]",
          crowded ? "text-warn" : "text-fg-3",
        )}
      >
        {unlimited
          ? formatBytes(usage.usedBytes)
          : `${formatBytes(usage.usedBytes)} / ${formatBytes(usage.limitBytes)}`}
      </span>
      {!unlimited && (
        <div className="h-[3px] w-32 flex-shrink-0 overflow-hidden rounded-full bg-s3">
          <div
            className={cn("h-full transition-[width] duration-slow", crowded ? "bg-warn" : "bg-fg-3")}
            style={{ width: `${Math.max(2, ratio * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatWhen(unixSeconds: number, t: Translate): string {
  const seconds = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);

  if (seconds < 60) return t("clips.gallery.just_now");
  if (seconds < 3600) return t("clips.gallery.minutes_ago", { count: Math.floor(seconds / 60) });
  if (seconds < 86_400) return t("clips.gallery.hours_ago", { count: Math.floor(seconds / 3600) });

  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
