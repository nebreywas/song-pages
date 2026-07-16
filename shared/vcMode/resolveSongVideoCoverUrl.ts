/**
 * Resolve the media URL for VC `video-cover` cells.
 * Suno exposes two videos: lyric MP4 (`videoUrl`) vs short cover loop (`videoCoverUrl`).
 * VC Video Cover must use the cover loop only.
 */

import { resolveSongAssetUrl, type SongAssetSource } from '../listener/songResolution.ts';
import { parseSunoProviderMetadata } from '../providers/suno/clipMetadata.ts';

type VideoCoverManifestSource = {
  providerMetadata?: Record<string, unknown> | null;
  extraImageUrl?: string | null;
} | null;

type VideoCoverSongSource = SongAssetSource & {
  provider_metadata_json?: string | null;
};

function sunoVideoCoverFromMeta(raw: unknown): string | null {
  return parseSunoProviderMetadata(raw)?.videoCoverUrl ?? null;
}

/** Prefer Suno `video_cover_url`, then optional manifest extra — never the lyric `video_url`. */
export function resolveSongVideoCoverUrl(
  song: VideoCoverSongSource,
  manifest: VideoCoverManifestSource,
): string | null {
  const fromManifestMeta = sunoVideoCoverFromMeta(manifest?.providerMetadata ?? null);
  const fromSongMeta = sunoVideoCoverFromMeta(song.provider_metadata_json ?? null);
  const reference = fromManifestMeta ?? fromSongMeta ?? manifest?.extraImageUrl ?? null;
  return resolveSongAssetUrl(song, reference);
}
