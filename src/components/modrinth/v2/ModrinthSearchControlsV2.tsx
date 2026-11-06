"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown, SlidersHorizontal, X } from "lucide-react";
import type {
  ModrinthProjectType,
} from "../../../types/modrinth";
import { UnifiedSortType, ModPlatform } from "../../../types/unified";
// Profile type will be defined locally
import { SearchWithFilters } from "../../ui/SearchWithFilters";
import { useDisplayContextStore } from "../../../store/useDisplayContextStore";
import { ProfileIconV2 } from "../../profiles/ProfileIconV2";
import { cn } from "../../../lib/utils";

/** CurseForge search stays hidden until CrimeClient has its own CurseForge API key (src-tauri integrations/curseforge.rs). */
const CURSEFORGE_ENABLED = false;

/** Display order of the content types in the segment control. */
const TYPE_ORDER: ModrinthProjectType[] = ["mod", "resourcepack", "shader", "datapack", "modpack"];

// Define Profile type locally, similar to ModrinthSearchV2.tsx
type Profile = any;

export // Define SelectOption type locally
interface SelectOption {
  value: UnifiedSortType;
  label: string;
  icon?: string;
}

interface ModrinthSearchControlsV2Props {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  projectType: ModrinthProjectType;
  onProjectTypeChange: (type: ModrinthProjectType) => void;
  allProjectTypes: ModrinthProjectType[]; // This will be ALL_MODRINTH_PROJECT_TYPES from parent
  profiles: Profile[];
  selectedProfile: Profile | null;
  onSelectedProfileChange: (profile: Profile | null) => void;
  sortOrder: UnifiedSortType;
  onSortOrderChange: (sort: UnifiedSortType) => void;
  sortOptions: SelectOption[];
  isSidebarVisible: boolean;
  onToggleSidebar: () => void;
  selectedGameVersions: string[];
  currentSelectedLoaders: string[];
  currentSelectedCategories: string[];
  filterClientRequired: boolean;
  filterServerRequired: boolean;
  onRemoveGameVersionTag: (version: string) => void;
  onRemoveLoaderTag: (loader: string) => void;
  onRemoveCategoryTag: (category: string) => void;
  onRemoveClientRequiredTag: () => void;
  onRemoveServerRequiredTag: () => void;
  onClearAllFilters: () => void;
  overrideDisplayContext?: "detail" | "standalone";
  modSource: ModPlatform;
  onModSourceChange: (source: ModPlatform) => void;
}

/** Toolbar of the content search: content type and target, then search with sort and the filter toggle, then active filters. */
export const ModrinthSearchControlsV2: React.FC<
  ModrinthSearchControlsV2Props
> = ({
  searchTerm,
  onSearchTermChange,
  projectType,
  onProjectTypeChange,
  allProjectTypes,
  profiles,
  selectedProfile,
  onSelectedProfileChange,
  sortOrder,
  onSortOrderChange,
  sortOptions,
  isSidebarVisible,
  onToggleSidebar,
  selectedGameVersions,
  currentSelectedLoaders,
  currentSelectedCategories,
  filterClientRequired,
  filterServerRequired,
  onRemoveGameVersionTag,
  onRemoveLoaderTag,
  onRemoveCategoryTag,
  onRemoveClientRequiredTag,
  onRemoveServerRequiredTag,
  onClearAllFilters,
  overrideDisplayContext,
  modSource,
  onModSourceChange,
}) => {
  const { t } = useTranslation();
  const globalDisplayContext = useDisplayContextStore((state) => state.context);
  const effectiveDisplayContext =
    overrideDisplayContext || globalDisplayContext;
  const isDetailView = effectiveDisplayContext === "detail";

  // Calculate total number of active filters
  const totalFilters =
    selectedGameVersions.length +
    currentSelectedLoaders.length +
    currentSelectedCategories.length +
    (filterClientRequired ? 1 : 0) +
    (filterServerRequired ? 1 : 0);

  const types = [...allProjectTypes].sort((a, b) => TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b));
  const sources: { id: ModPlatform; label: string; icon: string; title: string }[] = [
    { id: ModPlatform.Modrinth, label: "Modrinth", icon: "https://cdn.modrinth.com/modrinth-new.png", title: t('content.search_modrinth') },
    // CurseForge needs an API key of our own (the upstream one is Prism's); hidden until there is one
    ...(CURSEFORGE_ENABLED
      ? [{ id: ModPlatform.CurseForge, label: "CurseForge", icon: "/icons/curseforge.svg", title: t('content.search_curseforge') }]
      : []),
  ];

  return (
    <div className="flex-shrink-0 flex flex-col gap-2.5 pb-3 border-b border-line">
      {/* content type, source, target profile */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          role="tablist"
          className="flex items-center gap-px p-0.5 bg-s2 border border-line min-w-0 overflow-x-auto no-scrollbar"
          style={{ borderRadius: "var(--r-md)" }}
        >
          {types.map((type) => {
            const active = type === projectType;
            return (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onProjectTypeChange(type)}
                className={cn(
                  "h-7 px-3 text-[13px] font-[520] whitespace-nowrap transition-colors duration-fast",
                  active ? "bg-s3 text-fg shadow-[inset_0_0_0_1px_var(--line-2)]" : "text-fg-3 hover:text-fg-2",
                )}
                style={{ borderRadius: "var(--r-sm)" }}
              >
                {t(`mods.type.${type}`)}
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        <div
          className="flex items-center gap-px p-0.5 bg-s2 border border-line flex-shrink-0"
          style={{ borderRadius: "var(--r-md)" }}
          title={t('mods.source.title')}
        >
          {sources.map((source) => {
            const active = source.id === modSource || sources.length === 1;
            return (
              <button
                key={source.id}
                type="button"
                onClick={() => onModSourceChange(source.id)}
                title={source.title}
                className={cn(
                  "h-7 flex items-center gap-1.5 px-2.5 text-[13px] font-[520] transition-colors duration-fast",
                  active ? "bg-s3 text-fg" : "text-fg-3 hover:text-fg-2",
                )}
                style={{ borderRadius: "var(--r-sm)" }}
              >
                <img src={source.icon} alt="" className="w-3.5 h-3.5 object-contain" draggable={false} />
                <span className="hidden xl:inline">{source.label}</span>
              </button>
            );
          })}
        </div>

        <TargetProfilePicker
          profiles={profiles}
          selectedProfile={selectedProfile}
          onChange={onSelectedProfileChange}
          locked={isDetailView && profiles.length <= 1 && !!selectedProfile}
        />
      </div>

      {/* filter toggle, search with sort */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-pressed={isSidebarVisible}
          title={isSidebarVisible ? t('content.filters.hide') : t('content.filters.show')}
          className={cn(
            "h-9 flex-shrink-0 flex items-center gap-2 px-3 border text-[13px] font-[520] transition-colors duration-fast",
            isSidebarVisible
              ? "bg-s3 border-line-2 text-fg"
              : "bg-s2 border-line text-fg-2 hover:text-fg hover:border-line-2",
          )}
          style={{ borderRadius: "var(--r-md)" }}
        >
          <SlidersHorizontal size={15} strokeWidth={1.75} />
          <span>{t('mods.filters.toggle')}</span>
          {totalFilters > 0 && <span className="cc-num text-[11px] text-fg-2">{totalFilters}</span>}
        </button>

        <div className="flex-1 min-w-0">
          <SearchWithFilters
            placeholder={t(`mods.search.placeholder.${projectType}`)}
            searchValue={searchTerm}
            onSearchChange={onSearchTermChange}
            sortOptions={sortOptions}
            sortValue={sortOrder}
            onSortChange={(value) => onSortOrderChange(value as UnifiedSortType)}
            showFilter={false}
            compact
            className="w-full"
          />
        </div>
      </div>

      {/* active filters */}
      {totalFilters > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {selectedGameVersions.map((version) => (
            <FilterChip key={`gv-${version}`} mono onRemove={() => onRemoveGameVersionTag(version)}>
              {version}
            </FilterChip>
          ))}
          {currentSelectedLoaders.map((loader) => (
            <FilterChip key={`loader-${loader}`} onRemove={() => onRemoveLoaderTag(loader)}>
              {loader}
            </FilterChip>
          ))}
          {currentSelectedCategories.map((category) => (
            <FilterChip key={`cat-${category}`} onRemove={() => onRemoveCategoryTag(category)}>
              {category.replace(/-/g, " ")}
            </FilterChip>
          ))}
          {filterClientRequired && (
            <FilterChip key="client-req" onRemove={onRemoveClientRequiredTag}>
              {t('content.filters.client')}
            </FilterChip>
          )}
          {filterServerRequired && (
            <FilterChip key="server-req" onRemove={onRemoveServerRequiredTag}>
              {t('content.filters.server')}
            </FilterChip>
          )}
          <button
            type="button"
            onClick={onClearAllFilters}
            className="h-6 px-1.5 text-[12px] text-fg-3 hover:text-fg transition-colors duration-fast"
          >
            {t('mods.filters.clear')}
          </button>
        </div>
      )}
    </div>
  );
};

function FilterChip({ children, onRemove, mono }: { children: React.ReactNode; onRemove: () => void; mono?: boolean }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="group h-6 inline-flex items-center gap-1 pl-2 pr-1 bg-s2 border border-line text-[12px] text-fg-2 hover:text-fg hover:border-line-2 transition-colors duration-fast whitespace-nowrap"
      style={{ borderRadius: "var(--r-sm)" }}
    >
      <span className={cn(mono ? "cc-num text-[11.5px]" : "capitalize")}>{children}</span>
      <X size={12} strokeWidth={1.75} className="text-fg-3 group-hover:text-fg" />
    </button>
  );
}

const LOADER_LABELS: Record<string, string> = {
  vanilla: "vanilla",
  fabric: "fabric",
  forge: "forge",
  quilt: "quilt",
  neoforge: "neoforge",
};

/** Which profile installs land in (also narrows the search to its version and loader). */
function TargetProfilePicker({
  profiles,
  selectedProfile,
  onChange,
  locked,
}: {
  profiles: Profile[];
  selectedProfile: Profile | null;
  onChange: (profile: Profile | null) => void;
  locked: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  const meta = (p: Profile) => `${LOADER_LABELS[p.loader] ?? p.loader ?? ""} ${p.game_version ?? ""}`.trim();

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        disabled={locked}
        onClick={() => setOpen((o) => !o)}
        title={t('mods.target.title')}
        className={cn(
          "h-[34px] max-w-[240px] flex items-center gap-2 pl-1.5 pr-2 border text-left transition-colors duration-fast",
          open ? "bg-s3 border-line-2" : "bg-s2 border-line",
          locked ? "cursor-default" : "hover:border-line-2 hover:bg-s3",
        )}
        style={{ borderRadius: "var(--r-md)" }}
      >
        {selectedProfile ? (
          <ProfileIconV2 profile={selectedProfile} size="xs" className="!w-5 !h-5 flex-shrink-0" />
        ) : (
          <span className="w-5 h-5 flex-shrink-0 border border-dashed border-line-2" style={{ borderRadius: "var(--r-sm)" }} />
        )}
        <span className="min-w-0 flex items-baseline gap-2">
          <span className={cn("text-[13px] font-[540] truncate", selectedProfile ? "text-fg" : "text-fg-3")}>
            {selectedProfile ? selectedProfile.name : t('mods.target.none')}
          </span>
          {selectedProfile && <span className="hidden xl:inline cc-num text-[11px] text-fg-3 whitespace-nowrap">{meta(selectedProfile)}</span>}
        </span>
        {!locked && <ChevronsUpDown size={14} className="text-fg-3 flex-shrink-0" />}
      </button>

      {open && !locked && (
        <div className="cc-popover cc-pop absolute right-0 top-[calc(100%+6px)] z-50 w-[280px] p-1">
          <div className="px-2 pt-1.5 pb-1 cc-eyebrow">{t('mods.target.heading')}</div>
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
            <PickerRow
              active={!selectedProfile}
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              icon={<span className="w-6 h-6 border border-dashed border-line-2" style={{ borderRadius: "var(--r-sm)" }} />}
              title={t('mods.target.none')}
              subtitle={t('mods.target.none_hint')}
            />
            {profiles.map((p) => (
              <PickerRow
                key={p.id}
                active={selectedProfile?.id === p.id}
                onClick={() => {
                  onChange(p);
                  setOpen(false);
                }}
                icon={<ProfileIconV2 profile={p} size="xs" className="!w-6 !h-6" />}
                title={p.name}
                subtitle={meta(p)}
                mono
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PickerRow({
  active,
  onClick,
  icon,
  title,
  subtitle,
  mono,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  mono?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-2 py-1.5 text-left transition-colors duration-fast",
        active ? "bg-s3" : "hover:bg-s3",
      )}
      style={{ borderRadius: "var(--r-sm)" }}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-[540] text-fg truncate">{title}</span>
        {subtitle && <span className={cn("block text-[11px] text-fg-3 truncate", mono && "cc-num")}>{subtitle}</span>}
      </span>
      {active && <Check size={14} className="text-fg-2 flex-shrink-0" />}
    </button>
  );
}
