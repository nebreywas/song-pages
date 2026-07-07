import type { KudoAssetVariantMode } from '@shared/kudos';

import type { KudoAssetVariant } from '../catalog/kudoAssetCatalog.generated';
import { findKudoAsset } from '../catalog/kudoAssetCatalog.generated';

export type ResolvedBuiltinAsset = {
  url: string;
  variant: KudoAssetVariant;
};

function pickVariant(
  asset: NonNullable<ReturnType<typeof findKudoAsset>>,
  variantMode: KudoAssetVariantMode,
): KudoAssetVariant | null {
  const hasFlat = Boolean(asset.variants['single-color']);
  const hasShaded = Boolean(asset.variants.grays);
  if (variantMode === 'flat') return hasFlat ? 'single-color' : hasShaded ? 'grays' : null;
  if (variantMode === 'shaded') return hasShaded ? 'grays' : hasFlat ? 'single-color' : null;
  if (hasFlat && hasShaded) return Math.random() < 0.5 ? 'single-color' : 'grays';
  return hasFlat ? 'single-color' : hasShaded ? 'grays' : null;
}

/** Resolve built-in icon URL + variant for particle spawn. */
export function resolveBuiltinAsset(
  assetId: string,
  variantMode: KudoAssetVariantMode = 'mixed',
): ResolvedBuiltinAsset | null {
  const asset = findKudoAsset(assetId);
  if (!asset) return null;

  const variant = pickVariant(asset, variantMode);
  if (!variant) return null;

  const url = asset.variants[variant];
  if (!url) return null;

  return { url, variant };
}

export function resolveBuiltinAssetUrl(
  assetId: string,
  variantMode: KudoAssetVariantMode = 'mixed',
): string | null {
  return resolveBuiltinAsset(assetId, variantMode)?.url ?? null;
}

/** Map normalized size (0–1) to base pixel dimension. */
export function sizeToPixels(size: number): number {
  const clamped = Math.min(1, Math.max(0, size));
  return Math.round(20 + clamped * 44);
}

/** Map normalized speed (0–1) to velocity multiplier. */
export function speedToMultiplier(speed: number): number {
  const clamped = Math.min(1, Math.max(0, speed));
  return 0.55 + clamped * 1.1;
}
