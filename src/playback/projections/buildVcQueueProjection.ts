import { pickNextPlayableSongId, pickUpcomingPlayableSongIds } from '@shared/playback/queue/planner';
import type { PlaybackSnapshot } from '@shared/playback';
import type { VcUpcomingSong } from '@shared/vcModeTypes';

import { resolveSongCoverUrl, normalizeSongRowAssets } from '@shared/listener/songResolution';

export type VcQueueSong = {
  id: number;
  title: string;
  artist_name?: string | null;
  duration_seconds?: number | null;
  skipped?: number | boolean | null;
  unavailable?: number | boolean | null;
};

export type VcQueueProjection = {
  nextSong: { title: string; artist: string } | null;
  upcoming: VcUpcomingSong[];
};

/** Next/upcoming overlays from session queue prefs + library order at read time. */
export function buildVcQueueProjection(input: {
  snapshot: Pick<PlaybackSnapshot, 'repeatMode' | 'shuffle'>;
  sortedSongs: VcQueueSong[];
  queueAnchorSongId: number | null;
  sessionSkippedIds?: ReadonlySet<number>;
  upcomingMax: number;
}): VcQueueProjection {
  const { snapshot, sortedSongs, queueAnchorSongId, sessionSkippedIds, upcomingMax } = input;
  if (queueAnchorSongId == null) {
    return { nextSong: null, upcoming: [] };
  }

  const queueOptions = {
    shuffle: snapshot.shuffle,
    repeatMode: snapshot.repeatMode,
    sessionSkippedIds,
  };

  const nextId = pickNextPlayableSongId(sortedSongs, queueAnchorSongId, queueOptions);
  const nextRow = nextId == null ? null : sortedSongs.find((song) => song.id === nextId);
  const nextSong = nextRow
    ? { title: nextRow.title, artist: nextRow.artist_name ?? '' }
    : null;

  const upcomingIds = pickUpcomingPlayableSongIds(
    sortedSongs,
    queueAnchorSongId,
    upcomingMax,
    queueOptions,
  );

  const upcoming = upcomingIds.flatMap((id) => {
    const song = sortedSongs.find((row) => row.id === id);
    if (!song) return [];
    return [
      {
        id: song.id,
        title: song.title,
        artist: song.artist_name ?? '',
        durationSeconds: song.duration_seconds,
        coverUrl: resolveSongCoverUrl(normalizeSongRowAssets(song)),
      },
    ];
  });

  return { nextSong, upcoming };
}
