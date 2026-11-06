import type { AccentColor } from "../../store/useThemeStore";

export type ComponentSize = "xs" | "sm" | "md" | "lg" | "xl";
export type ComponentVariant = "default" | "flat" | "3d" | "elevated" | "secondary" | "flat-secondary" | "ghost" | "warning" | "destructive" | "info" | "success";
export type StateVariant = "error" | "success" | "warning" | "info";

export interface DesignConfig {
  isRoundTheme?: boolean;
  accentColor?: AccentColor;
  isAnimationEnabled?: boolean;
  borderRadius?: number;
}

export interface ColorTokens {
  main: string;
  light: string;
  dark: string;
  text: string;
}

export const designTokens = {
  spacing: {
    xs: "0.5rem",
    sm: "0.75rem", 
    md: "1rem",
    lg: "1.25rem",
    xl: "1.5rem"
  },
  typography: {
    xs: "0.75rem",
    sm: "0.875rem",
    md: "1rem", 
    lg: "1.125rem",
    xl: "1.25rem"
  },
  animations: {
    fast: "0.15s",
    normal: "0.2s",
    slow: "0.3s"
  },
  shadows: {
    sm: "0 2px 4px rgba(0,0,0,0.1)",
    md: "0 4px 8px rgba(0,0,0,0.15)",
    lg: "0 8px 16px rgba(0,0,0,0.2)"
  }
};

export const getVariantColors = (variant: ComponentVariant, accentColor: AccentColor): ColorTokens => {
  // muted state colours of the "Werkzeug" palette (globals.css --warn/--err/--info/--ok);
  // hex so callers can still append alpha digits
  switch (variant) {
    case "warning":
      return { main: "#d9a441", light: "#e4b964", dark: "#a97d2c", text: "#f3e3c2" };
    case "destructive":
      return { main: "#e5484d", light: "#ec6a6e", dark: "#b8343a", text: "#f6d3d4" };
    case "info":
      return { main: "#8aa4c8", light: "#a6bbd8", dark: "#62799b", text: "#dde5f0" };
    case "success":
      return { main: "#5fb98e", light: "#7fcaa5", dark: "#43906c", text: "#d5ece0" };
    // only `default` (the one main action of a view) carries the accent; the old flat/3d/elevated
    // looks are neutral surfaces now, like secondary
    case "secondary":
    case "flat-secondary":
    case "flat":
    case "3d":
    case "elevated":
      return { main: "#6d6a66", light: "#a3a09b", dark: "#3b3a3d", text: "#edebe8" };
    case "ghost":
      return { main: "transparent", light: "transparent", dark: "transparent", text: "#edebe8" };
    default:
      return {
        main: accentColor.value,
        light: accentColor.light || accentColor.value,
        dark: accentColor.dark || accentColor.value,
        text: "#ffffff",
      };
  }
};

// heights 28 / 32 / 36 / 44 / 48 px
export const getSizeClasses = (size: ComponentSize, element: "button" | "input" | "badge" = "button"): string => {
  if (element === "badge") {
    switch (size) {
      case "xs": return "px-1.5 py-0.5 text-[10.5px] min-h-[18px]";
      case "sm": return "px-1.5 py-0.5 text-[11px] min-h-[20px]";
      case "md": return "px-2 py-0.5 text-xs min-h-[22px]";
      case "lg": return "px-2.5 py-1 text-[13px] min-h-[26px]";
      case "xl": return "px-3 py-1 text-sm min-h-[30px]";
      default: return "px-2 py-0.5 text-xs min-h-[22px]";
    }
  }

  if (element === "input") {
    switch (size) {
      case "xs": return "h-7 px-2.5 text-xs";
      case "sm": return "h-8 px-3 text-[13px]";
      case "md": return "h-9 px-3 text-[13px]";
      case "lg": return "h-11 px-3.5 text-sm";
      case "xl": return "h-12 px-4 text-sm";
      default: return "h-9 px-3 text-[13px]";
    }
  }

  switch (size) {
    case "xs": return "h-7 px-2.5 text-xs";
    case "sm": return "h-8 px-3 text-[13px]";
    case "md": return "h-9 px-3.5 text-[13px]";
    case "lg": return "h-11 px-5 text-sm";
    case "xl": return "h-12 px-6 text-[15px]";
    default: return "h-9 px-3.5 text-[13px]";
  }
};

export const getAccessibilityProps = (props: {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}): Record<string, any> => {
  const accessibilityProps: Record<string, any> = {};
  
  if (props.label) {
    accessibilityProps["aria-label"] = props.label;
  }
  
  if (props.description) {
    accessibilityProps["aria-describedby"] = `desc-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  if (props.error) {
    accessibilityProps["aria-invalid"] = true;
    accessibilityProps["aria-describedby"] = `error-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  if (props.required) {
    accessibilityProps["aria-required"] = true;
  }
  
  if (props.disabled) {
    accessibilityProps["aria-disabled"] = true;
  }
  
  return accessibilityProps;
};

// Radii come from the theme's steps (globals.css --r-sm/--r-md/--r-lg); the number arguments are
// kept for the old call sites and only decide between "none" and a step.
export const getBorderRadiusStyle = (borderRadius?: number): React.CSSProperties => {
  if (borderRadius === 0) return { borderRadius: "0px" };
  return { borderRadius: "var(--r-md)" };
};

export const getBorderRadiusClass = (borderRadius?: number): string => {
  return "rounded-md";
};

export const createRadiusStyle = (borderRadius?: number, multiplier?: number): React.CSSProperties => {
  if (borderRadius === 0) return { borderRadius: "0px" };
  if (multiplier !== undefined && multiplier < 0.9) return { borderRadius: "var(--r-sm)" };
  if (multiplier !== undefined && multiplier > 1.1) return { borderRadius: "var(--r-lg)" };
  return { borderRadius: "var(--r-md)" };
};

export const getRadiusClasses = (borderRadius?: number, element?: string): string => {
  return getBorderRadiusClass(borderRadius);
};

export const getTextSizeClass = (size: ComponentSize, element: "button" | "input" | "badge" | "label" | "checkbox" = "label"): string => {  if (element === "badge") {
    switch (size) {
      case "xs": return "text-xs";
      case "sm": return "text-xs";
      case "md": return "text-sm";
      case "lg": return "text-base";
      case "xl": return "text-lg";
      default: return "text-sm";
    }
  }
  
  if (element === "input") {
    switch (size) {
      case "xs": return "text-xs";
      case "sm": return "text-sm";
      case "md": return "text-sm";
      case "lg": return "text-base";
      case "xl": return "text-base";
      default: return "text-sm";
    }
  }
    if (element === "button") {
    switch (size) {
      case "xs": return "text-xs";
      case "sm": return "text-sm";
      case "md": return "text-sm";
      case "lg": return "text-base";
      case "xl": return "text-base";
      default: return "text-sm";
    }
  }
  
  if (element === "checkbox") {
    switch (size) {
      case "xs": return "text-xs";
      case "sm": return "text-xs";
      case "md": return "text-sm";
      case "lg": return "text-base";
      case "xl": return "text-base";
      default: return "text-sm";
    }
  }
  
  switch (size) {
    case "xs": return "text-xs";
    case "sm": return "text-sm";
    case "md": return "text-sm";
    case "lg": return "text-base";
    case "xl": return "text-base";
    default: return "text-sm";
  }
};

// Toast styling utilities
export type ToastVariant = "default" | "success" | "error" | "loading";

export interface ToastStyleConfig {
  accentColor: string;
  borderRadius?: number;
}

// Toasts: one neutral raised surface; the state shows as a 2 px stripe on the left
export const getToastVariantStyles = (variant: ToastVariant, accentColor: string): React.CSSProperties => {
  switch (variant) {
    case "success":
      return { borderLeftColor: "var(--ok)" };
    case "error":
      return { borderLeftColor: "var(--err)" };
    case "loading":
      return { borderLeftColor: "var(--accent)" };
    default:
      return { borderLeftColor: "var(--line-3)" };
  }
};

export const getToastBaseStyles = (config: ToastStyleConfig): React.CSSProperties => {
  return {
    background: "var(--s2)",
    border: "1px solid var(--line-2)",
    borderLeftWidth: "2px",
    boxShadow: "var(--shadow-pop)",
    padding: "10px 14px",
    minWidth: "280px",
    maxWidth: "420px",
    color: "var(--fg)",
    fontSize: "13px",
    fontWeight: 450,
    lineHeight: 1.4,
    borderRadius: config.borderRadius === 0 ? 0 : "var(--r-md)",
    ...getToastVariantStyles("default", config.accentColor),
  };
};

export const TOAST_BASE_CLASSES = "";

export const MENU_PANEL_CLASSES =
  "bg-s2 border border-line-2 rounded-md shadow-pop z-50 overflow-hidden p-1";

export const menuItemClasses = (compact: boolean): string =>
  `w-full flex items-center gap-2.5 text-left rounded-sm text-fg-2 hover:text-fg hover:bg-s3 transition-colors duration-fast ${
    compact ? "px-2 py-1.5 text-xs" : "px-2.5 py-2 text-[13px]"
  }`;

export const menuSeparatorClasses = (compact: boolean): string =>
  "border-t border-line my-1 -mx-1";
