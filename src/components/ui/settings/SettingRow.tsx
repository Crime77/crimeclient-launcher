"use client";

import type { ReactNode } from "react";
import { cn } from "../../../lib/utils";
import { SimpleTooltip } from "../Tooltip";

interface SettingRowProps {
  label: ReactNode;
  description?: ReactNode;
  tooltip?: string;
  disabled?: boolean;
  vertical?: boolean;
  searchKeywords?: string[];
  className?: string;
  children: ReactNode;
}

export function SettingRow({
  label,
  description,
  tooltip,
  disabled,
  vertical,
  className,
  children,
}: SettingRowProps) {
  const labelNode = (
    <span className="text-[13px] font-[520] text-fg leading-snug">{label}</span>
  );

  // "Werkzeug" row: label and description left, the control right, a hairline between rows
  return (
    <div
      className={cn(
        "flex py-3 border-b border-line last:border-b-0",
        vertical ? "flex-col gap-2.5" : "items-center justify-between gap-6",
        disabled && "opacity-50",
        className,
      )}
    >
      <div className="min-w-0 max-w-[560px]">
        {tooltip ? <SimpleTooltip content={tooltip}>{labelNode}</SimpleTooltip> : labelNode}
        {description && (
          <div className="text-xs text-fg-3 leading-[1.45] mt-0.5">
            {description}
          </div>
        )}
      </div>
      <div className={cn(vertical ? "w-full" : "flex-shrink-0")}>{children}</div>
    </div>
  );
}
