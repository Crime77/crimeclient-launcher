"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import { hasHiddenPacks, packGroups, type Packs } from "../../utils/pack-listing";
import {
  ThemedDropdown,
  ThemedDropdownDivider,
  ThemedDropdownHeader,
  ThemedDropdownItem,
} from "./v3/shared/ThemedDropdown";

interface PackPickerProps {
  packs: Packs;
  value: string | null;
  onChange: (packId: string | null) => void;
  allowNone?: boolean;
  label?: string;
  size?: "sm" | "md";
  loading?: boolean;
  className?: string;
}

export function PackPicker({
  packs,
  value,
  onChange,
  allowNone = true,
  label,
  size = "md",
  loading = false,
  className = "",
}: PackPickerProps) {
  const { t } = useTranslation();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const groups = useMemo(() => packGroups(packs, value, showHidden), [packs, value, showHidden]);
  const hasHidden = useMemo(() => hasHiddenPacks(packs, value), [packs, value]);
  const pending = loading && Object.keys(packs).length === 0;

  const selectedLabel = useMemo(() => {
    if (!value) return t("profiles.v3.pack.noSelection");
    return groups.flatMap(g => g.items).find(o => o.id === value)?.label ?? value;
  }, [groups, value, t]);

  const pick = (packId: string | null) => {
    onChange(packId);
    setOpen(false);
  };

  const isSm = size === "sm";

  return (
    <div className={className}>
      {label && (
        <label className="block text-[12px] font-medium text-fg-2 mb-1.5">{label}</label>
      )}
      <div className="relative">
        <button
          ref={triggerRef}
          disabled={pending}
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          className={cn(
            "rounded-md border bg-s2 text-fg flex items-center gap-1.5 transition-colors duration-fast",
            open ? "border-line-3 bg-s3" : "border-line hover:border-line-2 hover:bg-s3",
            isSm ? "h-8 px-2.5 text-[12.5px] max-w-[220px]" : "w-full h-9 px-3 text-[13px] justify-between",
            pending && "opacity-60 cursor-default",
          )}
        >
          <span className="flex items-center gap-1.5 min-w-0">
            {pending ? (
              <Loader2 size={isSm ? 13 : 14} strokeWidth={1.75} className="flex-shrink-0 animate-spin text-fg-3" />
            ) : (
              <ShieldCheck size={isSm ? 13 : 14} strokeWidth={1.75} className="flex-shrink-0 text-fg-3" />
            )}
            <span className="truncate">{pending ? "" : selectedLabel}</span>
          </span>
          <ChevronDown
            size={isSm ? 12 : 14}
            strokeWidth={1.75}
            className={cn("flex-shrink-0 text-fg-4 transition-transform duration-fast", open && "rotate-180")}
          />
        </button>

        <ThemedDropdown
          open={open && !pending}
          onClose={() => setOpen(false)}
          width="w-60"
          align="left"
          scrollable
          triggerRef={triggerRef}
          matchTriggerWidth={!isSm}
        >
          {allowNone && (
            <>
              <ThemedDropdownItem
                icon="solar:close-circle-linear"
                selected={!value}
                onClick={() => pick(null)}
              >
                {t("profiles.v3.pack.noSelection")}
              </ThemedDropdownItem>
              {groups.length > 0 && <ThemedDropdownDivider />}
            </>
          )}

          {groups.map((group, i) => (
            <div key={group.category || "__main"}>
              {group.category && (
                <>
                  {(i > 0 || allowNone) && <ThemedDropdownDivider />}
                  <ThemedDropdownHeader>{group.category}</ThemedDropdownHeader>
                </>
              )}
              {group.items.map(opt => (
                <ThemedDropdownItem
                  key={opt.id}
                  icon={opt.hidden ? "solar:test-tube-bold" : "solar:shield-check-bold"}
                  selected={value === opt.id}
                  onClick={() => pick(opt.id)}
                >
                  <span className="truncate">{opt.label}</span>
                </ThemedDropdownItem>
              ))}
            </div>
          ))}

          {(hasHidden || showHidden) && (
            <>
              <ThemedDropdownDivider />
              <ThemedDropdownItem
                icon={showHidden ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"}
                onClick={() => setShowHidden(v => !v)}
              >
                {showHidden ? t("profiles.v3.pack.showLess") : t("profiles.v3.pack.showMore")}
              </ThemedDropdownItem>
            </>
          )}
        </ThemedDropdown>
      </div>
    </div>
  );
}
