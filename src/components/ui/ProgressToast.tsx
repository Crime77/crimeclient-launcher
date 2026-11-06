import { useThemeStore } from "../../store/useThemeStore";
import {
  getToastBaseStyles,
  getToastVariantStyles,
  TOAST_BASE_CLASSES
} from "./design-system";

interface ProgressToastProps {
  message: string;
  progress: number; // 0-100
  action?: React.ReactNode;
}

/** A flat toast with a thin accent ring, the percentage in mono and a 2 px accent bar. */
export function ProgressToast({ message, progress, action }: ProgressToastProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const borderRadius = useThemeStore((state) => state.borderRadius);
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const baseStyles = {
    ...getToastBaseStyles({ accentColor: accentColor.value, borderRadius }),
    ...getToastVariantStyles("loading", accentColor.value),
  };

  return (
    <div className={TOAST_BASE_CLASSES} style={baseStyles}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className="block w-3.5 h-3.5 flex-shrink-0 rounded-full border-[1.5px] border-line-2 animate-spin"
            style={{ borderTopColor: "var(--accent)" }}
          />
          <span className="flex-1 min-w-0">{message}</span>
          <span className="cc-num text-xs text-fg-2">
            {Math.round(clampedProgress)}%
          </span>
          {action}
        </div>
        <div className="h-[2px] bg-s4 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-[width] duration-slow ease-out"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
