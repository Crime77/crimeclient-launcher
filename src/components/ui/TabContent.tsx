"use client";

import type React from "react";
import { useEffect, useRef } from "react";
import { cn } from "../../lib/utils";
import { gsap } from "gsap";
import { getAccessibilityProps } from "./design-system";

interface TabContentProps {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
  role?: string;
  ariaLabel?: string;
}

export function TabContent({
  children,
  className,
  active = true,
  role = "tabpanel",
  ariaLabel,
}: TabContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const accessibilityProps = getAccessibilityProps({
    label: ariaLabel
  });

  useEffect(() => {
    if (contentRef.current && active) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 6 },
        {
          opacity: 1,
          y: 0,
          duration: 0.26,
          ease: "power3.out",
        },
      );
    }
  }, [active]);

  return (
    <div
      ref={contentRef}
      role={role}
      aria-hidden={!active}
      className={cn(
        "relative flex-1 min-h-0 p-4 overflow-auto custom-scrollbar rounded-none",
        className,
      )}
      {...accessibilityProps}
    >
      {children}
    </div>
  );
}
