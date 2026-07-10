import { normalizeSongRowAssets, resolveSongCoverUrl } from '@shared/listener/songResolution';

import type { SongRow } from '../../../types/app';
import type { VisualizerContext } from '../context/types';

/** Build the visualizer context contract from Song Pages playback state. */
export function buildVisualizerContext(song: SongRow | null | undefined): VisualizerContext {
  if (!song) {
    return { song: null };
  }

  const normalized = normalizeSongRowAssets(song);

  return {
    song: {
      title: normalized.title,
      artist: normalized.artist_name ?? '',
      coverUrl: resolveSongCoverUrl(normalized),
    },
    album: normalized.album ?? null,
    year: normalized.year ?? null,
  };
}
