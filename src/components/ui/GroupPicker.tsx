"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";

import { SearchStyleInput } from "./Input";
import { Tooltip } from "./Tooltip";

interface GroupPickerProps {
  value: string;
  onChange: (next: string) => void;
  options: string[];
  noneLabel?: string;
  newLabel?: string;
}

export function GroupPicker({
  value,
  onChange,
  options,
  noneLabel,
  newLabel,
}: GroupPickerProps) {
  const { t } = useTranslation();
  const [isTyping, setIsTyping] = useState(false);
  const showInput = isTyping || (value !== "" && !options.includes(value));

  // selected = s3 with a brighter hairline and full-strength text; never the accent
  const chipClass = (active: boolean) =>
    cn(
      "h-7 px-2.5 rounded-md border text-xs font-[520] transition-colors duration-fast",
      active
        ? "bg-s3 border-line-3 text-fg"
        : "bg-s2 border-line text-fg-2 hover:text-fg hover:border-line-2",
    );

  if (showInput) {
    return (
      <div className="flex items-center gap-2">
        <SearchStyleInput
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("placeholders.group_name")}
          className="w-full"
          autoFocus
        />
        <Tooltip content={t("common.cancel")} wrapperClassName="shrink-0">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsTyping(false);
            }}
            className="flex items-center justify-center w-9 h-9 rounded-md border border-line text-fg-3 hover:text-fg hover:bg-s3 hover:border-line-2 transition-colors duration-fast"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onChange("")}
        className={chipClass(value === "")}
      >
        {noneLabel ?? t("profiles.import.group_none")}
      </button>

      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={chipClass(value === option)}
        >
          {option}
        </button>
      ))}

      <button
        type="button"
        onClick={() => {
          onChange("");
          setIsTyping(true);
        }}
        className="h-7 px-2.5 rounded-md border border-dashed border-line-2 text-fg-3 hover:text-fg hover:border-line-3 text-xs font-[520] transition-colors duration-fast flex items-center gap-1.5"
      >
        <Plus size={13} strokeWidth={1.75} />
        {newLabel ?? t("profiles.import.group_new")}
      </button>
    </div>
  );
}
