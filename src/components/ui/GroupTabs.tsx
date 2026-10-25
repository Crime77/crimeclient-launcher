"use client";

import { Icon } from "@iconify/react";
import { useThemeStore } from "../../store/useThemeStore";

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
  const accentColor = useThemeStore((state) => state.accentColor);

  const handleGroupClick = (groupId: string) => {
    onGroupChange(groupId);
  };

  const handleAddGroupClick = () => {
    onAddGroup?.();
  };

  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 p-1 cc-glass" style={{ borderRadius: 9999 }}>
          {groups.map((group) => {
            const active = activeGroup === group.id;
            return (
              <button
                key={group.id}
                onClick={() => handleGroupClick(group.id)}
                className={`cc-free h-8 px-3.5 text-[13px] font-semibold transition-colors flex items-center gap-1.5 ${
                  active ? "text-white" : "text-white/55 hover:text-white hover:bg-white/[0.06]"
                }`}
                style={{
                  borderRadius: 9999,
                  background: active ? `linear-gradient(180deg, ${accentColor.value}, ${accentColor.hoverValue})` : undefined,
                  boxShadow: active ? `0 6px 16px -8px ${accentColor.shadowValue}` : undefined,
                }}
              >
                {group.icon && <Icon icon={group.icon} className="w-4 h-4" />}
                <span className="capitalize">{group.name}</span>
                {group.count > 0 && (
                  <span className={`text-[11px] tabular-nums ${active ? "text-white/75" : "text-white/35"}`}>{group.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Add Group Button */}
        {showAddButton && (
          <button
            onClick={handleAddGroupClick}
            className="cc-free h-10 px-4 border border-dashed border-white/20 hover:border-white/40 text-white/50 hover:text-white text-[13px] font-semibold transition-colors flex items-center gap-2"
            style={{ borderRadius: 9999 }}
          >
            <Icon icon={addButtonIcon} className="w-4 h-4" />
            <span>{addButtonText}</span>
          </button>
        )}
      </div>
    </div>
  );
}
