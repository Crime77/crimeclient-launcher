"use client";

import { Children, isValidElement, type ReactNode } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../../lib/utils";
import { fuzzyMatch, useSettingsSearch } from "./SettingsSearchContext";

interface SettingsSectionProps {
  id?: string;
  title: string;
  description?: ReactNode;
  icon?: string;
  headerActions?: ReactNode;
  keywords?: string[];
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function SettingsSection({
  id,
  title,
  description,
  icon,
  headerActions,
  keywords,
  children,
  className,
  bodyClassName,
}: SettingsSectionProps) {
  const query = useSettingsSearch();

  let body: ReactNode = children;

  if (query) {
    const sectionHay = [title, ...(keywords ?? [])].join(" ");
    const sectionMatch = fuzzyMatch(sectionHay, query);

    if (!sectionMatch) {
      const kept = Children.toArray(children).filter((child) => {
        if (!isValidElement(child)) return false;
        const p = child.props as { label?: unknown; searchKeywords?: string[] };
        if (typeof p.label !== "string" && !p.searchKeywords) return false;
        const hay = [
          typeof p.label === "string" ? p.label : "",
          ...(p.searchKeywords ?? []),
        ].join(" ");
        return fuzzyMatch(hay, query);
      });
      if (kept.length === 0) return null;
      body = kept;
    }
  }

  return (
    <section id={id} className={cn("scroll-mt-4", className)}>
      <div className="pb-2.5 border-b border-line">
        <div className="flex items-center justify-between gap-3 min-h-7">
          <div className="flex items-center gap-2 min-w-0">
            {icon && (
              <Icon
                icon={icon}
                className="w-4 h-4 flex-shrink-0 text-fg-3"
              />
            )}
            <h3 className="font-display text-[14px] font-[620] leading-tight text-fg truncate">
              {title}
            </h3>
          </div>
          {headerActions && <div className="flex-shrink-0">{headerActions}</div>}
        </div>

        {description && (
          <p className="text-xs text-fg-3 leading-[1.45] mt-1 max-w-[640px]">{description}</p>
        )}
      </div>

      <div className={cn("mt-0.5", bodyClassName)}>{body}</div>
    </section>
  );
}
