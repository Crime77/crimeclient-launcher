"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@iconify/react";

import { Dropdown } from "../../ui/dropdown/Dropdown";
import { DropdownItem } from "../../ui/dropdown/DropdownItem";
import { DropdownDivider } from "../../ui/dropdown/DropdownDivider";
import { Modal } from "../../ui/Modal";
import { Button } from "../../ui/buttons/Button";
import { getBorderRadiusClass } from "../../ui/design-system";
import { useThemeStore } from "../../../store/useThemeStore";
import { cn } from "../../../lib/utils";
import { isMacOS } from "../../../utils/platform";
import type { Translate } from "./shared";

export interface MenuEntry {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  checked?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export interface MenuDef {
  id: string;
  label: string;
  sections: MenuEntry[][];
}

export function shortcutText(key: string, t: Translate): string {
  return isMacOS() ? `⌘${key}` : `${t("clips.editor.menu.ctrl")}+${key}`;
}

export function EditorMenuBar({
  menus,
  open,
  onOpenChange,
}: {
  menus: MenuDef[];
  open: string | null;
  onOpenChange: (id: string | null) => void;
}) {
  useEffect(() => {
    if (open === null) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onOpenChange(null);
        return;
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const index = menus.findIndex((menu) => menu.id === open);
      const step = event.key === "ArrowLeft" ? -1 : 1;
      onOpenChange(menus[(index + step + menus.length) % menus.length].id);
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [menus, onOpenChange, open]);

  return (
    <nav className="pointer-events-auto ml-2 flex shrink-0 items-center gap-px" role="menubar">
      {menus.map((menu) => (
        <MenuTrigger
          key={menu.id}
          menu={menu}
          open={open === menu.id}
          anyOpen={open !== null}
          onOpenChange={onOpenChange}
        />
      ))}
    </nav>
  );
}

function MenuTrigger({
  menu,
  open,
  anyOpen,
  onOpenChange,
}: {
  menu: MenuDef;
  open: boolean;
  anyOpen: boolean;
  onOpenChange: (id: string | null) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => onOpenChange(open ? null : menu.id)}
        onMouseEnter={() => {
          if (anyOpen && !open) onOpenChange(menu.id);
        }}
        className={cn(
          "flex h-7 items-center rounded-sm px-2 text-[12.5px] transition-colors duration-fast focus:outline-none focus-visible:bg-s3",
          open ? "bg-s3 text-fg" : "text-fg-2 hover:bg-s2 hover:text-fg",
        )}
      >
        {menu.label}
      </button>
      <Dropdown
        isOpen={open}
        onClose={() => {
          if (open) onOpenChange(null);
        }}
        triggerRef={triggerRef}
        width={240}
        align="start"
        offset={6}
        ariaLabel={menu.label}
        className="py-1"
      >
        {menu.sections
          .filter((section) => section.length > 0)
          .map((section, index) => (
            <div key={section[0].id}>
              {index > 0 && <DropdownDivider />}
              {section.map((entry) => (
                <DropdownItem
                  key={entry.id}
                  role="menuitem"
                  disabled={entry.disabled}
                  shortcut={entry.shortcut}
                  icon={
                    <Icon
                      icon={
                        entry.checked === undefined
                          ? (entry.icon ?? "solar:widget-bold")
                          : entry.checked
                            ? "solar:check-square-bold"
                            : "solar:stop-linear"
                      }
                      className="h-4 w-4"
                      style={
                        entry.checked
                          ? { color: "var(--fg)" }
                          : entry.checked === undefined && !entry.icon
                            ? { opacity: 0 }
                            : undefined
                      }
                    />
                  }
                  onClick={() => {
                    onOpenChange(null);
                    entry.onSelect();
                  }}
                >
                  {entry.label}
                </DropdownItem>
              ))}
            </div>
          ))}
      </Dropdown>
    </>
  );
}

export function EditorHelpModal({ onClose, t }: { onClose: () => void; t: Translate }) {
  const steps = [
    { icon: "solar:scissors-bold", text: t("clips.editor.help.step_trim") },
    isMacOS()
      ? {
          icon: "solar:soundwave-bold",
          text: t("clips.editor.help.step_sound", { name: t("clips.editor.audio") }),
        }
      : { icon: "solar:text-bold", text: t("clips.editor.help.step_tools") },
    {
      icon: "solar:undo-left-bold",
      text: t("clips.editor.help.step_undo", { keys: shortcutText("Z", t) }),
    },
    { icon: "solar:check-circle-bold", text: t("clips.editor.help.step_save") },
  ];

  return (
    <Modal
      title={t("clips.editor.help.title")}
      titleIcon={<Icon icon="solar:question-circle-bold" className="h-4 w-4" />}
      onClose={onClose}
      width="sm"
      footer={
        <div className="flex justify-end">
          <Button variant="default" size="sm" onClick={onClose}>
            {t("clips.editor.help.ok")}
          </Button>
        </div>
      }
    >
      <ol className="flex flex-col divide-y divide-line px-1">
        {steps.map((step, index) => (
          <li key={step.icon} className="flex items-start gap-3 py-3">
            <span className="mt-px w-5 shrink-0 font-mono text-[11px] leading-5 text-fg-4">
              {String(index + 1).padStart(2, "0")}
            </span>
            <Icon icon={step.icon} className="mt-0.5 h-4 w-4 shrink-0 text-fg-3" />
            <span className="min-w-0 flex-1 text-[13px] leading-5 text-fg-2">
              {step.text}
            </span>
          </li>
        ))}
      </ol>
    </Modal>
  );
}
