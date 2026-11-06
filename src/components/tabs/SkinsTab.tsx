"use client";

import type React from "react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { setDiscordState } from "../../utils/discordRpc";
import type { MinecraftProfile, TexturesData } from "../../types/minecraft";
import type { MinecraftSkin, SkinVariant } from "../../types/localSkin";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { MinecraftSkinService } from "../../services/minecraft-skin-service";
import { Button } from "../ui/buttons/Button";
import { StatusMessage } from "../ui/StatusMessage";
import { SignedOutState } from "../account/SignedOutState";
import { SkinViewer } from "../launcher/SkinViewer";
import { useDebounce } from "../../hooks/useDebounce";
import { useThemeStore } from "../../store/useThemeStore";
import { useSkinStore } from "../../store/useSkinStore";
import { toast } from "react-hot-toast";
import { SearchInput } from "../ui/SearchInput";
import { useGlobalModal } from "../../hooks/useGlobalModal";
import { AddSkinModal } from "../modals/AddSkinModal";
import { cn } from "../../lib/utils";
import { useSkinPreview } from "../../hooks/useSkinPreview";
import { parseErrorMessage } from "../../utils/error-utils";

function useDelayedFlag(active: boolean, delayMs: number): boolean {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }
    const id = setTimeout(() => setShown(true), delayMs);
    return () => clearTimeout(id);
  }, [active, delayMs]);

  return shown;
}

const PREVIEW_WIDTH = 176;
const PREVIEW_HEIGHT = 280;

/** Entrance of the n-th tile when animations are on: the page fade, a few ms later per tile. */
function useTileEntrance(index: number): { className: string; style: React.CSSProperties } {
  const animated = useThemeStore((state) => state.isBackgroundAnimationEnabled);
  if (!animated) return { className: "", style: {} };
  return { className: "cc-enter", style: { animationDelay: `${Math.min(index, 12) * 24}ms` } };
}

/** A thin spinning ring (rendering, applying). */
function Ring({ size = 18 }: { size?: number }) {
  return (
    <span
      className="block rounded-full border-[1.5px] border-line-3 border-t-fg-2 animate-spin"
      style={{ width: size, height: size }}
    />
  );
}

const SkinPreview = memo(
  ({
    skin,
    index,
    loading,
    localSkinsLoading,
    selectedLocalSkin,
    isApplied,
    onClick,
    onEditSkin,
    onDeleteSkin,
  }: {
    skin: MinecraftSkin;
    index: number;
    loading: boolean;
    localSkinsLoading: boolean;
    selectedLocalSkin: MinecraftSkin | null;
    isApplied?: boolean;
    onClick: (skin: MinecraftSkin) => void;
    onEditSkin?: (
      skin: MinecraftSkin,
      event: React.MouseEvent<HTMLButtonElement>,
    ) => void;
    onDeleteSkin?: (
      skinId: string,
      skinName: string,
      event: React.MouseEvent<HTMLButtonElement>,
    ) => void;
  }) => {
    const { t } = useTranslation();
    const entrance = useTileEntrance(index);
    const isSelected = selectedLocalSkin?.id === skin.id;
    const isDisabled = loading && isSelected;

    const { url: previewUrl, loading: isRenderLoading } = useSkinPreview(true, {
      textureUrl: skin.base64_data
        ? `data:image/png;base64,${skin.base64_data}`
        : null,
      variant: skin.variant,
      width: PREVIEW_WIDTH,
      height: PREVIEW_HEIGHT,
    });
    const canShowSpinner = useDelayedFlag(isRenderLoading, 500);

    return (
      <div
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-label={skin.name}
        aria-current={isApplied || undefined}
        style={{ ...entrance.style, borderRadius: "var(--r-lg)" }}
        className={cn(
          "group relative p-2 bg-s1 border cursor-pointer outline-none",
          "transition-[transform,border-color] duration-fast ease-out hover:-translate-y-px",
          "focus-visible:border-line-3",
          isApplied ? "border-line-3" : "border-line hover:border-line-2",
          isDisabled && "pointer-events-none",
          entrance.className,
        )}
        onClick={() => !isDisabled && onClick(skin)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !isDisabled && e.target === e.currentTarget) {
            e.preventDefault();
            onClick(skin);
          }
        }}
      >
        {/* the preview on its well */}
        <div className="relative aspect-[4/5] bg-s2 rounded-md overflow-hidden flex items-center justify-center">
          {isRenderLoading && canShowSpinner ? (
            <Ring />
          ) : !isRenderLoading ? (
            <SkinViewer
              skinUrl={previewUrl}
              width={PREVIEW_WIDTH}
              height={PREVIEW_HEIGHT}
              fill
              className="block h-[92%] w-auto"
            />
          ) : null}

          {isApplied && (
            <span
              className="absolute top-2 left-2 w-5 h-5 grid place-items-center bg-fg text-bg rounded-sm"
              title={t('skins.applied')}
            >
              <Check size={13} strokeWidth={2.5} />
            </span>
          )}

          {/* actions, shown on hover and keyboard focus */}
          <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-fast">
            {onEditSkin && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onEditSkin(skin, event);
                }}
                className="cc-icon-btn bg-s3 border border-line-2"
                title={t('skins.editProperties')}
                aria-label={t('skins.editProperties')}
                disabled={isDisabled}
              >
                <Pencil size={14} strokeWidth={1.75} />
              </button>
            )}
            {onDeleteSkin && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onDeleteSkin(skin.id, skin.name, event);
                }}
                className="cc-icon-btn bg-s3 border border-line-2 hover:!text-err"
                title={t('skins.deleteSkin')}
                aria-label={t('skins.deleteSkin')}
                disabled={isDisabled}
              >
                <Trash2 size={14} strokeWidth={1.75} />
              </button>
            )}
          </div>

          {/* applying overlay */}
          {isDisabled && (
            <div className="absolute inset-0 bg-bg/75 flex flex-col items-center justify-center gap-2">
              <Ring />
              <span className="text-xs text-fg-2">{t('skins.applying')}</span>
            </div>
          )}
        </div>

        <div className="px-1 pt-2.5 pb-0.5">
          <div className="flex items-center justify-between gap-2 h-4">
            <span className="cc-eyebrow">
              {skin.variant === "slim" ? t('skins.slim') : t('skins.classic')}
            </span>
            {isApplied && (
              <span className="text-[11px] font-[520] text-fg">{t('skins.applied')}</span>
            )}
          </div>
          <div
            className="text-[13px] leading-5 font-[520] text-fg truncate mt-1"
            title={skin.name}
          >
            {skin.name}
          </div>
        </div>
      </div>
    );
  },
);

const AddSkinCard = memo(
  ({ index, onClick }: { index: number; onClick: () => void }) => {
    const { t } = useTranslation();
    const entrance = useTileEntrance(index);

    return (
      <button
        type="button"
        style={{ ...entrance.style, borderRadius: "var(--r-lg)" }}
        className={cn(
          "group relative p-2 text-left bg-s1 border border-line hover:border-line-2",
          "transition-[transform,border-color] duration-fast ease-out hover:-translate-y-px",
          entrance.className,
        )}
        onClick={onClick}
      >
        <div className="aspect-[4/5] bg-s2 rounded-md grid place-items-center">
          <span className="w-9 h-9 grid place-items-center border border-line-2 rounded-md text-fg-3 group-hover:text-fg group-hover:border-line-3 transition-colors duration-fast">
            <Plus size={18} strokeWidth={1.75} />
          </span>
        </div>
        <div className="px-1 pt-2.5 pb-0.5">
          <div className="h-4 text-[11px] leading-4 text-fg-3 truncate">{t('skins.uploadOrImport')}</div>
          <div className="text-[13px] leading-5 font-[520] text-fg truncate mt-1">
            {t('skins.addNewSkin')}
          </div>
        </div>
      </button>
    );
  },
);


export function SkinsTab() {
  const {
    activeAccount,
    isLoading: accountLoading,
    error: accountError,
    initializeAccounts,
  } = useMinecraftAuthStore();
  const { showModal, hideModal } = useGlobalModal();
  const { t } = useTranslation();
  const { selectedSkinId, setSelectedSkinId } = useSkinStore();

  useEffect(() => { setDiscordState("Browsing Skins"); }, []);
  const [skinData, setSkinData] = useState<MinecraftProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [localSkins, setLocalSkins] = useState<MinecraftSkin[]>([]);
  const [localSkinsLoading, setLocalSkinsLoading] = useState<boolean>(false);
  const [localSkinsError, setLocalSkinsError] = useState<string | null>(null);
  const [selectedLocalSkin, setSelectedLocalSkin] =
    useState<MinecraftSkin | null>(null);
  const [search, setSearch] = useState<string>("");
  const [currentSkinId, setCurrentSkinId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 250);

  const filteredSkins = useMemo(() => {
    if (!debouncedSearch.trim()) return localSkins;
    return localSkins.filter((skin) =>
      skin.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
    );
  }, [localSkins, debouncedSearch]);

  const loadSkinData = useCallback(async () => {
    if (!activeAccount) return;

    setLoading(true);

    try {
      const data = await MinecraftSkinService.getUserSkinData();
      setSkinData(data);

      if (data?.properties) {
        const texturesProp = data.properties.find(
          (prop: { name: string; value: string }) => prop.name === "textures",
        );

        if (texturesProp) {
          try {
            const decodedValue = atob(texturesProp.value);
            const texturesJson = JSON.parse(decodedValue) as TexturesData;
            const skinInfo = texturesJson.textures?.SKIN;

            if (skinInfo?.url) {
              const urlParts = skinInfo.url.split("/");
              const skinIdFromUrl = urlParts[urlParts.length - 1].split(".")[0];
              setCurrentSkinId(skinIdFromUrl);
            }
          } catch (e) {
            console.error("Error parsing skin textures:", e);
            toast.error(t('skins.failedToParseSkinDetails'));
          }
        }
      }
    } catch (err) {
      console.error("Error loading skin data:", err);
      toast.error(parseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [activeAccount]);

  const loadLocalSkins = useCallback(async () => {
    setLocalSkinsLoading(true);
    setLocalSkinsError(null);

    try {
      const skins = await MinecraftSkinService.getAllSkins();

      setLocalSkins(skins);
      console.log(`Loaded ${skins.length} local skins`);

      if (selectedSkinId) {
        const selectedSkin = skins.find((skin) => skin.id === selectedSkinId);
        if (selectedSkin) {
          setSelectedLocalSkin(selectedSkin);
        }
      }
      setLocalSkinsLoading(false);
    } catch (err) {
      console.error("Error loading local skins:", err);
      setLocalSkinsError(parseErrorMessage(err));
      setLocalSkinsLoading(false);
    }
  }, [selectedSkinId]);

  // No account bootstrap here on purpose. This used to call initializeAccounts()
  // whenever there was no active account, with accountLoading in the dependency
  // list — so with nobody signed in it looped forever: fetch, flip loading,
  // re-run, fetch again. The tab sat on "Loading account..." and hammered the
  // backend. The account list is loaded once at startup (App and the header
  // bar), which is all this tab needs.
  useEffect(() => {
    if (activeAccount) {
      loadSkinData();
    }

    loadLocalSkins();
  }, [activeAccount, loadSkinData, loadLocalSkins]);

  const startEditSkin = (
    skin: MinecraftSkin | null,
    event?: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event?.stopPropagation();
    showModal('add-skin-modal', (
      <AddSkinModal
        skin={skin}
        onSave={saveSkin}
        onSaveAndApply={saveAndApplySkin}
        onAdd={addSkin}
        isLoading={localSkinsLoading}
      />
    ));
  };

  const saveSkin = async (skin: MinecraftSkin) => {
    if (!skin) return;

    try {
      const updatedSkin = await MinecraftSkinService.updateSkinProperties(
        skin.id,
        skin.name,
        skin.variant,
      );

      if (updatedSkin) {
        setLocalSkins((prevSkins) =>
          prevSkins.map((s) => (s.id === updatedSkin.id ? updatedSkin : s)),
        );
        if (selectedLocalSkin?.id === updatedSkin.id) {
          setSelectedLocalSkin(updatedSkin);
        }
        hideModal('add-skin-modal');
      } else {
        toast.error(t('skins.skinNotFound'));
      }
    } catch (err) {
      console.error("Error updating skin properties:", err);
      toast.error(parseErrorMessage(err));
    }
  };

  const addSkin = async (
    skinInput: string,
    targetName: string,
    targetVariant: SkinVariant,
    description?: string | null,
  ) => {
    try {
      const newSkin = await MinecraftSkinService.addSkinLocally(
        skinInput,
        targetName,
        targetVariant,
        description,
      );
      setLocalSkins((prevSkins) =>
        [...prevSkins, newSkin].sort((a, b) => a.name.localeCompare(b.name)),
      );
      hideModal('add-skin-modal');
    } catch (err) {
      console.error("Error adding new skin:", err);
      const errorMessage =
        parseErrorMessage(err);
      toast.error(t('skins.failedToAddSkin', { error: errorMessage }));
    }
  };

  const handleDeleteSkin = async (skinId: string, skinName: string) => {
    const deletePromise = async () => {
      const removed = await MinecraftSkinService.removeSkin(skinId);
      if (!removed) {
        throw new Error(
          `Skin "${skinName}" could not be found or was already deleted.`,
        );
      }
      return removed;
    };

    toast.promise(
      deletePromise(),
      {
        loading: t('skins.deletingSkin', { name: skinName }),
        success: () => {
          setLocalSkins((prevSkins) =>
            prevSkins.filter((s) => s.id !== skinId),
          );
          if (selectedLocalSkin?.id === skinId) {
            setSelectedLocalSkin(null);
            setSelectedSkinId(null);
          }
          return t('skins.deletedSkinSuccess', { name: skinName });
        },
        error: (err) => {
          console.error("Error deleting skin:", err);
          return parseErrorMessage(err);
        },
      },
      {
        success: { duration: 4000 },
        error: { duration: 5000 },
      },
    );
  };

  const saveAndApplySkin = async (skin: MinecraftSkin) => {
    try {
      await saveSkin(skin);
      await applyLocalSkin(skin);
    } catch (err) {
      console.error("Save and apply failed:", err);
      toast.error(parseErrorMessage(err));
    }
  };

  const applyLocalSkin = async (skin: MinecraftSkin) => {
    if (!activeAccount) {
      toast.error(t('skins.mustBeLoggedIn'));
      return;
    }

    if (isSkinApplied(skin)) {
      toast.error(t('skins.skinAlreadyApplied', { name: skin.name }));
      return;
    }

    setLoading(true);
    setSelectedLocalSkin(skin);

    try {
      await MinecraftSkinService.applySkinFromBase64(
        skin.base64_data,
        skin.variant,
        skin.name,
      );

      toast.success(
        t('skins.appliedSkinSuccess', { name: skin.name, variant: skin.variant }),
      );
      await loadSkinData();
    } catch (err) {
      console.error("Error applying local skin:", err);
      toast.error(parseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const isSkinApplied = (skin: MinecraftSkin): boolean => {
    if (!currentSkinId) return false;
    return skin.id === currentSkinId;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* header: title, and while signed in the search and the add button */}
      <div className="flex-shrink-0 flex items-start justify-between gap-6 px-6 pt-5 pb-4 border-b border-line">
        <div className="min-w-0">
          <h1 className="font-display text-[22px] leading-[28px] font-[650] text-fg flex items-baseline gap-2.5">
            {t('skins.title')}
            {activeAccount && !localSkinsLoading && (
              <span className="cc-num text-[13px] font-[450] text-fg-4">{localSkins.length}</span>
            )}
          </h1>
          <p className="text-[13px] leading-5 text-fg-3 mt-1 truncate">{t('skins.subtitle')}</p>
        </div>
        {/* Hidden while signed out: with no skins to search and the add button
            already gated, the controls would be a row of dead ends. */}
        {activeAccount && (
          <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('skins.searchPlaceholder')}
              size="sm"
              className="w-[220px]"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => startEditSkin(null)}
              title={t('skins.addSkin')}
              disabled={!activeAccount}
              icon={<Plus size={15} strokeWidth={1.75} />}
            >
              {t('skins.addSkin')}
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 py-5">
        {accountLoading ? (
          <p className="text-[13px] text-fg-2 py-4">{t('skins.loadingAccount')}</p>
        ) : !activeAccount ? (
          // Signed out wins over the error banner, and any error rides along
          // above it. The other way round the tab was a dead end: the banner
          // hid the sign-in button, so a failed attempt left no way to try
          // again without restarting the launcher.
          <div className="h-full flex flex-col">
            {accountError && (
              <StatusMessage
                type="error"
                className="text-xs"
                message={t('skins.accountError', { error: accountError })}
              />
            )}
            <div className="flex-1">
              <SignedOutState
                icon="lucide:shirt"
                title={t('skins.signedOut.title')}
                description={t('skins.signedOut.description')}
              />
            </div>
          </div>
        ) : accountError ? (
          <StatusMessage
            type="error"
            className="text-xs"
            message={t('skins.accountError', { error: accountError })}
          />
        ) : localSkinsLoading ? (
          <p className="text-[13px] text-fg-2 py-4">{t('skins.loadingSkins')}</p>
        ) : localSkinsError ? (
          <StatusMessage type="error" className="text-xs" message={localSkinsError} />
        ) : localSkins.length > 0 && filteredSkins.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-[13px] text-fg-2">{t('skins.noSkinsMatchSearch')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(164px,1fr))] gap-3">
            <AddSkinCard index={0} onClick={() => startEditSkin(null, undefined)} />
            {filteredSkins.map((skin, index) => (
              <SkinPreview
                key={skin.id}
                skin={skin}
                index={index + 1}
                loading={loading}
                localSkinsLoading={localSkinsLoading}
                selectedLocalSkin={selectedLocalSkin}
                isApplied={isSkinApplied(skin)}
                onClick={(target) => startEditSkin(target)}
                onEditSkin={startEditSkin}
                onDeleteSkin={handleDeleteSkin}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
