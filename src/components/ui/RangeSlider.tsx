"use client";

import type React from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "../../lib/utils";
import { Star } from "lucide-react";
import {
  getAccessibilityProps,
  type ComponentSize,
  type ComponentVariant 
} from "./design-system";

interface RangeSliderProps {
  value: number;
  onChange: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  valueLabel?: string;
  minLabel?: string;
  maxLabel?: string;
  disabled?: boolean;
  showValue?: boolean;
  size?: ComponentSize;
  className?: string;
  variant?: ComponentVariant;
  icon?: React.ReactNode;
  label?: string;
  description?: string;
  recommendedValue?: number | number[]; // Single or multiple recommended values
  recommendedRange?: [number, number]; // Range between two values
  unit?: string;
}

export function RangeSlider({
  value,
  onChange,
  onChangeEnd,
  min,
  max,
  step = 1,
  valueLabel,
  minLabel,
  maxLabel,
  disabled = false,
  showValue = true,
  size = "md",
  className,
  variant = "flat",
  icon,
  label,
  description,
  recommendedValue,
  recommendedRange,
  unit,
}: RangeSliderProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const sliderRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const valueDisplayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastChangeTimeRef = useRef(0);
  
  const accessibilityProps = getAccessibilityProps({
    label,
    description,
    disabled,
    required: false
  });

  useEffect(() => {
    if (!isDragging) {
      setLocalValue(value);
    }
  }, [value, isDragging]);

  // a thin track, a neutral fill, a small round knob (px)
  const sizeTable = {
    xs: { track: 3, thumb: 10, text: "text-xs" },
    sm: { track: 3, thumb: 10, text: "text-xs" },
    md: { track: 4, thumb: 12, text: "text-[13px]" },
    lg: { track: 4, thumb: 14, text: "text-[13px]" },
    xl: { track: 5, thumb: 16, text: "text-sm" },
  };
  const dims = sizeTable[size] ?? sizeTable.md;

  const getPercentage = useCallback((val: number) => {
    return ((val - min) / (max - min)) * 100;
  }, [min, max]);

  const updateVisualPosition = useCallback((newValue: number) => {
    if (!progressRef.current || !thumbRef.current) return;

    const percentage = getPercentage(newValue);
    progressRef.current.style.width = `${percentage}%`;
    thumbRef.current.style.left = `${percentage}%`;

    if (valueDisplayRef.current) {
      valueDisplayRef.current.innerHTML = unit
        ? `${newValue} <span class="text-fg-3">${unit}</span>`
        : String(newValue);
    }
  }, [getPercentage, unit]);

  const calculateValueFromMouseEvent = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!trackRef.current) return localValue;
    
    const rect = trackRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, offsetX / width));
    let newValue = min + percentage * (max - min);

    if (step > 0) {
      newValue = Math.round(newValue / step) * step;
    }

    return Math.max(min, Math.min(max, newValue));
  }, [min, max, step, localValue]);

  const handleMouseEnter = () => {
    if (disabled) return;
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (disabled) return;
    setIsHovered(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    
    setIsDragging(true);
    const newValue = calculateValueFromMouseEvent(e);
    
    setLocalValue(newValue);
    updateVisualPosition(newValue);
    
    const now = Date.now();
    if (now - lastChangeTimeRef.current > 16) {
      onChange(newValue);
      lastChangeTimeRef.current = now;
    }

    if (inputRef.current) {
      inputRef.current.focus();
    }
    e.preventDefault();
  };

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    if (onChangeEnd) {
      onChangeEnd(localValue);
    }
  }, [isDragging, localValue, onChangeEnd]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    setLocalValue(newValue);
    updateVisualPosition(newValue);
    onChange(newValue);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newValue = calculateValueFromMouseEvent(e);
      setLocalValue(newValue);
      updateVisualPosition(newValue);
      
      const now = Date.now();
      if (now - lastChangeTimeRef.current > 16) {
        onChange(newValue);
        lastChangeTimeRef.current = now;
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging, calculateValueFromMouseEvent, onChange, handleMouseUp]);

  const isRecommended =
    (recommendedValue !== undefined &&
      (Array.isArray(recommendedValue)
        ? recommendedValue.includes(localValue)
        : localValue === recommendedValue)) ||
    (recommendedRange !== undefined &&
      localValue >= recommendedRange[0] &&
      localValue <= recommendedRange[1]);

  return (
    <div
      ref={sliderRef}
      className={cn(
        "group/slider relative w-full",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      {valueLabel && (
        <div className="flex items-center gap-2 mb-1.5">
          {icon && <span className="text-fg-3 flex items-center">{icon}</span>}
          <span className={cn("text-fg font-[520]", dims.text)}>
            {valueLabel}
          </span>
        </div>
      )}

      <div>
        {showValue && (
          <div className="flex items-baseline justify-between gap-3 mb-0.5">
            {minLabel && (
              <span className="cc-num text-[11px] text-fg-3">
                {minLabel}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <span
                ref={valueDisplayRef}
                className="cc-num text-xs text-fg"
              >
                {localValue}
                {unit && (
                  <span className="text-fg-3 ml-1">{unit}</span>
                )}
              </span>
              {isRecommended ? (
                <Star size={11} strokeWidth={2} className="text-warn fill-current" />
              ) : null}
            </div>
            {maxLabel && (
              <span className="cc-num text-[11px] text-fg-3">
                {maxLabel}
              </span>
            )}
          </div>
        )}

        <div
          className="relative py-2.5 cursor-pointer"
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className="relative overflow-hidden rounded-full bg-s4"
            style={{ height: dims.track }}
            ref={trackRef}
          >
            <div
              ref={progressRef}
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-colors duration-fast",
                isHovered || isDragging ? "bg-fg-2" : "bg-fg-3",
              )}
              style={{ width: `${getPercentage(localValue)}%` }}
            />
          </div>

          <div
            ref={thumbRef}
            className={cn(
              "absolute top-1/2 z-10 rounded-full bg-fg cursor-grab",
              "transition-transform duration-fast ease-out",
              isDragging && "cursor-grabbing",
            )}
            style={{
              width: dims.thumb,
              height: dims.thumb,
              left: `${getPercentage(localValue)}%`,
              transform: isDragging || isHovered
                ? "translate(-50%, -50%) scale(1.15)"
                : "translate(-50%, -50%) scale(1)",
            }}
          />
        </div>
      </div>

      <input
        ref={inputRef}
        type="range"
        min={min}
        max={max}
        step={step}
        value={localValue}
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={disabled}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={localValue}
        aria-valuetext={
          valueLabel ? `${valueLabel}: ${localValue}` : `${localValue}`
        }
        {...accessibilityProps}
      />
      {description && (
        <p 
          id={accessibilityProps["aria-describedby"]}
          className="text-xs text-fg-3 mt-1"
        >
          {description}
        </p>
      )}
    </div>
  );
}
