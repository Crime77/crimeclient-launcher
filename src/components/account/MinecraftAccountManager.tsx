"use client";

import { Check, Loader2, Plus, Trash2, UserX, X } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import type { MinecraftAccount } from "../../types/minecraft";
import { StatusMessage } from "../ui/StatusMessage";
import { menuItemClasses } from "../ui/design-system";
import { cn } from "../../lib/utils";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { gsap } from "gsap";
import { PlayerHead } from "../common/PlayerHead";
import { useAddMinecraftAccount } from "../../hooks/useAddMinecraftAccount";

interface MinecraftAccountManagerProps {
  onClose: () => void;
  isInDropdown?: boolean;
}

export function MinecraftAccountManager({
  onClose,
  isInDropdown,
}: MinecraftAccountManagerProps) {
  const {
    accounts,
    isLoading,
    error,
    removeAccount,
    setActiveAccount,
  } = useMinecraftAuthStore();
  const { t } = useTranslation();
  const { startLogin: handleAddAccount } = useAddMinecraftAccount();

  const handleSetActive = async (accountId: string) => {
    try {
      await setActiveAccount(accountId);
    } catch (err) {
      console.error("Error setting active account:", err);
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    try {
      await removeAccount(accountId);
    } catch (err) {
      console.error("Error removing account:", err);
    }
  };

  const loadingState = (
    <div className="flex items-center gap-2 px-2.5 h-10 text-[13px] text-fg-3">
      <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
      {t('auth.loadingAccounts')}
    </div>
  );

  const emptyState = (
    <div className="flex items-start gap-2.5 px-2.5 py-3">
      <UserX size={16} strokeWidth={1.75} className="text-fg-3 mt-px flex-shrink-0" />
      <div>
        <p className="text-[13px] text-fg-2">{t('auth.noAccountsFound')}</p>
        <p className="text-xs text-fg-3 mt-0.5">{t('auth.addAccountToGetStarted')}</p>
      </div>
    </div>
  );

  if (isInDropdown) {
    // the account switcher above the sidebar's account row: a plain menu
    return (
      <div className="flex flex-col max-h-[400px]">
        <div className="h-9 flex-shrink-0 flex items-center justify-between pl-3 pr-1 border-b border-line">
          <span className="cc-eyebrow">{t('auth.minecraftAccounts')}</span>
          <button
            type="button"
            onClick={onClose}
            className="cc-icon-btn w-7 h-7"
            aria-label={t('common.close')}
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar max-h-[300px] p-1 flex flex-col gap-px">
          {isLoading && accounts.length === 0
            ? loadingState
            : accounts.length === 0
              ? emptyState
              : accounts.map((account) => (
                  <AccountItem
                    key={account.id}
                    account={account}
                    onSetActive={handleSetActive}
                    onRemoveAccount={handleRemoveAccount}
                    isLoading={isLoading}
                    isDropdownItem
                  />
                ))}
        </div>

        <div className="border-t border-line p-1">
          <button
            type="button"
            onClick={handleAddAccount}
            disabled={isLoading}
            className={cn(menuItemClasses(false), "disabled:opacity-45 disabled:pointer-events-none")}
          >
            {isLoading ? (
              <Loader2 size={14} strokeWidth={1.75} className="animate-spin text-fg-3" />
            ) : (
              <Plus size={14} strokeWidth={1.75} className="text-fg-3" />
            )}
            {isLoading ? t('auth.processing') : t('auth.addAccount')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <Modal
      title={t('auth.accountManager')}
      titleSubtitle={t('auth.manageAccountsDescription')}
      onClose={onClose}
      width="md"
      footer={
        <div className="flex justify-end">
          <Button
            variant="default"
            onClick={handleAddAccount}
            disabled={isLoading}
            icon={
              isLoading ? (
                <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
              ) : (
                <Plus size={14} strokeWidth={1.75} />
              )
            }
            size="md"
          >
            {isLoading ? t('auth.processing') : t('auth.addMinecraftAccount')}
          </Button>
        </div>
      }
    >
      <div className="p-5">
        {error && <StatusMessage type="error" message={error} className="mb-4" />}

        <div className="cc-eyebrow mb-2">{t('auth.yourAccounts')}</div>
        <div
          className="border border-line divide-y divide-line max-h-[40vh] overflow-y-auto custom-scrollbar"
          style={{ borderRadius: "var(--r-md)" }}
        >
          {isLoading && accounts.length === 0
            ? loadingState
            : accounts.length === 0
              ? emptyState
              : accounts.map((account) => (
                  <AccountItem
                    key={account.id}
                    account={account}
                    onSetActive={handleSetActive}
                    onRemoveAccount={handleRemoveAccount}
                    isLoading={isLoading}
                  />
                ))}
        </div>
      </div>
    </Modal>
  );
}

interface AccountItemProps {
  account: MinecraftAccount;
  onSetActive: (accountId: string) => Promise<void>;
  onRemoveAccount: (accountId: string) => Promise<void>;
  isLoading: boolean;
  isDropdownItem?: boolean;
}

function AccountItem({
  account,
  onSetActive,
  onRemoveAccount,
  isLoading,
  isDropdownItem,
}: AccountItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const { t } = useTranslation();
  // Avatar sizes in pixels
  const avatarSizePx = isDropdownItem ? 24 : 28;

  const handleAccountClick = () => {
    if (
      account.active ||
      isLoading ||
      isActivating ||
      isRemoving ||
      !itemRef.current
    )
      return;

    setIsActivating(true);
    gsap.to(itemRef.current, {
      scale: 0.98,
      duration: 0.08,
      yoyo: true,
      repeat: 1,
      ease: "power1.inOut",
      onComplete: () => {
        gsap.set(itemRef.current, { scale: 1 });
        const performSetActive = async () => {
          try {
            await onSetActive(account.id);
          } catch (err) {
            console.error("Error setting account active:", err);
          } finally {
            setIsActivating(false);
          }
        };
        performSetActive();
      },
    });
  };

  const handleRemoveClick = async () => {
    if (isLoading || isActivating || isRemoving) return;

    setIsRemoving(true);
    try {
      await onRemoveAccount(account.id);
    } catch (err) {
      console.error("Error removing account:", err);
      setIsRemoving(false);
    }
  };

  const effectiveIsLoading = isLoading || isActivating || isRemoving;
  const name = account.minecraft_username || account.username;

  return (
    <div
      ref={itemRef}
      className={cn(
        "group flex items-center gap-2.5 transition-colors duration-fast",
        isDropdownItem ? "h-10 pl-2 pr-1" : "h-12 pl-3 pr-2",
        account.active ? (isDropdownItem ? "bg-s3" : "bg-s2") : "hover:bg-s2",
        !account.active && !effectiveIsLoading ? "cursor-pointer" : "cursor-default",
        isActivating && "opacity-75",
      )}
      style={isDropdownItem ? { borderRadius: "var(--r-sm)" } : undefined}
      onClick={!account.active ? handleAccountClick : undefined}
    >
      <span
        className="flex-shrink-0 overflow-hidden bg-s3"
        style={{ width: avatarSizePx, height: avatarSizePx, borderRadius: "var(--r-sm)" }}
      >
        <PlayerHead uuid={account.id} username={name} size={avatarSizePx} />
      </span>
      <span className="min-w-0 flex-1 flex items-center gap-2">
        <span
          className={cn("text-[13px] truncate", account.active ? "font-[560] text-fg" : "text-fg-2 group-hover:text-fg")}
          title={name}
        >
          {name}
        </span>
        {isActivating && <Loader2 size={13} strokeWidth={1.75} className="animate-spin text-fg-3 flex-shrink-0" />}
      </span>
      {account.active && (
        <span className="flex items-center gap-1 text-[11px] text-fg-3 flex-shrink-0">
          <Check size={13} strokeWidth={2} className="text-fg-2" />
          {t('auth.active')}
        </span>
      )}
      {isDropdownItem ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveClick();
          }}
          disabled={effectiveIsLoading}
          className={cn(
            "cc-icon-btn w-7 h-7 flex-shrink-0 hover:!text-err",
            isRemoving ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
          )}
          aria-label={t('auth.removeAccount')}
          title={t('auth.removeAccount')}
        >
          {isRemoving ? (
            <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
          ) : (
            <Trash2 size={14} strokeWidth={1.75} />
          )}
        </button>
      ) : (
        <Button
          variant="destructive"
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveClick();
          }}
          disabled={effectiveIsLoading}
          size="xs"
          aria-label={t('auth.removeAccount')}
          icon={
            isRemoving ? (
              <Loader2 size={13} strokeWidth={1.75} className="animate-spin" />
            ) : (
              <Trash2 size={13} strokeWidth={1.75} />
            )
          }
        >
          {isRemoving ? t('auth.removing') : t('auth.remove')}
        </Button>
      )}
    </div>
  );
}
