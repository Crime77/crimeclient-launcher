"use client";

import { Icon } from "@iconify/react";

import { openExternalUrl } from "../../services/tauri-service";
import { cn } from "../../lib/utils";

interface BetaNoticeProps {
  tag: string;
  hint: string;
  feedbackLabel: string;
  feedbackUrl: string;
  className?: string;
}

export function BetaNotice({ tag, hint, feedbackLabel, feedbackUrl, className }: BetaNoticeProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex items-center h-[18px] rounded-sm px-1.5 bg-s3 text-fg-2 text-[10.5px] font-[600] uppercase tracking-[0.06em]">
        {tag}
      </span>

      <span className="truncate text-xs text-fg-3">{hint}</span>

      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          openExternalUrl(feedbackUrl);
        }}
        className="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-fg-3 transition-colors duration-fast hover:text-fg"
      >
        <Icon icon="ic:baseline-discord" className="h-3.5 w-3.5" />
        {feedbackLabel}
      </button>
    </div>
  );
}
