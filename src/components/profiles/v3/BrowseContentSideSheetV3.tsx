"use client";

/**
 * BrowseContentSideSheetV3 — "Add content" as a docked right-side panel.
 *
 * Deliberately NOT styled like the shared `Modal`: a sheet is a docked
 * surface that extends the parent view, not a floating card demanding
 * focus. So the header uses the V3 profile-detail top-bar vocabulary
 * (h-11 toolbar, title / profile breadcrumb) and the backdrop is lighter,
 * signalling "non-blocking side task" instead of "stop everything".
 *
 * Mod detail is pushed onto a stacked layer inside the sheet (see the
 * `detail` state + `onProjectClick` path below) rather than routing
 * away, so the user never loses the current search or scroll position.
 */

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { Profile } from "../../../types/profile";
import type { ContentInstallTarget } from "../../../types/content";
import type { LocalContentType } from "../../../hooks/useLocalContentManager";
import type { ModrinthProjectType } from "../../../types/modrinth";
import { ModrinthSearchV2 } from "../../modrinth/v2/ModrinthSearchV2";
import { ModDetailPage } from "../../mods/ModDetailPage";
import { useModSearchStoreSnapshot } from "./useModSearchStoreSnapshot";

export interface BrowseContentSideSheetV3Props {
  open: boolean;
  profile: Profile;
  contentType: LocalContentType;
  onClose: () => void;
  onInstallSuccess?: () => void;
  installTarget?: ContentInstallTarget;
  installedOverride?: { projectIds: string[]; versionIds: string[] } | null;
}

const CONTENT_TO_PROJECT: Partial<Record<LocalContentType, ModrinthProjectType>> = {
  Mod: "mod",
  ResourcePack: "resourcepack",
  ShaderPack: "shader",
  DataPack: "datapack",
};

export function BrowseContentSideSheetV3({
  open,
  profile,
  contentType,
  onClose,
  onInstallSuccess,
  installTarget,
  installedOverride,
}: BrowseContentSideSheetV3Props) {
  const { t } = useTranslation();
  const isPackTarget = installTarget?.type === "syncPack";
  const projectType = isPackTarget
    ? "mod"
    : CONTENT_TO_PROJECT[contentType] ?? "mod";

  // In-sheet mod detail stack — clicking a project tile pushes its id onto
  // this piece of state instead of navigating, so the sheet stays mounted
  // and the user returns to the same search with one click. Reset whenever
  // the sheet re-opens so a fresh open never lands inside a detail view
  // from a prior session.
  const [detail, setDetail] = useState<{ source: "modrinth" | "curseforge"; projectId: string } | null>(null);
  useEffect(() => { if (!open) setDetail(null); }, [open]);
  const handleProjectClick = useCallback(
    (project: any, source: "modrinth" | "curseforge") => {
      setDetail({ source, projectId: project.project_id });
    },
    [],
  );

  // Isolate the profile-scoped filters from the standalone /mods tab —
  // otherwise the game_version / loader auto-applied inside the sheet bleed
  // into the next time the user visits the standalone search.
  useModSearchStoreSnapshot(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Stack-aware: ESC pops the detail layer first if it's open, so the
      // user doesn't accidentally blow away the whole sheet from a nested
      // view. A second ESC then closes the sheet itself.
      if (detail) {
        setDetail(null);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, detail]);

  if (!open) return null;

  const title =
    isPackTarget                   ? t("profiles.content.addMods") :
    contentType === "Mod"          ? t("profiles.content.addMods") :
    contentType === "ResourcePack" ? t("profiles.content.addResourcePacks") :
    contentType === "ShaderPack"   ? t("profiles.content.addShaderPacks") :
    contentType === "DataPack"     ? t("profiles.content.addDataPacks") :
    t("profiles.content.addMods");

  return createPortal(
    <>
      {/* Backdrop: lighter than a modal, the sheet is a docked side task, not a blocking dialog. */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 bg-black/45 z-[1000] animate-in fade-in duration-150"
      />

      {/* Sheet: docked to the right edge, a flat page surface with a hairline on the docked side. */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed right-0 top-0 h-full w-[82vw] min-w-[640px] max-w-[1300px] z-[1001] flex flex-col bg-bg border-l border-line-2 shadow-pop animate-in slide-in-from-right duration-200 overflow-hidden"
      >
        {/* Header in the detail view's top-bar spec. With a mod detail stacked on top it becomes a
            back button, so the user can pop just the detail layer without closing the sheet. */}
        <div className="flex items-center justify-between px-5 h-11 border-b border-line flex-shrink-0 relative">
          <div className="flex items-center gap-2 min-w-0 text-[13px]">
            {detail ? (
              <button
                onClick={() => setDetail(null)}
                className="flex items-center gap-1.5 text-fg-2 hover:text-fg transition-colors duration-fast"
                title={t("common.back")}
              >
                <ArrowLeft size={15} strokeWidth={1.75} />
                <span className="font-[560]">{title}</span>
              </button>
            ) : (
              <span className="font-[560] text-fg truncate">{title}</span>
            )}
            <span className="text-fg-4">/</span>
            <span className="text-fg-3 truncate max-w-[280px]">
              {isPackTarget ? installTarget.packName : profile.name || profile.id}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-fg-4">
            <span className="hidden sm:inline-flex items-center gap-1.5">
              <kbd
                className="cc-num text-[11px] leading-none px-1.5 py-1 bg-s2 border border-line text-fg-3"
                style={{ borderRadius: "var(--r-sm)" }}
              >
                esc
              </kbd>
              <span>{t("common.close")}</span>
            </span>
            <button
              onClick={onClose}
              className="cc-icon-btn"
              title={t("common.close")}
              aria-label={t("common.close")}
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Body — padding matches BrowseTab so the filter sidebar + grid keep
            their usual breathing room; scrollbar stays clear of the edge.
            The search stays mounted even when the detail layer is stacked
            on top so the user's search state, scroll position, filters, and
            pagination all survive the detail round-trip intact. */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          {/* Base layer: search. `hidden` (display:none) when the detail is
              open — `visibility:hidden` was leaking because the filter
              sidebar's descendants opened their own stacking contexts and
              refused to inherit the hide. ModrinthSearchV2's filter/search
              state is persisted in the `useModSearchStore` zustand store,
              so the React component stays mounted and its data survives;
              only rendering is skipped. */}
          <div className={`absolute inset-0 p-4 ${detail ? "hidden" : ""}`}>
            <ModrinthSearchV2
              profiles={[profile]}
              selectedProfileId={profile.id}
              onProjectClick={handleProjectClick}
              initialProjectType={projectType}
              allowedProjectTypes={
                isPackTarget
                  ? ["mod"]
                  : ["mod", "resourcepack", "shader", "datapack"]
              }
              // Sidebar on by default — at 82vw the filter rail fits
              // without eating into the grid, and it's the first thing
              // users reach for when browsing Modrinth.
              initialSidebarVisible={true}
              overrideDisplayContext="detail"
              disableVirtualization={true}
              onInstallSuccess={onInstallSuccess}
              installTarget={installTarget}
              installedOverride={installedOverride}
              className="h-full"
            />
          </div>

          {/* Stacked layer: mod detail. Transparent wrapper — the sheet
              panel below already provides the glass surface + backdrop-
              blur, so re-applying them here stacks two blurs on top of
              each other and the result reads as opaque (the inner blur
              sees the outer's dark result and just blurs that again). By
              inheriting the sheet's glass the detail page shows through
              the same way the search does. */}
          {detail && (
            <div className="absolute inset-0 animate-in fade-in slide-in-from-right-4 duration-200">
              <ModDetailPage
                sourceOverride={detail.source}
                projectIdOverride={detail.projectId}
                onBack={() => setDetail(null)}
                hideBackButton
                targetProfile={profile}
                installTarget={installTarget}
              />
            </div>
          )}
        </div>
      </aside>
    </>,
    document.body,
  );
}
