/**
 * Super Shuffle — library-wide advance across sidebar playlists.
 *
 * "SUPER" modes apply an action to the whole library (or a defined subset),
 * not just the Artist/Playlist currently selected. Playlist inclusion filters
 * and Artists-only / Playlists-only scopes are deferred product work.
 *
 * ListenerMode snapshots the eligible pool when a Super Shuffle session starts;
 * library changes apply the next time Super Shuffle is turned on. Missing /
 * deleted picks are skipped at play time (force next).
 *
 * Uses the same pluggable shuffle strategies as playlist shuffle (`shuffle-bag`
 * by default) so library-wide surfing also avoids repeats until the pool is
 * exhausted.
 */

import {
  isSongSkipped,
  isSongUnavailable,
} from './playlistKinds';
import {
  ACTIVE_SHUFFLE_STRATEGY,
  commitShuffleBag,
  drawShuffledSongId,
  type ShuffleBagState,
  type ShuffleStrategyId,
} from '../playback/queue/shuffleStrategy';

export type SuperShuffleSong = {
  id: number;
  skipped?: number | boolean | null;
  unavailable?: number | boolean | null;
};

export type SuperShuffleEntry<T extends SuperShuffleSong = SuperShuffleSong> = {
  song: T;
  /** Sidebar playlist (artist / user playlist / Liked Songs) that supplied this row. */
  playlistId: number;
};

export const SUPER_SHUFFLE_SCOPE_KEY = 'super';

function isEligibleForSuperShuffle(
  song: SuperShuffleSong,
  excludeSongIds?: ReadonlySet<number>,
): boolean {
  if (isSongUnavailable(song)) return false;
  if (isSongSkipped(song)) return false;
  if (excludeSongIds?.has(song.id)) return false;
  return true;
}

/**
 * Merge songs from every active sidebar playlist into one pool.
 * First playlist wins when the same song id appears in Liked Songs and a catalog list.
 */
export function mergeSuperShufflePool<T extends SuperShuffleSong>(
  lists: ReadonlyArray<{ playlistId: number; songs: readonly T[] }>,
  options?: { excludeSongIds?: ReadonlySet<number> },
): SuperShuffleEntry<T>[] {
  const bySongId = new Map<number, SuperShuffleEntry<T>>();

  for (const { playlistId, songs } of lists) {
    for (const song of songs) {
      if (!isEligibleForSuperShuffle(song, options?.excludeSongIds)) continue;
      if (bySongId.has(song.id)) continue;
      bySongId.set(song.id, { song, playlistId });
    }
  }

  return [...bySongId.values()];
}

/**
 * Pick the next Super Shuffle entry via the active shuffle strategy.
 * Pass a persistent `shuffleBag` so `shuffle-bag` can avoid repeats.
 */
export function pickSuperShuffleEntry<T extends SuperShuffleSong>(
  pool: readonly SuperShuffleEntry<T>[],
  options: {
    currentSongId?: number | null;
    excludeSongIds?: ReadonlySet<number>;
    repeatMode?: 'off' | 'one' | 'all';
    shuffleStrategy?: ShuffleStrategyId;
    shuffleBag?: ShuffleBagState;
    random?: () => number;
  } = {},
): SuperShuffleEntry<T> | null {
  const eligible = pool.filter((entry) =>
    isEligibleForSuperShuffle(entry.song, options.excludeSongIds),
  );
  if (!eligible.length) return null;

  const byId = new Map(eligible.map((entry) => [entry.song.id, entry]));
  const playableIds = eligible.map((entry) => entry.song.id);
  const strategy = options.shuffleStrategy ?? ACTIVE_SHUFFLE_STRATEGY;
  const bag = options.shuffleBag ?? { scopeKey: '', remainingIds: [] as number[], exhausted: false };

  const drawn = drawShuffledSongId(strategy, playableIds, bag, {
    scopeKey: SUPER_SHUFFLE_SCOPE_KEY,
    currentSongId: options.currentSongId,
    excludeIds: options.excludeSongIds,
    // Super Shuffle keeps surfing the library; treat like repeat-all for refill.
    repeatMode: options.repeatMode ?? 'all',
    random: options.random,
  });

  if (options.shuffleBag) {
    commitShuffleBag(options.shuffleBag, drawn.bag);
  }

  if (drawn.songId == null) return null;
  return byId.get(drawn.songId) ?? null;
}
