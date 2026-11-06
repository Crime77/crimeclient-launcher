"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { getAccessibilityProps } from "./design-system";

interface TabHeaderProps {
  title: string;
  icon?: string;
  children?: ReactNode;
  className?: string;
  role?: string;
  ariaLabel?: string;
}

/** A section header: display title, optional icon, content below; a hairline closes it. */
export function TabHeader({
  title,
  icon,
  children,
  className,
  role = "banner",
  ariaLabel,
}: TabHeaderProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const accessibilityProps = getAccessibilityProps({
    label: ariaLabel
  });

  return (
    <div
      ref={headerRef}
      className={cn(
        "cc-enter flex-shrink-0 flex flex-col gap-4 px-6 py-5 border-b border-line",
        className,
      )}
      role={role}
      {...accessibilityProps}
    >
      <div className="flex items-center gap-2.5">
        {icon && (
          <Icon
            icon={icon}
            className="w-4 h-4 text-fg-3"
            aria-hidden="true"
          />
        )}
        <h1 className="font-display text-[15px] font-[620] text-fg leading-tight">
          {title}
        </h1>
      </div>
      {children}
    </div>
  );
}
