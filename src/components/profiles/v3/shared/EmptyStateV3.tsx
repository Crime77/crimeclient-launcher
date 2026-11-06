"use client";

import type React from "react";
import { Icon } from "@iconify/react";

interface EmptyStateV3Props {
  icon: string;
  title: string;
  hint?: string;
}

/** One line of fg-2, one of fg-3, a small glyph above; no illustration. */
export const EmptyStateV3: React.FC<EmptyStateV3Props> = ({ icon, title, hint }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <Icon icon={icon} className="w-5 h-5 text-fg-4 mb-3" />
    <div className="text-[13px] font-[520] text-fg-2">{title}</div>
    {hint && <div className="text-[12px] text-fg-3 mt-1 max-w-[380px] leading-[1.5]">{hint}</div>}
  </div>
);
