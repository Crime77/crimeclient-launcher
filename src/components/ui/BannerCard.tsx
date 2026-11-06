import type { CSSProperties, ReactNode } from "react";
import { X } from "lucide-react";

interface BannerCardProps {
  children: ReactNode;
  /** Colour of the 2 px stripe on the left (a state colour). Without it the banner is plain. */
  color?: string;
  /** When set, renders a close button in the top-right corner. */
  onDismiss?: () => void;
  dismissTitle?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Shared launcher banner shell: a flat raised panel (s2, a hairline, the floating shadow) with an
 * optional state stripe on the left. Used by the notice, analytics and any future corner banners
 * so the styling lives in one place.
 */
export function BannerCard({
  children,
  color,
  onDismiss,
  dismissTitle,
  className,
  style,
}: BannerCardProps) {
  return (
    <div
      className={`relative p-4 cursor-default bg-s2 border border-line-2 shadow-pop ${className ?? ""}`}
      style={{
        borderRadius: "var(--r-lg)",
        ...(color ? { borderLeftWidth: 2, borderLeftColor: color } : {}),
        ...style,
      }}
    >
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="cc-icon-btn absolute top-2.5 right-2.5 w-6 h-6"
          title={dismissTitle}
        >
          <X size={14} strokeWidth={1.75} />
        </button>
      )}
      {children}
    </div>
  );
}
