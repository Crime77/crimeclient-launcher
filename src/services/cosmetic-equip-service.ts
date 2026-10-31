import { invoke } from "@tauri-apps/api/core";

import {
  toRendererCosmetic,
  type ResolvedCosmetic,
  type ResolvedCosmeticDto,
} from "../lib/cosmetics/cosmeticRendererAssets";

export interface EquippedCosmetics {
  cosmetics: ResolvedCosmetic[];
  customCapeHash: string | null;
}

interface EquippedCosmeticsDto {
  cosmetics: ResolvedCosmeticDto[];
  customCapeHash: string | null;
}

function fromDto(dto: EquippedCosmeticsDto): EquippedCosmetics {
  const cosmetics = dto.cosmetics.map(toRendererCosmetic);
  const customCapeHash = dto.customCapeHash ?? null;

  return { cosmetics, customCapeHash };
}

export async function getEquippedCosmetics(
  playerIdentifier: string
): Promise<EquippedCosmetics> {
  const dto = await invoke<EquippedCosmeticsDto>("get_equipped_cosmetics", {
    playerIdentifier,
  });
  return fromDto(dto);
}

export async function getEquippedCosmeticsCached(
  playerIdentifier: string
): Promise<EquippedCosmetics | null> {
  const dto = await invoke<EquippedCosmeticsDto | null>("get_equipped_cosmetics_cached", {
    playerIdentifier,
  });
  return dto ? fromDto(dto) : null;
}
