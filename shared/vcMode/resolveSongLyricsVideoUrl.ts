/**
 * Resolve the media URL for VC `lyrics-video` cells.
 * Suno lyric / "Made with Suno" MP4s live in provider metadata as `videoUrl` (`video_url`).
 */

import { resolveSongAssetUrl, type SongAssetSource } from '../listener/songResolution.ts';
import { parseSunoProviderMetadata } from '../providers/suno/clipMetadata.ts';

type LyricsVideoManifestSource = {
  providerMetadata?: Record<string, unknown> | null;
} | null;

type LyricsVideoSongSource = SongAssetSource & {
  provider_metadata_json?: string | null;
};

function sunoLyricsVideoFromMeta(raw: unknown): string | null {
  return parseSunoProviderMetadata(raw)?.videoUrl ?? null;
}

/** Prefer Suno `video_url` — never the short `video_cover_url` loop. */
export function resolveSongLyricsVideoUrl(
  song: LyricsVideoSongSource,
  manifest: LyricsVideoManifestSource,
): string | null {
  const fromManifestMeta = sunoLyricsVideoFromMeta(manifest?.providerMetadata ?? null);
  const fromSongMeta = sunoLyricsVideoFromMeta(song.provider_metadata_json ?? null);
  return resolveSongAssetUrl(song, fromManifestMeta ?? fromSongMeta);
}
