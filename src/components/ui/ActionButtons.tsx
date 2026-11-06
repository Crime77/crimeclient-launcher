"use client";

import React from "react";
import { Icon } from "@iconify/react";

import { Tooltip } from "./Tooltip";

export interface ActionButton {
  /** Unique identifier for the button */
  id: string;
  /** Label text to display */
  label: string;
  /** Icon to display */
  icon: string;
  /** Optional tooltip text */
  tooltip?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Click handler */
  onClick: () => void;
}

export interface ActionButtonsProps {
  /** Array of action button configurations */
  actions: ActionButton[];
  /** Additional CSS classes */
  className?: string;
  /** Refs for specific buttons by their id */
  buttonRefs?: Record<string, React.RefObject<HTMLButtonElement>>;
}

export function ActionButtons({
  actions,
  className = "",
  buttonRefs,
}: ActionButtonsProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {actions.map((action) => {
        const isIconOnly = !action.label || action.label.trim() === "";
        const button = (
          <button
            key={action.id}
            ref={buttonRefs?.[action.id]}
            onClick={action.onClick}
            className={`flex items-center h-8 ${isIconOnly ? 'justify-center w-8' : 'gap-2 px-3'} bg-s3 hover:bg-s4 text-fg border border-line-2 hover:border-line-3 rounded-md text-[13px] font-[520] transition-colors duration-fast disabled:opacity-45 disabled:cursor-not-allowed`}
            disabled={action.disabled}
          >
            <div className="w-4 h-4 flex items-center justify-center text-fg-2">
              <Icon icon={action.icon} className="w-4 h-4" />
            </div>
            {!isIconOnly && (
              <span>{action.label}</span>
            )}
          </button>
        );

        if (!action.tooltip) return button;

        return (
          <Tooltip key={action.id} content={action.tooltip}>
            {button}
          </Tooltip>
        );
      })}
    </div>
  );
}
