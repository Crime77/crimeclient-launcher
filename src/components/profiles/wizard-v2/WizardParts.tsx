"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/utils";

/** The three steps of a blank profile; the step list sits as a quiet strip under the modal header. */
export function WizardSteps({ current }: { current: 1 | 2 | 3 }) {
  const { t } = useTranslation();
  const steps = [
    t("profiles.wizard.steps.version"),
    t("profiles.wizard.steps.loader"),
    t("profiles.wizard.steps.details"),
  ];

  return (
    <ol className="sticky top-0 z-10 flex items-center gap-3 h-10 px-5 border-b border-line bg-s1">
      {steps.map((label, index) => {
        const step = index + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} className="flex items-center gap-3">
            {index > 0 && <span className="w-6 h-px bg-line-2" aria-hidden />}
            <span
              className={cn(
                "flex items-center gap-2 text-[12.5px]",
                active ? "text-fg font-medium" : done ? "text-fg-2" : "text-fg-4",
              )}
              aria-current={active ? "step" : undefined}
            >
              <span
                className={cn(
                  "cc-num grid place-items-center w-[18px] h-[18px] text-[11px] border",
                  active ? "bg-s4 border-line-3 text-fg" : "border-line-2",
                )}
                style={{ borderRadius: "var(--r-sm)" }}
              >
                {done ? <Check size={11} strokeWidth={2} /> : step}
              </span>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Small segmented control (s2 track, the active segment on s4). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (value: T) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex-shrink-0 flex items-center h-9 p-[3px] gap-[2px] bg-s2 border border-line", className)}
      style={{ borderRadius: "var(--r-md)" }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              "h-[28px] px-3 flex items-center gap-1.5 text-[12.5px] transition-colors duration-fast",
              active ? "bg-s4 text-fg" : "text-fg-3 hover:text-fg-2 hover:bg-s3",
            )}
            style={{ borderRadius: "var(--r-sm)" }}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Classes for a flat choice card: s2 with a line, the selected one s3 with line-3. */
export function choiceCardClasses(selected: boolean, disabled = false) {
  return cn(
    "border transition-colors duration-fast text-left",
    disabled
      ? "bg-s1 border-line opacity-50 cursor-not-allowed"
      : selected
        ? "bg-s3 border-line-3 cursor-pointer"
        : "bg-s2 border-line hover:bg-s3 hover:border-line-2 cursor-pointer",
  );
}

/** A form label in the quiet 12 px style; `hint` sits on the right in fg-4. */
export function FieldLabel({ children, hint, htmlFor }: { children: ReactNode; hint?: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 mb-1.5">
      <label htmlFor={htmlFor} className="text-[12px] font-medium text-fg-2">
        {children}
      </label>
      {hint && <span className="text-[11.5px] text-fg-4">{hint}</span>}
    </div>
  );
}
