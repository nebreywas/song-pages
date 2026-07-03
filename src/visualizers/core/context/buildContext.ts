import type { SongRow } from '../../../types/app';
import type { VisualizerContext } from '../context/types';

/** Build the visualizer context contract from Song Pages playback state. */
export function buildVisualizerContext(song: SongRow | null | undefined): VisualizerContext {
  if (!song) {
    return { song: null };
  }

  return {
    song: {
      title: song.title,
      artist: song.artist_name ?? '',
      coverUrl: song.cover_url,
    },
    album: song.album ?? null,
    year: song.year ?? null,
  };
}
