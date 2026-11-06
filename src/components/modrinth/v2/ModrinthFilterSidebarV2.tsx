"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type {
  ModrinthProjectType,
  ModrinthCategory,
  ModrinthGameVersion,
  ModrinthLoader,
} from '../../../types/modrinth';
import type { AccentColor } from '../../../store/useThemeStore';

// Re-define UIDynamicFilterGroup if it's specific to the sidebar and not used elsewhere globally
// For now, assuming it might be defined in the parent or a shared types file if used elsewhere.
// If not, it should be defined here.
interface UIDynamicFilterGroup {
  accordionTitle: string;
  headerValue: string;
  options: ModrinthCategory[];
}

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  activeCount?: number;
  totalCount?: number;
}

/** One group of the filter column: eyebrow heading (click to fold), counts in mono, rows below. */
const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  children,
  defaultOpen = false,
  activeCount = 0,
  totalCount,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen || activeCount > 0);

  return (
    <section className="py-3 border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="group w-full h-6 flex items-center gap-1.5 text-left"
      >
        <span className="cc-eyebrow truncate group-hover:text-fg-2 transition-colors duration-fast">{title}</span>
        <span className="flex-1" />
        {activeCount > 0 ? (
          <span className="cc-num text-[11px] text-fg-2">{activeCount}</span>
        ) : totalCount !== undefined ? (
          <span className="cc-num text-[11px] text-fg-4">{totalCount}</span>
        ) : null}
        <ChevronDown
          size={13}
          strokeWidth={1.75}
          className={cn("text-fg-4 transition-transform duration-med", isOpen ? "rotate-0" : "-rotate-90")}
        />
      </button>

      {isOpen && <div className="mt-1.5">{children}</div>}
    </section>
  );
};

// FilterOption component for consistent styling
const FilterOption = ({
  label,
  hint,
  mono,
  isSelected,
  onClick,
}: {
  label: string;
  /** versions and other numbers */
  mono?: boolean;
  /** small mono note on the right, e.g. the version type */
  hint?: string;
  icon?: React.ReactNode | string;
  isSelected: boolean;
  onClick: () => void;
  accentColor?: AccentColor;
}) => {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isSelected}
      onClick={onClick}
      className={cn(
        "group w-full h-7 flex items-center gap-2.5 px-1.5 -mx-1.5 text-left transition-colors duration-fast hover:bg-s2",
        isSelected ? "text-fg" : "text-fg-2 hover:text-fg",
      )}
      style={{ borderRadius: "var(--r-sm)", width: "calc(100% + 12px)" }}
    >
      <span
        className={cn(
          "w-3.5 h-3.5 flex-shrink-0 grid place-items-center border transition-colors duration-fast",
          isSelected ? "bg-fg border-fg text-bg" : "border-line-3 group-hover:border-fg-3",
        )}
        style={{ borderRadius: 3 }}
      >
        {isSelected && <Check size={11} strokeWidth={3} />}
      </span>
      <span className={cn("flex-1 min-w-0 truncate", mono ? "cc-num text-[12px]" : "text-[13px] capitalize")}>{label}</span>
      {hint && <span className="cc-num text-[10.5px] text-fg-4 flex-shrink-0">{hint}</span>}
    </button>
  );
};

interface ModrinthFilterSidebarV2Props {
  projectType: ModrinthProjectType;
  accentColor: AccentColor;
  // Game Version Filter Props
  gameVersionSearchTerm: string;
  onGameVersionSearchTermChange: (term: string) => void;
  displayedGameVersions: ModrinthGameVersion[];
  selectedGameVersions: string[];
  onGameVersionToggle: (version: string) => void;
  showAllGameVersionsSidebar: boolean;
  onShowAllGameVersionsSidebarChange: (show: boolean) => void;
  // Loader Filter Props
  availableLoaders: ModrinthLoader[]; // Already sorted and filtered by projectType
  currentSelectedLoaders: string[];
  onLoaderToggle: (loaderName: string) => void;
  allLoadersData: ModrinthLoader[]; // For icons
  // Dynamic Category Filter Props
  dynamicFilterGroups: UIDynamicFilterGroup[];
  currentSelectedCategories: string[];
  onCategoryToggle: (categoryName: string) => void;
  // Environment Filter Props
  filterClientRequired: boolean;
  onClientRequiredToggle: () => void;
  filterServerRequired: boolean;
  onServerRequiredToggle: () => void;
}

/** The quiet filter column left of the results. */
export const ModrinthFilterSidebarV2: React.FC<ModrinthFilterSidebarV2Props> = ({
  projectType,
  accentColor,
  gameVersionSearchTerm,
  onGameVersionSearchTermChange,
  displayedGameVersions,
  selectedGameVersions,
  onGameVersionToggle,
  showAllGameVersionsSidebar,
  onShowAllGameVersionsSidebarChange,
  availableLoaders,
  currentSelectedLoaders,
  onLoaderToggle,
  allLoadersData,
  dynamicFilterGroups,
  currentSelectedCategories,
  onCategoryToggle,
  filterClientRequired,
  onClientRequiredToggle,
  filterServerRequired,
  onServerRequiredToggle,
}) => {
  const { t } = useTranslation();
  // Extract the 'Categories' group if it exists
  const categoriesGroup = dynamicFilterGroups.find(
    group => group.headerValue.toLowerCase() === 'categories'
  );

  // Filter out the 'Categories' group from the main list to avoid rendering it twice
  const otherDynamicGroups = dynamicFilterGroups.filter(
    group => group.headerValue.toLowerCase() !== 'categories'
  );

  // Calculate counts for badges
  const totalGameVersionFilters = selectedGameVersions.length;
  const totalLoaderFilters = currentSelectedLoaders.length;
  const totalEnvironmentFilters = (filterClientRequired ? 1 : 0) + (filterServerRequired ? 1 : 0);

  const dynamicGroupCounts = dynamicFilterGroups.reduce(
    (acc, group) => {
      acc[group.headerValue] = group.options.filter((opt) =>
        currentSelectedCategories.includes(opt.name),
      ).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  const categoryActiveCount = (categoriesGroup && dynamicGroupCounts[categoriesGroup.headerValue]) || 0;
  const emptyNote = "px-0 py-1 text-[12px] text-fg-4";

  return (
    <aside
      className="filters-sidebar w-[204px] flex-shrink-0 h-full overflow-y-auto scrollbar-hover pr-4 border-r border-line"
    >
      {/* Hardcoded Categories filter for project types other than 'datapack' */}
      {projectType !== 'datapack' && (
        <FilterSection
          key={categoriesGroup?.headerValue || "categories_filter_accordion"} // Use a fallback key
          title={categoriesGroup?.accordionTitle || t('modrinth.categories')} // Use a fallback title
          defaultOpen
          activeCount={categoryActiveCount}
          totalCount={categoriesGroup?.options.length}
        >
          {categoriesGroup && categoriesGroup.options.length > 0 ? (
            categoriesGroup.options.map(cat => (
              <FilterOption
                key={cat.name}
                label={cat.name.replace(/-/g, " ")}
                isSelected={currentSelectedCategories.includes(cat.name)}
                onClick={() => onCategoryToggle(cat.name)}
              />
            ))
          ) : (
            <p className={emptyNote}>{t('mods.filters.no_options')}</p>
          )}
        </FilterSection>
      )}

      <FilterSection
        title={t('modrinth.game_versions')}
        defaultOpen={totalGameVersionFilters > 0}
        activeCount={totalGameVersionFilters}
        totalCount={displayedGameVersions.length}
      >
        <label
          className="h-7 mb-1.5 flex items-center gap-2 px-2 bg-s2 border border-line focus-within:border-line-3 transition-colors duration-fast"
          style={{ borderRadius: "var(--r-sm)" }}
        >
          <Search size={13} strokeWidth={1.75} className="text-fg-3 flex-shrink-0" />
          <input
            type="text"
            placeholder={t('placeholders.search_version')}
            value={gameVersionSearchTerm}
            onChange={(e) => onGameVersionSearchTermChange(e.target.value)}
            className="bg-transparent text-fg placeholder:text-fg-4 cc-num text-[12px] flex-1 outline-none min-w-0"
          />
        </label>

        <div className="max-h-[248px] overflow-y-auto scrollbar-hover -mr-2 pr-2">
          {displayedGameVersions.map((gv) => (
            <FilterOption
              key={gv.version}
              label={gv.version}
              mono
              hint={gv.version_type !== "release" ? gv.version_type : undefined}
              isSelected={selectedGameVersions.includes(gv.version)}
              onClick={() => onGameVersionToggle(gv.version)}
            />
          ))}
          {displayedGameVersions.length === 0 && (
            <p className={emptyNote}>{t('modrinth.no_matching_versions')}</p>
          )}
        </div>

        <div className="mt-1.5 pt-1.5 border-t border-line">
          <FilterOption
            label={t('mods.filters.show_snapshots')}
            isSelected={showAllGameVersionsSidebar}
            onClick={() => onShowAllGameVersionsSidebarChange(!showAllGameVersionsSidebar)}
          />
        </div>
      </FilterSection>

      <FilterSection
        title={t('modrinth.mod_loaders')}
        defaultOpen={totalLoaderFilters > 0 || projectType === 'mod'}
        activeCount={totalLoaderFilters}
        totalCount={availableLoaders.length}
      >
        {availableLoaders.map(loader => {
          const fullLoaderData = allLoadersData.find(l => l.name === loader.name);
          return (
            <FilterOption
              key={loader.name}
              label={loader.name}
              icon={fullLoaderData?.icon}
              isSelected={currentSelectedLoaders.includes(loader.name)}
              onClick={() => onLoaderToggle(loader.name)}
            />
          );
        })}
        {availableLoaders.length === 0 && <p className={emptyNote}>{t('modrinth.no_loaders_for', { type: projectType })}</p>}
      </FilterSection>

      {/* Render other dynamic groups here */}
      {otherDynamicGroups.map(group => (
        <FilterSection
          key={group.headerValue}
          title={group.accordionTitle}
          defaultOpen={dynamicGroupCounts[group.headerValue] > 0}
          activeCount={dynamicGroupCounts[group.headerValue]}
          totalCount={group.options.length}
        >
          {group.options.length > 0 ? group.options.map(cat => (
            <FilterOption
              key={cat.name}
              label={cat.name.replace(/-/g, " ")}
              isSelected={currentSelectedCategories.includes(cat.name)}
              onClick={() => onCategoryToggle(cat.name)}
            />
          )) : (
            <p className={emptyNote}>{t('modrinth.no_options_for', { title: group.accordionTitle })}</p>
          )}
        </FilterSection>
      ))}

      <FilterSection
        title={t('modrinth.environment')}
        defaultOpen={totalEnvironmentFilters > 0}
        activeCount={totalEnvironmentFilters}
        totalCount={2}
      >
        <FilterOption
          label={t('modrinth.client')}
          isSelected={filterClientRequired}
          onClick={onClientRequiredToggle}
        />
        <FilterOption
          label={t('modrinth.server')}
          isSelected={filterServerRequired}
          onClick={onServerRequiredToggle}
        />
      </FilterSection>
    </aside>
  );
};
