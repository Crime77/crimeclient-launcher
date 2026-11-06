"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Unlink } from "lucide-react";
import type { ReactNode } from "react";

import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";
import { cn } from "../../lib/utils";
import { choiceCardClasses } from "../profiles/wizard-v2/WizardParts";
import type { DetachMode } from "../../types/syncPacks";

export interface DetachModeModalProps {
  title: string;
  subtitle: string;
  confirmLabel: string;
  confirmLabels?: Partial<Record<DetachMode, string>>;
  choicePrefix?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (mode: DetachMode) => void;
}

const CHOICES: { mode: DetachMode; icon: ReactNode }[] = [
  { mode: "keep_copy", icon: <Copy size={16} strokeWidth={1.75} /> },
  { mode: "drop", icon: <Unlink size={16} strokeWidth={1.75} /> },
];

export function DetachModeModal({
  title,
  subtitle,
  confirmLabel,
  confirmLabels,
  choicePrefix = "syncPacks.detachDialog",
  busy,
  onCancel,
  onConfirm,
}: DetachModeModalProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<DetachMode>("keep_copy");

  return (
    <Modal
      title={title}
      titleSubtitle={
        <span>{subtitle}</span>
      }
      onClose={onCancel}
      width="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => onConfirm(mode)}
            disabled={busy}
          >
            {confirmLabels?.[mode] ?? confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-2 px-5 py-5" role="radiogroup">
        {CHOICES.map((choice) => {
          const active = mode === choice.mode;
          return (
            <button
              key={choice.mode}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setMode(choice.mode)}
              className={cn("flex w-full items-start gap-3 px-4 py-3", choiceCardClasses(active))}
              style={{ borderRadius: "var(--r-lg)" }}
            >
              <span className={cn("mt-px flex-shrink-0", active ? "text-fg" : "text-fg-3")}>
                {choice.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block text-[13px] font-medium", active ? "text-fg" : "text-fg-2")}>
                  {t(`${choicePrefix}.${choice.mode}.title`)}
                </span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-fg-3">
                  {t(`${choicePrefix}.${choice.mode}.hint`)}
                </span>
              </span>
              <span
                className={cn(
                  "mt-0.5 grid place-items-center w-3.5 h-3.5 rounded-full border flex-shrink-0",
                  active ? "border-fg" : "border-line-3",
                )}
                aria-hidden
              >
                {active && <span className="w-1.5 h-1.5 rounded-full bg-fg" />}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

export default DetachModeModal;
