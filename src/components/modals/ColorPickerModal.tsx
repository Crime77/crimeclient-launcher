"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Check, Palette } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";
import { useThemeStore } from "../../store/useThemeStore";
import { toast } from "react-hot-toast";

interface ColorPickerModalProps {
  onClose: () => void;
  onColorSelected?: (color: string) => void;
  initialColor?: string;
  applyToTheme?: boolean;
}

// HSV to RGB conversion
function hsvToRgb(h: number, s: number, v: number) {
  const c = v * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - c;

  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

// RGB to HSV conversion
function rgbToHsv(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  let h = 0;
  const s = max === 0 ? 0 : diff / max;
  const v = max;

  if (diff !== 0) {
    switch (max) {
      case r: h = ((g - b) / diff + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / diff + 2) * 60; break;
      case b: h = ((r - g) / diff + 4) * 60; break;
    }
  }

  return { h, s, v };
}

// Convert RGB to Hex
function rgbToHex(r: number, g: number, b: number) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

// Parse hex color to RGB
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

export function ColorPickerModal({
  onClose,
  onColorSelected,
  initialColor,
  applyToTheme = true,
}: ColorPickerModalProps) {
  const { t } = useTranslation();
  const { accentColor, setCustomAccentColor } = useThemeStore();
  const seed = initialColor ?? accentColor.value;
  const [hsv, setHsv] = useState(() => {
    const rgb = hexToRgb(seed);
    return rgbToHsv(rgb.r, rgb.g, rgb.b);
  });
  const [hex, setHex] = useState(seed);
  const [isDraggingSaturation, setIsDraggingSaturation] = useState(false);
  const [isDraggingHue, setIsDraggingHue] = useState(false);

  const saturationRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  // Update HSV when accent color changes
  useEffect(() => {
    if (initialColor !== undefined) return;
    const rgb = hexToRgb(accentColor.value);
    setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
    setHex(accentColor.value);
  }, [accentColor.value, initialColor]);

  // Update hex when HSV changes
  useEffect(() => {
    const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
    const newHex = rgbToHex(rgb.r, rgb.g, rgb.b);
    setHex(newHex);
  }, [hsv]);

  // Handle mouse events for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSaturation && saturationRef.current) {
        const rect = saturationRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        setHsv(prev => ({ ...prev, s: x, v: 1 - y }));
      } else if (isDraggingHue && hueRef.current) {
        const rect = hueRef.current.getBoundingClientRect();
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        const hue = y * 359.99; // Keep hue between 0-359.99 to avoid wrapping issues
        setHsv(prev => ({ ...prev, h: hue }));
      }
    };

    const handleMouseUp = () => {
      setIsDraggingSaturation(false);
      setIsDraggingHue(false);
    };

    if (isDraggingSaturation || isDraggingHue) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSaturation, isDraggingHue]);


  const handleHexChange = useCallback((value: string) => {
    setHex(value);
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      const rgb = hexToRgb(value);
      setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
    }
  }, []);

  const handleApply = () => {
    if (/^#[0-9A-F]{6}$/i.test(hex)) {
      onColorSelected?.(hex);
      if (applyToTheme) {
        setCustomAccentColor(hex);
        toast.success(t('color_picker.toast.applied'));
      }
      onClose();
    } else {
      toast.error(t('color_picker.toast.invalid_hex'));
    }
  };

  const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);

  const field =
    "w-full h-8 px-2.5 bg-s2 border border-line text-fg font-mono text-xs outline-none focus:border-line-3 transition-colors duration-fast";

  return (
    <Modal
      title={t('color_picker.title')}
      titleIcon={<Palette size={16} strokeWidth={1.75} />}
      onClose={onClose}
      width="md"
      footer={
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-6 h-6 flex-shrink-0 border border-white/[0.14]"
              style={{ backgroundColor: hex, borderRadius: "var(--r-sm)" }}
            />
            <span className="text-xs text-fg-3 truncate">{t('color_picker.selected_color')}</span>
            <span className="font-mono text-xs text-fg uppercase">{hex}</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose} variant="ghost" size="sm">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleApply} variant="default" size="sm" icon={<Check size={14} strokeWidth={2} />}>
              {t('color_picker.button.apply')}
            </Button>
          </div>
        </div>
      }
    >
      <div className="p-5 space-y-5">
        {/* Color Picker Interface */}
        <div className="flex gap-3">
          {/* Saturation/Value Picker */}
          <div className="flex-1">
            <div
              ref={saturationRef}
              className="relative w-full h-48 cursor-crosshair border border-line-2"
              style={{
                background: `hsl(${hsv.h}, 100%, 50%)`,
                borderRadius: "var(--r-md)",
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingSaturation(true);
                if (saturationRef.current) {
                  const rect = saturationRef.current.getBoundingClientRect();
                  const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
                  setHsv(prev => ({ ...prev, s: x, v: 1 - y }));
                }
              }}
            >
              {/* Saturation gradient overlay (the colour field itself, not decoration) */}
              <div
                className="absolute inset-0"
                style={{
                  borderRadius: "inherit",
                  background:
                      "linear-gradient(to top, rgb(0, 0, 0), rgba(0, 0, 0, 0)), " +
                      "linear-gradient(to right, rgb(255, 255, 255), rgba(255, 255, 255, 0))"
                }}
              />
              {/* Color indicator */}
              <div
                className="absolute w-3.5 h-3.5 border-2 border-white rounded-full ring-1 ring-black/40 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                  left: `${hsv.s * 100}%`,
                  top: `${(1 - hsv.v) * 100}%`,
                  backgroundColor: hex
                }}
              />
            </div>
          </div>

          {/* Hue Slider */}
          <div className="w-6">
            <div
              ref={hueRef}
              className="relative h-48 cursor-pointer border border-line-2"
              style={{
                background: 'linear-gradient(to bottom, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                borderRadius: "var(--r-sm)",
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingHue(true);
                if (hueRef.current) {
                  const rect = hueRef.current.getBoundingClientRect();
                  const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
                  const hue = y * 359.99; // Keep hue between 0-359.99 to avoid wrapping issues
                  setHsv(prev => ({ ...prev, h: hue }));
                }
              }}
            >
              {/* Hue indicator */}
              <div
                className="absolute -left-0.5 -right-0.5 h-1.5 bg-white border border-black/50 -translate-y-1/2 pointer-events-none"
                style={{
                  top: `${(hsv.h / 359.99) * 100}%`,
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        </div>

        {/* Color Values */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2">
          <div>
            <label className="block cc-eyebrow mb-1">{t('color_picker.hex')}</label>
            <input
              type="text"
              value={hex}
              onChange={(e) => handleHexChange(e.target.value)}
              className={field}
              style={{ borderRadius: "var(--r-md)" }}
              placeholder="#000000"
            />
          </div>
          <div>
            <label className="block cc-eyebrow mb-1">{t('color_picker.r')}</label>
            <input
              type="number"
              value={rgb.r}
              onChange={(e) => {
                const newRgb = { ...rgb, r: parseInt(e.target.value) || 0 };
                setHsv(rgbToHsv(newRgb.r, newRgb.g, newRgb.b));
              }}
              className={field}
              style={{ borderRadius: "var(--r-md)" }}
              min="0"
              max="255"
            />
          </div>
          <div>
            <label className="block cc-eyebrow mb-1">{t('color_picker.g')}</label>
            <input
              type="number"
              value={rgb.g}
              onChange={(e) => {
                const newRgb = { ...rgb, g: parseInt(e.target.value) || 0 };
                setHsv(rgbToHsv(newRgb.r, newRgb.g, newRgb.b));
              }}
              className={field}
              style={{ borderRadius: "var(--r-md)" }}
              min="0"
              max="255"
            />
          </div>
          <div>
            <label className="block cc-eyebrow mb-1">{t('color_picker.b')}</label>
            <input
              type="number"
              value={rgb.b}
              onChange={(e) => {
                const newRgb = { ...rgb, b: parseInt(e.target.value) || 0 };
                setHsv(rgbToHsv(newRgb.r, newRgb.g, newRgb.b));
              }}
              className={field}
              style={{ borderRadius: "var(--r-md)" }}
              min="0"
              max="255"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
