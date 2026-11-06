"use client";

import { useRef } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "../../lib/utils";

interface StatusMessageProps {
  type: "success" | "error" | "warning" | "info";
  message: string;
  className?: string;
}

// muted state colours: a faint wash, a hairline and the icon in the state colour; text stays readable
const STYLES = {
  success: { box: "bg-ok/[0.06] border-ok/25", icon: "text-ok", Icon: CheckCircle2 },
  error: { box: "bg-err/[0.06] border-err/25", icon: "text-err", Icon: XCircle },
  warning: { box: "bg-warn/[0.06] border-warn/25", icon: "text-warn", Icon: AlertTriangle },
  info: { box: "bg-info/[0.06] border-info/25", icon: "text-info", Icon: Info },
} as const;

export function StatusMessage({
  type,
  message,
  className,
}: StatusMessageProps) {
  const messageRef = useRef<HTMLDivElement>(null);
  const styles = STYLES[type] ?? STYLES.info;
  const StateIcon = styles.Icon;

  return (
    <div
      ref={messageRef}
      className={cn(
        "cc-enter flex items-start gap-2.5 px-3 py-2.5 mb-6 border rounded-md text-fg-2",
        styles.box,
        className,
      )}
      role="alert"
      aria-live="polite"
    >
      <StateIcon size={16} strokeWidth={1.75} className={cn("flex-shrink-0 mt-px", styles.icon)} aria-hidden="true" />
      <div className="text-[13px] leading-[1.45]">{message}</div>
    </div>
  );
}
