"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Check, ImagePlus, Loader2, TriangleAlert } from "lucide-react";
import type { ModLoader } from "../../../types/profile";
import { Modal } from "../../ui/Modal";
import { Button } from "../../ui/buttons/Button";
import { StatusMessage } from "../../ui/StatusMessage";
import { SearchStyleInput } from "../../ui/Input";
import { RangeSlider } from "../../ui/RangeSlider";
import { Checkbox } from "../../ui/Checkbox";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { NoriskModEntryDefinition, NoriskModpacksConfig, NoriskPackDefinition } from "../../../types/noriskPacks";
import { loadPacks, usePacks } from "../../../hooks/usePacks";
import { useTranslation } from "react-i18next";
import { useGlobalModal } from "../../../hooks/useGlobalModal";
import { IconPicker, handleIconImgLoad, type ChosenIcon } from "../IconPicker";
import { getRandomBlockIcon } from "../../../data/block-icons";
import { getDefaultMemoryMaxMb, getSystemRamMb } from "../../../services/profile-service";
import { logError } from "../../../utils/logging-utils";
import { parseErrorMessage } from "../../../utils/error-utils";
import { WizardSteps, FieldLabel } from "./WizardParts";

const forbiddenChars = /[<>:"/\\|?*]/g;
const forbiddenTrailing = /[ .]$/;

interface ProfileWizardV2Step3Props {
    onClose: () => void;
    onBack: () => void;
    onCreate: (profileData: {
        name: string;
        group: string | null;
        minecraftVersion: string;
        loader: ModLoader;
        loaderVersion: string | null;
        memoryMaxMb: number;
        selectedNoriskPackId: string | null;
        use_shared_minecraft_folder?: boolean;
        chosenIcon: ChosenIcon;
    }) => void;
    selectedMinecraftVersion: string;
    selectedLoader: ModLoader;
    selectedLoaderVersion: string | null;
    defaultGroup?: string | null;
}

export function ProfileWizardV2Step3({
    onClose,
    onBack,
    onCreate,
    selectedMinecraftVersion,
    selectedLoader,
    selectedLoaderVersion,
    defaultGroup
}: ProfileWizardV2Step3Props) {
    const { t } = useTranslation();
    const { showModal, hideModal } = useGlobalModal();
    const [chosenIcon, setChosenIcon] = useState<ChosenIcon>(() => ({ url: getRandomBlockIcon().url }));
    const [profileName, setProfileName] = useState("");
    const [profileGroup, setProfileGroup] = useState(defaultGroup || "");
    const [memoryMaxMb, setMemoryMaxMb] = useState<number>(0);
    const [systemRamMb, setSystemRamMb] = useState<number>(16384);
    const [recommendedRam, setRecommendedRam] = useState<number>(0);
    const [selectedNoriskPackId, setSelectedNoriskPackId] = useState<string | null>(null);
    const { packs: noriskPacks, loading: packsLoading } = usePacks();
    const [packCompatibilityWarning, setPackCompatibilityWarning] = useState<string | null>(null);
    const [showYellowWarning, setShowYellowWarning] = useState(false);
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
    const [useSharedMinecraftFolder, setUseSharedMinecraftFolder] = useState(
        defaultGroup && defaultGroup.toLowerCase() !== "modpacks"
    ); // Default to true when group exists and is not "modpacks"
    const effectiveMemoryMaxMb = memoryMaxMb || recommendedRam || 4096;

    useEffect(() => {
        let cancelled = false;
        const loadMemoryDefaults = async () => {
            try {
                const [systemRam, recommended] = await Promise.all([
                    getSystemRamMb(),
                    getDefaultMemoryMaxMb(),
                ]);
                if (cancelled) return;
                setSystemRamMb(systemRam);
                setRecommendedRam(recommended);
                setMemoryMaxMb((current) => (current === 0 ? recommended : current));
            } catch (e) {
                logError(`[ProfileWizard] Failed to load memory defaults: ${e}`);
                if (cancelled) return;
                setRecommendedRam(4096);
                setMemoryMaxMb((current) => (current === 0 ? 4096 : current));
            }
        };
        loadMemoryDefaults();
        return () => {
            cancelled = true;
        };
    }, []);

    // Update profile group when defaultGroup changes
    useEffect(() => {
        if (defaultGroup && !profileGroup) {
            setProfileGroup(defaultGroup);
        }
    }, [defaultGroup]);

    // Update shared Minecraft folder setting when defaultGroup changes
    useEffect(() => {
        setUseSharedMinecraftFolder(
            defaultGroup && defaultGroup.toLowerCase() !== "modpacks"
        );
    }, [defaultGroup]);

    const [checkingCompatibility, setCheckingCompatibility] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const defaultNoriskPackId = noriskPacks["norisk-prod"]
        ? "norisk-prod"
        : Object.keys(noriskPacks)[0] ?? null;

    useEffect(() => {
        if (defaultNoriskPackId) setSelectedNoriskPackId(defaultNoriskPackId);
    }, [defaultNoriskPackId]);

    const getLoaderDisplayName = (loader: ModLoader) => {
        const names = {
            vanilla: "Vanilla",
            fabric: "Fabric",
            forge: "Forge",
            neoforge: "NeoForge",
            quilt: "Quilt"
        };
        return names[loader] || loader;
    };

    const handleMemoryChange = (value: number) => {
        setMemoryMaxMb(value);
    };


    // Check pack compatibility when selection changes
    useEffect(() => {
        const checkPackCompatibility = async () => {
            if (!selectedNoriskPackId || selectedNoriskPackId === "") {
                setPackCompatibilityWarning(null);
                setShowYellowWarning(false);
                return;
            }

            setCheckingCompatibility(true);
            setPackCompatibilityWarning(null);
            setShowYellowWarning(false);

            try {
                // Get resolved packs with all mods
                const resolvedPacks = { packs: await loadPacks() };

                // Check if the selected pack has NoRisk Client mods for this version/loader
                const selectedPack = resolvedPacks.packs[selectedNoriskPackId];

                if (!selectedPack) {
                    setShowYellowWarning(true);
                    return;
                }

                // Get the mods in the pack
                const mods = selectedPack.mods || [];

                // Check if any NoRisk Client mod exists and is compatible with the selected version/loader
                const hasCompatibleNoRiskClient = mods.some((mod: NoriskModEntryDefinition) => {
                    // Check if this is a NoRisk Client mod
                    if (mod.id === "noriskclient-client" || mod.id === "nrc-client") {
                        // Check if it has compatibility for the selected version and loader
                        const versionCompat = mod.compatibility?.[selectedMinecraftVersion];
                        const loaderCompat = versionCompat?.[selectedLoader];
                        console.log(`Checking mod ${mod.id} compatibility:`, {
                            version: selectedMinecraftVersion,
                            loader: selectedLoader,
                            versionCompat,
                            loaderCompat,
                            hasCompat: !!loaderCompat
                        });
                        return !!loaderCompat; // Returns true if compatibility exists
                    }
                    return false;
                });

                console.log("Pack mods for", selectedNoriskPackId, selectedMinecraftVersion, selectedLoader, ":", mods);
                console.log("Has compatible NoRisk Client:", hasCompatibleNoRiskClient);

                if (!hasCompatibleNoRiskClient) {
                    setShowYellowWarning(true);
                }
            } catch (err) {
                console.warn("Failed to check pack compatibility:", err);
                setShowYellowWarning(true);
            } finally {
                setCheckingCompatibility(false);
            }
        };

        checkPackCompatibility();
    }, [selectedNoriskPackId, selectedMinecraftVersion, selectedLoader]);

    // Auto-generate profile name based on loader and minecraft version
    useEffect(() => {
        const generateProfileName = () => {
            const loaderName = getLoaderDisplayName(selectedLoader);
            return `${loaderName} ${selectedMinecraftVersion}`;
        };

        setProfileName(generateProfileName());
    }, [selectedLoader, selectedMinecraftVersion]);

    const openIconPicker = () => {
        showModal("profile-icon-picker", (
            <IconPicker
                selected={chosenIcon}
                onSelect={setChosenIcon}
                onClose={() => hideModal("profile-icon-picker")}
            />
        ), 1100);
    };

    const handleCreate = async () => {
        if (!profileName.trim()) {
            setError(t('profiles.wizard.nameRequired'));
            return;
        }

        setCreating(true);
        setError(null);

        try {
            await onCreate({
                name: profileName.trim(),
                group: profileGroup.trim() || null,
                minecraftVersion: selectedMinecraftVersion,
                loader: selectedLoader,
                loaderVersion: selectedLoaderVersion,
                memoryMaxMb: effectiveMemoryMaxMb,
                selectedNoriskPackId: selectedNoriskPackId,
                use_shared_minecraft_folder: useSharedMinecraftFolder,
                chosenIcon: chosenIcon
            });
        } catch (err) {
            console.error("Failed to create profile:", err);
            setError(t('profiles.wizard.createError', { error: parseErrorMessage(err) }));
        } finally {
            setCreating(false);
        }
    };

    // ProfileName ForbiddenCharacter Event Handler
    const [profileCharRemoved, setProfileCharRemoved] = useState(false);
    const [profileNameHasForbiddenEnding, setProfileNameHasForbiddenEnding] = useState(false);

    const handleProfileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const cleanValue = value.replace(forbiddenChars, "");

        if (value !== cleanValue) {
            setProfileCharRemoved(true);
        }

        setProfileNameHasForbiddenEnding(forbiddenTrailing.test(cleanValue));

        setProfileName(cleanValue);
    };

    const renderContent = () => {
        if (error) {
            return <StatusMessage type="error" message={error} />;
        }

        const iconPreviewSrc = "url" in chosenIcon ? chosenIcon.url : convertFileSrc(chosenIcon.path);

        return (
            <div className="space-y-6">
                {/* Icon, name and group */}
                <div className="flex gap-3 items-end">
                    {/* Profile icon: no label so it doesn't add a row that offsets the inputs */}
                    <button
                        type="button"
                        onClick={openIconPicker}
                        title={t('profiles.wizard.profileIcon')}
                        aria-label={t('profiles.wizard.profileIcon')}
                        className="group relative w-[56px] h-[56px] flex-shrink-0 overflow-hidden grid place-items-center bg-s3 border border-line-2 hover:border-line-3 transition-colors duration-fast"
                        style={{ borderRadius: "var(--r-md)" }}
                    >
                        <img
                            src={iconPreviewSrc}
                            alt=""
                            className="w-full h-full object-cover"
                            onLoad={handleIconImgLoad}
                        />
                        <span className="absolute inset-0 grid place-items-center bg-bg/60 opacity-0 group-hover:opacity-100 transition-opacity duration-fast">
                            <ImagePlus size={16} strokeWidth={1.75} className="text-fg" />
                        </span>
                    </button>
                    <div className="grid grid-cols-2 gap-3 flex-1">
                        <div>
                            <FieldLabel>{t('profiles.wizard.profileName')}</FieldLabel>
                            <SearchStyleInput
                                value={profileName}
                                onChange={handleProfileNameChange}
                                placeholder={t('profiles.wizard.enterProfileName')}
                                required
                            />
                        </div>

                        <div>
                            <FieldLabel>{t('profiles.wizard.groupOptional')}</FieldLabel>
                            <SearchStyleInput
                                value={profileGroup}
                                onChange={(e) => setProfileGroup(e.target.value)}
                                placeholder={t('profiles.wizard.enterGroupName')}
                            />
                        </div>
                    </div>
                </div>
                {(profileCharRemoved || profileNameHasForbiddenEnding) && (
                    <div className="-mt-4 pl-[68px] space-y-0.5">
                        {profileCharRemoved && (
                            <p className="text-[12px] text-err">{t('profiles.wizard.forbiddenChars')}</p>
                        )}
                        {profileNameHasForbiddenEnding && (
                            <p className="text-[12px] text-err">{t('profiles.wizard.forbiddenEnding')}</p>
                        )}
                    </div>
                )}

                {/* Shared folder */}
                <div className="pt-5 border-t border-line">
                    <Checkbox
                        label={t('profiles.wizard.useSharedFolder')}
                        checked={useSharedMinecraftFolder}
                        onChange={(event) => setUseSharedMinecraftFolder(event.target.checked)}
                        description={t('profiles.wizard.sharedFolderDescription')}
                        size="md"
                    />
                    <p className="text-[11.5px] text-fg-4 ml-[26px] mt-1">
                        {t('profiles.wizard.canChangeAnytime')}
                    </p>
                </div>

                {/* Memory */}
                <div className="pt-5 border-t border-line">
                    <FieldLabel hint={<span className="cc-num">{t('profiles.wizard.recommendedRam', { ram: recommendedRam || 4096 })}</span>}>
                        {t('profiles.wizard.memoryLabel')}
                    </FieldLabel>
                    <RangeSlider
                        value={effectiveMemoryMaxMb}
                        onChange={handleMemoryChange}
                        min={1024}
                        max={systemRamMb}
                        step={512}
                        valueLabel={`${effectiveMemoryMaxMb} MB (${(effectiveMemoryMaxMb / 1024).toFixed(1)} GB)`}
                        minLabel="1 GB"
                        maxLabel={`${systemRamMb} MB`}
                        variant="flat"
                        recommendedRange={[4096, 8192]}
                        unit="MB"
                    />
                </div>

                {/* CrimeClient features */}
                <div className="pt-5 border-t border-line space-y-2">
                    <Checkbox
                        label={t('profiles.wizard.useNrcFeatures')}
                        checked={Boolean(selectedNoriskPackId)}
                        onChange={(event) =>
                            setSelectedNoriskPackId(
                                event.target.checked ? defaultNoriskPackId : null,
                            )
                        }
                        size="md"
                        disabled={packsLoading || !defaultNoriskPackId}
                    />

                    {showYellowWarning ? (
                        <p className="flex items-center gap-1.5 ml-[26px] text-[12px] text-warn">
                            <TriangleAlert size={13} strokeWidth={1.75} className="flex-shrink-0" />
                            {t('profiles.wizard.nrcIncompatibleWarning')}
                        </p>
                    ) : (
                        <p className="ml-[26px] text-[12px] text-fg-3">
                            {t('profiles.wizard.noriskPackDescription')}
                        </p>
                    )}

                    {checkingCompatibility && (
                        <div className="flex items-center gap-2 ml-[26px] text-fg-3">
                            <Loader2 size={13} strokeWidth={1.75} className="animate-spin" />
                            <span className="text-[12px]">
                                {t('profiles.wizard.checkingCompatibility')}
                            </span>
                        </div>
                    )}

                    {packCompatibilityWarning && (
                        <div
                            className="ml-[26px] flex items-start gap-2 px-3 py-2 border border-err/30 bg-err/[0.06]"
                            style={{ borderRadius: "var(--r-md)" }}
                        >
                            <TriangleAlert size={14} strokeWidth={1.75} className="text-err flex-shrink-0 mt-px" />
                            <p className="text-[12px] text-fg-2">
                                {packCompatibilityWarning}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderFooter = () => (
        <div className="flex justify-between items-center">
            <Button
                variant="ghost"
                onClick={onBack}
                disabled={creating}
                size="sm"
                icon={<ArrowLeft size={15} strokeWidth={1.75} />}
                iconPosition="left"
            >
                {t('profiles.wizard.back')}
            </Button>

            <Button
                variant="default"
                onClick={handleCreate}
                disabled={
                    creating ||
                    !profileName.trim() ||
                    profileNameHasForbiddenEnding
                }
                size="sm"
                className="min-w-[128px]"
                icon={
                    creating ? (
                        <Loader2 size={15} strokeWidth={1.75} className="animate-spin" />
                    ) : (
                        <Check size={15} strokeWidth={2} />
                    )
                }
                iconPosition="left"
            >
                {creating ? t('profiles.wizard.creating') : t('profiles.wizard.createProfile')}
            </Button>
        </div>
    );

    return (
        <Modal
            title={t('profiles.newProfile')}
            onClose={onClose}
            width="lg"
            footer={renderFooter()}
        >
            <WizardSteps current={3} />
            <div className="min-h-[460px] px-5 py-5">
                {renderContent()}
            </div>
        </Modal>
    );
}