import type { ProviderIntake, ProviderMetadataResult } from '../types.ts';
import {
  canonicalizeYoutubeInput,
  canonicalizeYoutubeProvider,
  validateYoutubeInput,
  type YoutubeCanonicalRef,
} from './canonicalize.ts';
import { YOUTUBE_PROVIDER_ID } from './constants.ts';
import {
  fallbackYoutubeMetadata,
  mergeOEmbedMetadata,
  type YoutubeOEmbedResponse,
  type YoutubeWorkMetadata,
} from './metadata.ts';

export type YoutubeMetadataFetcher = (
  ref: YoutubeCanonicalRef,
) => Promise<YoutubeOEmbedResponse | null>;

/**
 * YouTube provider intake — validate, canonicalize, and fetch intake-time metadata.
 * Playback itself is created separately in the renderer (IFrame player).
 */
export const youtubeProviderIntake: ProviderIntake<YoutubeCanonicalRef, YoutubeWorkMetadata> = {
  provider: YOUTUBE_PROVIDER_ID,
  validate: validateYoutubeInput,
  canonicalize: canonicalizeYoutubeProvider,
  extractMetadata: async (ref) => extractYoutubeMetadata(ref),
};

export async function extractYoutubeMetadata(
  ref: YoutubeCanonicalRef,
  fetchOEmbed?: YoutubeMetadataFetcher,
): Promise<ProviderMetadataResult<YoutubeWorkMetadata>> {
  if (!fetchOEmbed) {
    return { ok: true, metadata: fallbackYoutubeMetadata(ref) };
  }

  try {
    const oembed = await fetchOEmbed(ref);
    const metadata = mergeOEmbedMetadata(ref, oembed);
    if (!metadata.title || !metadata.channelName) {
      const fallback = fallbackYoutubeMetadata(ref);
      return {
        ok: true,
        metadata: {
          ...metadata,
          title: metadata.title ?? fallback.title,
          channelName: metadata.channelName ?? fallback.channelName,
          provenance: {
            ...metadata.provenance,
            title: metadata.title ? metadata.provenance.title : 'fallback',
            channelName: metadata.channelName ? metadata.provenance.channelName : 'fallback',
          },
        },
      };
    }
    return { ok: true, metadata };
  } catch {
    return { ok: true, metadata: fallbackYoutubeMetadata(ref) };
  }
}

export {
  canonicalizeYoutubeInput,
  canonicalizeYoutubeProvider,
  validateYoutubeInput,
  type YoutubeCanonicalRef,
  type YoutubeCanonicalizeResult,
  type YoutubeDiscardedContext,
};
