"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Clapperboard, Gem, Layers, Play, Puzzle, Shirt } from "lucide-react";

import { TopBar, type TopNavItem } from "./TopBar";
import { useThemeStore } from "../../store/useThemeStore";
import {
  BACKGROUND_EFFECTS,
  useBackgroundEffectStore,
} from "../../store/background-effect-store";
import { useQualitySettingsStore } from "../../store/quality-settings-store";
import { MatrixRainEffect } from ".././effects/MatrixRainEffect";
import { EnchantmentParticlesEffect } from ".././effects/EnchantmentParticlesEffect";
import { NebulaWaves } from ".././effects/NebulaWaves";
import { NebulaParticles } from ".././effects/NebulaParticles";
import { NebulaGrid } from ".././effects/NebulaGrid";
import { NebulaVoxels } from ".././effects/NebulaVoxels";
import { NebulaLightning } from ".././effects/NebulaLightning";
import { NebulaLiquidChrome } from ".././effects/NebulaLiquidChrome";
import PlainBackground from "../effects/PlainBackground";
import { GlutEffect } from "../effects/GlutEffect";
import CustomMediaBackground from "../effects/CustomMediaBackground";
import { Snowfall } from "../../features/snow-effect/Snowfall";
import { useSnowEffectStore } from "../../store/snow-effect-store";
import { useLauncherTheme } from "../../hooks/useLauncherTheme";
import { useClipsStore } from "../../store/clips-store";
import { ProfileWizardV2Modal } from "../modals/ProfileWizardV2Modal";
import { ProfileSettingsModal } from "../modals/ProfileSettingsModal";
import { SettingsModal } from "../modals/SettingsModal";
import { ProfileDuplicateModal } from "../modals/ProfileDuplicateModal";
import { useTranslation } from "react-i18next";

interface AppLayoutProps {
  children: ReactNode;
  activeTab: string;
  onNavChange: (tabId: string) => void;
}

export function AppLayout({
  children,
  activeTab,
  onNavChange,
}: AppLayoutProps) {
  const { t } = useTranslation();
  const launcherRef = useRef<HTMLDivElement>(null);
  const { currentEffect, customMediaUrl, customMediaOnlyOnPlay, customMediaHideEffects } = useBackgroundEffectStore();
  const isCustomMediaVisible = Boolean(customMediaUrl) && (!customMediaOnlyOnPlay || activeTab === 'play');
  const shouldShowEffects = !(isCustomMediaVisible && customMediaHideEffects);

  const clipsEnabled = useClipsStore((state) => state.enabled);
  const refreshClips = useClipsStore((state) => state.refresh);

  useEffect(() => {
    void refreshClips();
  }, [refreshClips]);

  const navItems: TopNavItem[] = [
    { id: "play", icon: Play, label: t("nav.play") },
    { id: "profiles", icon: Layers, label: t("nav.profiles") },
    { id: "mods", icon: Puzzle, label: t("nav.mods") },
    { id: "skins", icon: Shirt, label: t("nav.skins") },
    { id: "shop", icon: Gem, label: t("nav.shop") },
    ...(clipsEnabled ? [{ id: "clips", icon: Clapperboard, label: t("nav.clips") }] : []),
  ];
  const { qualityLevel } = useQualitySettingsStore();
  const { accentColor: themeAccentColor } = useThemeStore();
  const { isEnabled: isSnowEnabled } = useSnowEffectStore();
  const { selectedTheme, isThemeActive } = useLauncherTheme();

  const getQualityParams = () => {
    switch (qualityLevel) {
      case "low":
        return { particleCount: 30, opacity: 0.2, speed: 0.5 };
      case "high":
        return { particleCount: 80, opacity: 0.4, speed: 1.5 };
      default:
        return { particleCount: 50, opacity: 0.3, speed: 1 };
    }
  };

  const qualityParams = getQualityParams();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(launcherRef.current, { opacity: 0, duration: 0.6, ease: "power2.out" });
    });
    return () => ctx.revert();
  }, []);

  const renderBackgroundEffect = () => {
    // Show theme background image only on play screen - override all other effects
    if (isThemeActive && selectedTheme?.backgroundImage && activeTab === "play") {
      return (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${selectedTheme.backgroundImage})`,
          }}
        />
      );
    }

    // Regular background effects for other tabs or when no theme background
    switch (currentEffect) {
      case BACKGROUND_EFFECTS.GLUT:
        return <GlutEffect />;
      case BACKGROUND_EFFECTS.MATRIX_RAIN:
        return (
          <MatrixRainEffect
            speed={qualityParams.speed}
            opacity={qualityParams.opacity}
            forceEnable={false}
          />
        );
      case BACKGROUND_EFFECTS.ENCHANTMENT_PARTICLES:
        return (
          <EnchantmentParticlesEffect
            opacity={qualityParams.opacity}
            particleCount={qualityParams.particleCount}
            speed={qualityParams.speed}
            forceEnable={false}
          />
        );
      case BACKGROUND_EFFECTS.NEBULA_WAVES:
        return (
          <NebulaWaves
            opacity={qualityParams.opacity}
            speed={qualityParams.speed}
          />
        );
      case BACKGROUND_EFFECTS.NEBULA_PARTICLES:
        return (
          <NebulaParticles
            opacity={qualityParams.opacity}
            particleCount={qualityParams.particleCount}
            speed={qualityParams.speed}
          />
        );
      case BACKGROUND_EFFECTS.NEBULA_GRID:
        return (
          <NebulaGrid
            opacity={qualityParams.opacity}
            speed={qualityParams.speed}
            gridSize={30}
          />
        );
      case BACKGROUND_EFFECTS.NEBULA_VOXELS:
        return (
          <NebulaVoxels
            opacity={qualityParams.opacity}
            cubeCount={qualityParams.particleCount}
            speed={qualityParams.speed}
          />
        );
      case BACKGROUND_EFFECTS.NEBULA_LIGHTNING:
        return (
          <NebulaLightning
            opacity={qualityParams.opacity * 2}
            speed={qualityParams.speed}
            intensity={qualityParams.speed * 1.2}
            size={1.5}
          />
        );
      case BACKGROUND_EFFECTS.NEBULA_LIQUID_CHROME:
        return (
          <NebulaLiquidChrome
            opacity={qualityParams.opacity * 2}
            speed={qualityParams.speed * 0.2}
            amplitude={0.5}
            frequencyX={3}
            frequencyY={2}
          />
        );
      case BACKGROUND_EFFECTS.RETRO_GRID:
        const hexToRgbaWithLowOpacity = (hex: string) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, 0.05)`;
        };
        return (
          <div 
            className="absolute inset-0"
            style={{ backgroundColor: hexToRgbaWithLowOpacity(themeAccentColor.value) }}
          ></div>
        );
      case BACKGROUND_EFFECTS.PLAIN_BACKGROUND:
        return <PlainBackground accentColorValue={themeAccentColor.value} />;
      default:
        return (
          <div className="absolute inset-0 bg-red-500/20">
            Unknown effect: {currentEffect}
          </div>
        );
    }
  };

  return (
    <div
      ref={launcherRef}
      className="h-screen w-full overflow-hidden relative flex flex-col"
      style={{ backgroundColor: "rgb(var(--surface))" }}
    >
      {/* the background spans the whole window, the title bar floats on it */}
      <div className="absolute inset-0 pointer-events-none">
        <CustomMediaBackground activeTab={activeTab} />
        {shouldShowEffects && renderBackgroundEffect()}
        {shouldShowEffects && isSnowEnabled && <Snowfall />}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,rgba(10,10,14,0.55)_70%)]" />
      </div>

      <TopBar items={navItems} activeTab={activeTab} onNavChange={onNavChange} />

      <main className="relative z-10 flex-1 min-h-0 px-4 pb-4">
        {activeTab === "play" ? (
          <div className="h-full overflow-hidden">{children}</div>
        ) : (
          // every other page sits on one large glass sheet
          <div className="h-full overflow-hidden cc-glass" style={{ borderRadius: 28 }}>
            {children}
          </div>
        )}
      </main>

      {/* Global Modals Portal */}
      <ProfileWizardV2Modal />
      <ProfileSettingsModal />
      <SettingsModal />
      <ProfileDuplicateModal />
    </div>
  );
}
