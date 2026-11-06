"use client";

import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

/** The frame of the standalone windows (clip editor, trimmer): the page background with one hairline. */
export function WindowFrame({ className, style, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col h-screen w-screen text-fg overflow-hidden relative bg-bg border border-line",
        className,
      )}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}
