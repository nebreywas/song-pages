/**
 * Build shared VC resolution context for live cells (dual-slot availability + render).
 */

import {
  SYSTEM_FALLBACK_ASSETS,
  type HostContentCatalog,
} from '@shared/hostContent';
import type { VcResolutionContext } from '@shared/vcMode/contentResolution';
import type { VcStatePayload } from '@shared/vcModeTypes';

import { systemFallbackUrl } from './systemFallbackUrls';

/** True only when Vite actually resolved a bundled system fallback asset URL. */
export function isSystemFallbackAssetAvailable(
  asset: keyof typeof SYSTEM_FALLBACK_ASSETS,
): boolean {
  return Boolean(systemFallbackUrl(asset));
}

export function buildLiveVcResolutionContext(
  state: VcStatePayload,
  catalog: HostContentCatalog,
): VcResolutionContext {
  return {
    song: state.currentSong,
    artistName: state.artistName,
    artistBio: state.artistBio,
    artistPhotoUrl: state.artistPhotoUrl,
    playback: state.playback,
    upcoming: state.upcoming,
    catalog,
    useFallbacks: state.config.useFallbacks !== false,
    suppressEmbedProviderLyricsMessages:
      state.config.suppressEmbedProviderLyricsMessages === true,
    lyricsSourceReady: state.lyricsSourceReady !== false,
    gridDesign: state.config.gridDesign,
    isSystemFallbackAssetAvailable,
  };
}
