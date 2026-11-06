"use client";

import type React from "react";
import { cn } from "../../../lib/utils";

/**
 * Layout of the profile settings tabs ("Werkzeug"): sections with a small eyebrow label,
 * rows separated by 1 px lines, label and description on the left, the control on the right.
 */

interface SettingsSectionProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** something small on the right of the section label (a count, a ghost button) */
  aside?: React.ReactNode;
  children: React.ReactNode;
  /** children are drawn as they are, without the row lines (a bordered list or tree) */
  flush?: boolean;
  className?: string;
}

export function SettingsSection({ title, description, aside, children, flush, className }: SettingsSectionProps) {
  const hasHeader = !!(title || description || aside);
  return (
    <section className={cn("min-w-0", className)}>
      {hasHeader && (
        <div className="flex items-end justify-between gap-4 pb-2">
          <div className="min-w-0">
            {title && <div className="cc-eyebrow">{title}</div>}
            {description && <p className="text-[12px] text-fg-3 leading-[1.5] mt-1 max-w-[560px]">{description}</p>}
          </div>
          {aside && <div className="flex-shrink-0 flex items-center gap-1">{aside}</div>}
        </div>
      )}
      {flush ? (
        children
      ) : (
        <div className={cn("divide-y divide-line border-b border-line", hasHeader && "border-t")}>{children}</div>
      )}
    </section>
  );
}

interface SettingsRowProps {
  label: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** the control goes under the text at full width (version grids, text areas, sliders, lists) */
  stacked?: boolean;
  htmlFor?: string;
  /** dims the whole row (a setting that does not apply right now) */
  muted?: boolean;
  className?: string;
}

export function SettingsRow({ label, description, children, stacked, htmlFor, muted, className }: SettingsRowProps) {
  const text = (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="block text-[13px] font-[560] text-fg leading-[1.35] select-none">
        {label}
      </label>
      {description && <div className="text-[12px] text-fg-3 leading-[1.5] mt-0.5 max-w-[420px]">{description}</div>}
    </div>
  );

  if (stacked) {
    return (
      <div className={cn("py-3.5 min-w-0", muted && "opacity-50", className)}>
        {text}
        {children && <div className="mt-3 min-w-0">{children}</div>}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-between gap-6 py-3.5 min-w-0", muted && "opacity-50", className)}>
      <div className="flex-1 min-w-0">{text}</div>
      {children && <div className="flex-shrink-0 flex items-center justify-end gap-2">{children}</div>}
    </div>
  );
}
