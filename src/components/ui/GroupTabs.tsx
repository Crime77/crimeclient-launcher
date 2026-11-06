"use client";

import { Icon } from "@iconify/react";
import { Plus } from "lucide-react";
import { cn } from "../../lib/utils";

export interface GroupTab {
  /** Unique identifier for the group */
  id: string;
  /** Display name of the group */
  name: string;
  /** Number of items in this group */
  count: number;
  /** Optional icon for the group */
  icon?: string;
}

export interface GroupTabsProps {
  /** Array of group tabs to display */
  groups: GroupTab[];
  /** Currently active group ID */
  activeGroup: string;
  /** Callback when a group is selected */
  onGroupChange: (groupId: string) => void;
  /** Whether to show the "Add Group" button */
  showAddButton?: boolean;
  /** Callback when the "Add Group" button is clicked */
  onAddGroup?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Custom add button text */
  addButtonText?: string;
  /** Custom add button icon */
  addButtonIcon?: string;
}

export function GroupTabs({
  groups,
  activeGroup,
  onGroupChange,
  showAddButton = true,
  onAddGroup,
  className = "",
  addButtonText = "ADD GROUP",
  addButtonIcon = "solar:add-circle-bold",
}: GroupTabsProps) {
  const handleGroupClick = (groupId: string) => {
    onGroupChange(groupId);
  };

  const handleAddGroupClick = () => {
    onAddGroup?.();
  };

  return (
    <div className={`mb-4 ${className}`}>
      {/* text tabs on a hairline; the active one gets a 2 px underline in --fg */}
      <div className="flex items-center gap-1 flex-wrap border-b border-line" role="tablist">
        {groups.map((group) => {
          const active = activeGroup === group.id;
          return (
            <button
              key={group.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleGroupClick(group.id)}
              className={cn(
                "cc-free relative -mb-px h-9 px-2.5 text-[13px] font-[520] flex items-center gap-1.5",
                "transition-colors duration-fast ease-out",
                active ? "text-fg" : "text-fg-3 hover:text-fg-2",
              )}
              style={{ borderRadius: 0 }}
            >
              {group.icon && <Icon icon={group.icon} className={cn("w-4 h-4", active ? "text-fg-2" : "text-fg-4")} />}
              <span className="capitalize">{group.name}</span>
              {group.count > 0 && (
                <span className={cn("cc-num text-[11px]", active ? "text-fg-3" : "text-fg-4")}>{group.count}</span>
              )}
              <span
                aria-hidden
                className={cn(
                  "absolute left-2.5 right-2.5 bottom-0 h-[2px] bg-fg transition-opacity duration-fast",
                  active ? "opacity-100" : "opacity-0",
                )}
              />
            </button>
          );
        })}

        {/* Add Group Button */}
        {showAddButton && (
          <button
            type="button"
            onClick={handleAddGroupClick}
            className="cc-free ml-1 h-7 px-2 text-fg-3 hover:text-fg hover:bg-s3 text-xs font-[520] transition-colors duration-fast flex items-center gap-1.5"
            style={{ borderRadius: "var(--r-sm)" }}
          >
            {addButtonIcon === "solar:add-circle-bold" ? (
              <Plus size={14} strokeWidth={1.75} />
            ) : (
              <Icon icon={addButtonIcon} className="w-3.5 h-3.5" />
            )}
            <span>{addButtonText}</span>
          </button>
        )}
      </div>
    </div>
  );
}
