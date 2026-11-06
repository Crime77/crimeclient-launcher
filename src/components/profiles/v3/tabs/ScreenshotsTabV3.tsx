"use client";

/**
 * ScreenshotsTabV3 — Gallery-Grid mit Hover-Overlay + Fullscreen-Modal.
 * Ersetzt V2 ScreenshotsTab. Reused V2 ProfileScreenshotModal unveraendert.
 */

import {
  AlertTriangle, ArrowUpDown, Check, ChevronDown, Image as ImageIcon, ImageOff, Loader2, RefreshCw, Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { invoke } from "@tauri-apps/api/core";
import { useInView } from "react-intersection-observer";

import type { Profile } from "../../../../types/profile";
import type { ScreenshotInfo } from "../../../../types/profile";
import { getImagePreview } from "../../../../services/tauri-service";
import { useThemeStore } from "../../../../store/useThemeStore";
import { useDelayedTrue } from "../../../../hooks/useDelayedTrue";
import { formatRelativeTime } from "../../../../utils/format-relative-time";
import { ProfileScreenshotModal } from "../../ProfileScreenshotModal";
import { ConfirmDeleteDialog } from "../../../modals/ConfirmDeleteDialog";
import { useGlobalModal } from "../../../../hooks/useGlobalModal";
import { ThemedDropdown, ThemedDropdownItem } from "../shared/ThemedDropdown";
import { EmptyStateV3 } from "../shared/EmptyStateV3";
import { FloatingActionBar, type FABActionConfig } from "../shared/FloatingActionBar";
import { parseErrorMessage } from "../../../../utils/error-utils";

interface ScreenshotsTabV3Props {
  profile: Profile;
  isActive?: boolean;
}

type SortKey = "newest" | "oldest";

const SORT_OPTIONS: { value: SortKey; labelKey: string; icon: string }[] = [
  { value: "newest", labelKey: "profiles.v3.screenshots.sort.newest", icon: "solar:sort-from-top-to-bottom-bold" },
  { value: "oldest", labelKey: "profiles.v3.screenshots.sort.oldest", icon: "solar:sort-from-bottom-to-top-bold" },
];

// Preview-Groesse fuer die Grid-Thumbnails. Backend resized das Bild auf
// diese Dimensionen (mit JPEG-Quality) damit wir nicht fuer jedes Tile das
// volle Bild ausliefern.
const PREVIEW_WIDTH = 480;
const PREVIEW_HEIGHT = 270;
const PREVIEW_QUALITY = 75;

export function ScreenshotsTabV3({ profile, isActive = true }: ScreenshotsTabV3Props) {
  const { t } = useTranslation();
  const accentColor = useThemeStore((s) => s.accentColor);
  const { showModal, hideModal } = useGlobalModal();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [screenshots, setScreenshots] = useState<ScreenshotInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [modalScreenshot, setModalScreenshot] = useState<ScreenshotInfo | null>(null);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<ScreenshotInfo[]>("list_profile_screenshots", { profileId: profile.id });
      if (!mountedRef.current) return;
      setScreenshots(list);
      // Stale Selektions-Eintraege dropen — wenn Files extern geloescht
      // wurden, haette selectedPaths sonst tote Pfade.
      setSelectedPaths(prev => {
        if (prev.size === 0) return prev;
        const alive = new Set(list.map(s => s.path));
        const kept = new Set<string>();
        for (const p of prev) if (alive.has(p)) kept.add(p);
        return kept.size === prev.size ? prev : kept;
      });
    } catch (err) {
      console.error("[V3 Screenshots] Failed to load:", err);
      if (mountedRef.current) setError(parseErrorMessage(err));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [profile.id]);

  useEffect(() => {
    if (isActive) void loadData();
  }, [isActive, loadData]);

  // ── Sort ──────────────────────────────────────────────────────────────────
  const visibleScreenshots = useMemo(() => {
    const sorted = [...screenshots];
    const toTs = (s: ScreenshotInfo) => s.modified ? new Date(s.modified).getTime() : 0;
    if (sortBy === "newest")  sorted.sort((a, b) => toTs(b) - toTs(a));
    else                      sorted.sort((a, b) => toTs(a) - toTs(b));
    return sorted;
  }, [screenshots, sortBy]);

  const activeSortLabel = t(SORT_OPTIONS.find(o => o.value === sortBy)?.labelKey ?? "profiles.v3.screenshots.sort.newest");

  // ── Actions ───────────────────────────────────────────────────────────────
  const toggleSelection = (path: string) => {
    setSelectedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  };

  const handleScreenshotDeleted = useCallback((deletedPath: string) => {
    setScreenshots(prev => prev.filter(s => s.path !== deletedPath));
    setSelectedPaths(prev => {
      if (!prev.has(deletedPath)) return prev;
      const next = new Set(prev);
      next.delete(deletedPath);
      return next;
    });
    setModalScreenshot(null);
  }, []);

  const handleBatchDelete = useCallback(() => {
    if (selectedPaths.size === 0) return;
    const paths = Array.from(selectedPaths);
    const modalId = "batch-delete-screenshots";
    const doDelete = async () => {
      setIsBatchDeleting(true);
      let successCount = 0;
      try {
        for (const p of paths) {
          try {
            await invoke("delete_file", { path: p });
            successCount++;
          } catch (err) {
            console.error("[V3 Screenshots] Delete failed for", p, err);
          }
        }
        toast.success(t("profiles.v3.screenshots.batchDeleteSuccess", { count: successCount }));
        setSelectedPaths(new Set());
        await loadData();
      } finally {
        setIsBatchDeleting(false);
        hideModal(modalId);
      }
    };
    showModal(modalId, (
      <ConfirmDeleteDialog
        isOpen={true}
        itemName={t("profiles.v3.screenshots.batchDeleteItemName", { count: paths.length })}
        onClose={() => hideModal(modalId)}
        onConfirm={doDelete}
        isDeleting={isBatchDeleting}
        title={t("profiles.v3.screenshots.batchDeleteTitle")}
        message={<p className="text-[13px] text-fg-2 leading-[1.5]">{t("profiles.v3.screenshots.batchDeleteConfirm", { count: paths.length })}</p>}
      />
    ));
  }, [selectedPaths, loadData, showModal, hideModal, isBatchDeleting, t]);

  // Esc clears selection
  useEffect(() => {
    if (selectedPaths.size === 0) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedPaths(new Set()); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedPaths.size]);

  const shouldShowLoading = useDelayedTrue(loading && screenshots.length === 0, 500);

  const fabActions: FABActionConfig[] = [
    {
      icon: Trash2,
      label: isBatchDeleting ? "…" : t("profiles.v3.fab.delete"),
      tone: "danger",
      onClick: handleBatchDelete,
      disabled: isBatchDeleting,
    },
  ];

  return (
    <div className="flex flex-col min-h-0 flex-1 relative">
      {/* ── Sticky Toolbar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-5 h-12 border-b border-line flex-shrink-0">
        <div className="relative">
          <button
            onClick={() => setSortMenuOpen(v => !v)}
            className={`h-8 px-2.5 flex items-center gap-1.5 border border-line text-[12px] text-fg-2 hover:text-fg hover:border-line-2 transition-colors duration-fast ${sortMenuOpen ? "bg-s3" : "bg-s2"}`}
            style={{ borderRadius: "var(--r-md)" }}
          >
            <ArrowUpDown size={13} strokeWidth={1.75} className="text-fg-3" />
            {activeSortLabel}
            <ChevronDown size={12} strokeWidth={1.75} className="text-fg-4" />
          </button>
          <ThemedDropdown open={sortMenuOpen} onClose={() => setSortMenuOpen(false)} width="w-48">
            {SORT_OPTIONS.map(opt => (
              <ThemedDropdownItem
                key={opt.value}
                icon={opt.icon}
                selected={sortBy === opt.value}
                onClick={() => { setSortBy(opt.value); setSortMenuOpen(false); }}
              >
                {t(opt.labelKey)}
              </ThemedDropdownItem>
            ))}
          </ThemedDropdown>
        </div>

        <div className="flex-1" />

        <span className="cc-num text-[11px] text-fg-4">
          {t("profiles.v3.screenshots.count", { count: screenshots.length })}
        </span>

        <button
          onClick={loadData}
          disabled={loading}
          className="w-8 h-8 flex items-center justify-center text-fg-3 hover:text-fg hover:bg-s2 disabled:opacity-40 transition-colors duration-fast"
          style={{ borderRadius: "var(--r-md)" }}
          title={t("profiles.v3.toolbar.refresh")}
          aria-label={t("profiles.v3.toolbar.refresh")}
        >
          <RefreshCw size={15} strokeWidth={1.75} className={loading ? "animate-spin" : undefined} />
        </button>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 ${selectedPaths.size > 0 ? "pb-24" : ""}`}>
        {error && (
          <div
            className="mb-4 flex items-start gap-2.5 px-3 py-2 border border-err/30 bg-err/10"
            style={{ borderRadius: "var(--r-md)" }}
          >
            <AlertTriangle size={14} strokeWidth={1.75} className="text-err flex-shrink-0 mt-px" />
            <div className="flex-1 min-w-0 text-[12px] text-fg-2 break-words leading-[1.5]">{error}</div>
            <button
              onClick={loadData}
              className="flex-shrink-0 h-6 px-2 text-[12px] font-[520] text-err hover:bg-err/10 transition-colors duration-fast"
              style={{ borderRadius: "var(--r-sm)" }}
            >
              {t("profiles.v3.content.retry")}
            </button>
          </div>
        )}

        {loading && screenshots.length === 0 ? (
          shouldShowLoading ? (
            <div className="flex items-center justify-center gap-2 h-40 text-[12px] text-fg-3 animate-in fade-in duration-300">
              <Loader2 size={14} className="animate-spin" />
              {t("profiles.v3.content.loading")}
            </div>
          ) : (
            <div className="h-40" />
          )
        ) : visibleScreenshots.length === 0 ? (
          <EmptyStateV3
            icon="solar:gallery-bold-duotone"
            title={t("profiles.v3.screenshots.empty")}
            hint={t("profiles.v3.screenshots.emptyHint")}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {visibleScreenshots.map((s) => (
              <ScreenshotTile
                key={s.path}
                screenshot={s}
                accentColor={accentColor.value}
                isSelected={selectedPaths.has(s.path)}
                selectMode={selectedPaths.size > 0}
                onToggleSelection={() => toggleSelection(s.path)}
                onOpen={() => setModalScreenshot(s)}
              />
            ))}
          </div>
        )}
      </div>

      <FloatingActionBar
        visible={selectedPaths.size > 0}
        count={selectedPaths.size}
        totalCount={visibleScreenshots.length}
        accent={accentColor.value}
        allSelected={selectedPaths.size === visibleScreenshots.length && visibleScreenshots.length > 0}
        onSelectAll={() => setSelectedPaths(new Set(visibleScreenshots.map(s => s.path)))}
        onClear={() => setSelectedPaths(new Set())}
        actions={fabActions}
        batchProgress={null}
      />

      <ProfileScreenshotModal
        isOpen={modalScreenshot !== null}
        onClose={() => setModalScreenshot(null)}
        screenshot={modalScreenshot}
        onScreenshotDeleted={handleScreenshotDeleted}
      />
    </div>
  );
}

// ─── Screenshot Tile ────────────────────────────────────────────────────────
interface ScreenshotTileProps {
  screenshot: ScreenshotInfo;
  accentColor: string;
  isSelected: boolean;
  selectMode: boolean;
  onToggleSelection: () => void;
  onOpen: () => void;
}

const ScreenshotTile: React.FC<ScreenshotTileProps> = ({
  screenshot, accentColor, isSelected, selectMode, onToggleSelection, onOpen,
}) => {
  const { t } = useTranslation();
  // Intersection-Observer: Preview wird erst angefordert wenn das Tile in
  // den Viewport kommt. Vermeidet initial 200+ parallele Backend-Calls.
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: "300px" });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!inView || previewUrl || previewError) return;
    (async () => {
      try {
        const res = await getImagePreview({
          path: screenshot.path,
          width: PREVIEW_WIDTH,
          height: PREVIEW_HEIGHT,
          quality: PREVIEW_QUALITY,
        });
        if (!mountedRef.current) return;
        setPreviewUrl(`data:image/jpeg;base64,${res.base64_image}`);
      } catch (err) {
        console.error("[V3 Screenshots] Preview failed:", err);
        if (mountedRef.current) setPreviewError(true);
      }
    })();
  }, [inView, screenshot.path, previewUrl, previewError]);

  return (
    <div
      ref={ref}
      onClick={(e) => {
        // Klick in Select-Mode toggled Selection statt Modal zu oeffnen.
        if (selectMode) { e.stopPropagation(); onToggleSelection(); return; }
        onOpen();
      }}
      // selected = a light 2 px frame (like the checked checkbox), no accent glow
      className={`group relative aspect-video overflow-hidden bg-s2 border transition-colors duration-fast cursor-pointer ${
        isSelected ? "border-fg/80 outline outline-1 outline-fg/80" : "border-line hover:border-line-3"
      }`}
      style={{ borderRadius: "var(--r-md)" }}
    >
      {/* Preview / Placeholder / Error */}
      {previewError ? (
        <div className="w-full h-full flex items-center justify-center text-fg-4">
          <ImageOff size={20} strokeWidth={1.5} />
        </div>
      ) : previewUrl ? (
        <img
          src={previewUrl}
          alt=""
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
          style={{ imageRendering: "auto" }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-fg-4">
          <ImageIcon size={20} strokeWidth={1.5} />
        </div>
      )}

      {/* Hover overlay (dimmt Bild, zeigt Checkbox + Date) */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity ${
          isSelected ? "bg-black/25" : "bg-gradient-to-b from-black/40 via-transparent to-black/60 opacity-0 group-hover:opacity-100"
        }`}
      />

      {/* Selection-Checkbox: permanent sichtbar im Select-Mode oder bei Selected,
          sonst erst on-hover. Eigener pointer-events-auto damit Click nicht
          durch den Overlay blockiert wird. */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleSelection(); }}
        className={`absolute top-2 left-2 pointer-events-auto transition-opacity ${
          selectMode || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        title={isSelected ? t("profiles.v3.tile.deselect") : t("profiles.v3.tile.select")}
      >
        <div
          className={`w-5 h-5 border flex items-center justify-center transition-colors duration-fast ${
            isSelected ? "bg-fg border-fg" : "bg-black/55 border-white/60 hover:border-white"
          }`}
          style={{ borderRadius: "var(--r-sm)" }}
        >
          {isSelected && <Check size={13} strokeWidth={2.5} className="text-bg" />}
        </div>
      </button>

      {/* Date-Badge unten links — nur bei Hover sichtbar */}
      <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="cc-num text-[10.5px] text-fg bg-black/70 px-1.5 py-0.5" style={{ borderRadius: "var(--r-sm)" }}>
          {formatRelativeTime(screenshot.modified)}
        </span>
      </div>
    </div>
  );
};
