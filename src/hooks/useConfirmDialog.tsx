"use client";

import type React from "react";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/buttons/Button";
import { Input } from "../components/ui/Input";
import { StatusMessage } from "../components/ui/StatusMessage";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputInitialValue?: string;
  inputRequired?: boolean;
  type?: "confirm" | "input" | "warning" | "danger";
  icon?: string;
  fullscreen?: boolean;
}

export function useConfirmDialog() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: "Confirm",
    fullscreen: true,
  });
  const [inputValue, setInputValue] = useState("");
  const [isValid, setIsValid] = useState(true);
  const pending = useRef<((value: string | boolean) => void) | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const confirm = (options: ConfirmOptions): Promise<string | boolean> => {
    return new Promise((resolve) => {
      setOptions({ ...options, fullscreen: options.fullscreen ?? true });
      setInputValue(options.inputInitialValue || "");
      setIsValid(!options.inputRequired || !!options.inputInitialValue);
      settle(false);
      pending.current = resolve;
      setIsOpen(true);
    });
  };

  const settle = (value: string | boolean) => {
    const resolve = pending.current;
    pending.current = null;
    resolve?.(value);
  };

  const handleClose = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    setIsOpen(false);
    settle(false);
  };

  const handleConfirm = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    setIsOpen(false);
    settle(options.type === "input" ? inputValue : true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setIsValid(!options.inputRequired || !!value.trim());
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Enter" && isValid) {
        e.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isValid]);

  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [isOpen]);

  const renderFooter = () => (
    <div className="flex justify-end gap-2">
      <Button
        variant="secondary"
        onClick={handleClose}
        size="md"
      >
        {options.cancelText || t('common.cancel')}
      </Button>
      <Button
        ref={confirmButtonRef}
        variant={options.type === "danger" ? "destructive" : "default"}
        onClick={handleConfirm}
        disabled={options.type === "input" && !isValid}
        size="md"
      >
        {options.confirmText || t('common.confirm')}
      </Button>
    </div>
  );

  const getStatusMessageType = () => {
    switch (options.type) {
      case "warning":
        return "warning";
      case "danger":
        return "error";
      default:
        return "info";
    }
  };

  const renderContent = () => (
    <div
      className="px-5 py-4 space-y-4"
      onClick={(e) => e.stopPropagation()}
    >
      {options.message &&
        (options.type === "warning" || options.type === "danger" ? (
          <StatusMessage
            type={getStatusMessageType()}
            message={options.message}
            className="mb-0"
          />
        ) : (
          <p className="text-[13px] leading-[1.55] text-fg-2 whitespace-pre-line">
            {options.message}
          </p>
        ))}

      {options.type === "input" && (
        <div>
          {options.inputLabel && (
            <p className="text-xs font-[520] text-fg-2 mb-1.5">{options.inputLabel}</p>
          )}
          <Input
            value={inputValue}
            onChange={handleInputChange}
            placeholder={options.inputPlaceholder}
            error={!isValid ? t('common.field_required') : undefined}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
  const confirmDialog =
    isMounted && isOpen
      ? createPortal(
          <Modal
            title={options.title}
            titleIcon={options.icon ? <Icon icon={options.icon} className="w-4 h-4" /> : undefined}
            onClose={handleClose}
            width="md"
            footer={renderFooter()}
          >
            {renderContent()}
          </Modal>,
          document.body,
        )
      : null;

  return {
    confirm,
    confirmDialog,
    isOpen,
  };
}
