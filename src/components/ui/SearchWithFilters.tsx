"use client";

import { useRef } from "react";
import { Search, X } from "lucide-react";
import { StableIcon } from "./IconWrapper";
import { CustomDropdown } from "./CustomDropdown";
import type { DropdownOption } from "./CustomDropdown";

export interface SearchWithFiltersProps {
  /** Placeholder text for the search input */
  placeholder?: string;
  /** Current search value */
  searchValue?: string;
  /** Callback when search value changes */
  onSearchChange?: (value: string) => void;
  /** Callback when Enter is pressed in search input */
  onSearchEnter?: (value: string) => void;
  /** Sort options for the sort dropdown */
  sortOptions?: DropdownOption[];
  /** Current sort value */
  sortValue?: string;
  /** Callback when sort value changes */
  onSortChange?: (value: string) => void;
  /** Filter options for the filter dropdown */
  filterOptions?: DropdownOption[];
  /** Current filter value */
  filterValue?: string;
  /** Callback when filter value changes */
  onFilterChange?: (value: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Optional icon for the search input */
  searchIcon?: string;
  /** Whether to show the sort dropdown */
  showSort?: boolean;
  /** Whether to show the filter dropdown */
  showFilter?: boolean;
  /** Custom filter control rendered in the filter slot (inside the search bar), replacing the default dropdown. */
  filterSlot?: React.ReactNode;
  dropdownSize?: 'sm' | 'md';
  compact?: boolean;
}

export function SearchWithFilters({
  placeholder = "Search...",
  searchValue = "",
  onSearchChange,
  onSearchEnter,
  sortOptions = [],
  sortValue = "",
  onSortChange,
  filterOptions = [],
  filterValue = "",
  onFilterChange,
  className = "",
  searchIcon = "solar:magnifer-bold",
  showSort = true,
  showFilter = true,
  filterSlot,
  dropdownSize = 'md',
  compact = false,
}: SearchWithFiltersProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange?.(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearchEnter) {
      onSearchEnter(searchValue);
    }
  };

  const handleClearSearch = () => {
    onSearchChange?.("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const showSortSection = showSort && sortOptions.length > 0;
  const showFilterSection = showFilter && filterOptions.length > 0;
  const hasSearchValue = Boolean(searchValue);

  const separator = <div className="h-4 w-px bg-line-2 mx-1 shrink-0" />;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Search with integrated filters */}
      <div
        className={`group flex items-center gap-1 bg-s2 rounded-md border border-line [&:hover:not(:focus-within)]:border-line-2 focus-within:border-line-3 transition-colors duration-fast ${
          compact ? "h-8 pl-2.5 pr-1 w-full" : "h-9 pl-3 pr-1 flex-1 max-w-md"
        }`}
        onClick={(e) => {
          if (e.target === e.currentTarget) inputRef.current?.focus();
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 h-full">
          {searchIcon === "solar:magnifer-bold" ? (
            <Search size={compact ? 14 : 15} strokeWidth={1.75} className="text-fg-3 shrink-0 group-focus-within:text-fg-2 transition-colors duration-fast" />
          ) : (
            <StableIcon icon={searchIcon} className="w-4 h-4 text-fg-3 shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={searchValue}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            className="bg-transparent text-fg placeholder:text-fg-4 text-[13px] flex-1 min-w-0 h-full outline-none"
            spellCheck={false}
            autoComplete="off"
          />
          {hasSearchValue && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Clear search"
              className="flex items-center justify-center w-6 h-6 rounded-sm text-fg-3 hover:text-fg hover:bg-s3 transition-colors duration-fast shrink-0"
            >
              <X size={14} strokeWidth={1.75} />
            </button>
          )}
        </div>

        {/* Sort Filter */}
        {showSortSection && (
          <>
            {separator}
            <div className="relative shrink-0">
              <CustomDropdown
                label=""
                value={sortValue}
                onChange={onSortChange}
                options={sortOptions}
                className="w-auto"
                size={dropdownSize}
              />
            </div>
          </>
        )}

        {/* Version/Filter */}
        {filterSlot ? (
          <>
            {separator}
            <div className="relative shrink-0">{filterSlot}</div>
          </>
        ) : (
          showFilterSection && (
            <>
              {separator}
              <div className="relative shrink-0">
                <CustomDropdown
                  label=""
                  value={filterValue}
                  onChange={onFilterChange}
                  options={filterOptions}
                  className="w-auto"
                  size={dropdownSize}
                />
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
