import { isSongSkipped, isSongUnavailable } from './playlistKinds';

type QueueSong = { id: number; skipped?: number | boolean | null; unavailable?: number | boolean | null };

export type PlaybackQueueOptions = {
  shuffle: boolean;
  repeatMode: 'off' | 'one' | 'all';
  /** VC-session skips — excluded from playback but not written to the library DB. */
  sessionSkippedIds?: ReadonlySet<number>;
  /** Detour-consumed tracks — skip when advancing the primary playlist cursor. */
  skipSongIds?: ReadonlySet<number>;
};

function isEligibleForPlayback(
  song: QueueSong,
  options?: Pick<PlaybackQueueOptions, 'sessionSkippedIds' | 'skipSongIds'>,
): boolean {
  if (isSongUnavailable(song)) return false;
  if (isSongSkipped(song)) return false;
  if (options?.sessionSkippedIds?.has(song.id)) return false;
  if (options?.skipSongIds?.has(song.id)) return false;
  return true;
}

/** Songs that auto-advance and shuffle may select. */
export function playableQueueSongs<T extends QueueSong>(
  songs: T[],
  options?: Pick<PlaybackQueueOptions, 'sessionSkippedIds'>,
): T[] {
  return songs.filter((song) => isEligibleForPlayback(song, options));
}

export function pickNextPlayableSongId(
  sortedSongs: QueueSong[],
  currentSongId: number,
  options: PlaybackQueueOptions,
): number | null {
  if (!sortedSongs.length) return null;

  const playable = playableQueueSongs(sortedSongs, options);
  if (!playable.length) return null;

  const current = sortedSongs.find((song) => song.id === currentSongId);
  if (options.repeatMode === 'one') {
    return current && isEligibleForPlayback(current, options) ? currentSongId : null;
  }

  const currentIndex = sortedSongs.findIndex((song) => song.id === currentSongId);

  if (options.shuffle) {
    if (playable.length === 1) return playable[0]?.id ?? null;
    const candidates = playable.filter(
      (song) => song.id !== currentSongId && !options.skipSongIds?.has(song.id),
    );
    const pool = candidates.length > 0 ? candidates : playable.filter((song) => song.id !== currentSongId);
    const finalPool = pool.length > 0 ? pool : playable;
    const pick = finalPool[Math.floor(Math.random() * finalPool.length)];
    return pick?.id ?? null;
  }

  for (let index = currentIndex + 1; index < sortedSongs.length; index += 1) {
    const song = sortedSongs[index];
    if (song && isEligibleForPlayback(song, options)) return song.id;
  }

  if (options.repeatMode === 'all') {
    for (let index = 0; index <= currentIndex; index += 1) {
      const song = sortedSongs[index];
      if (song && isEligibleForPlayback(song, options)) return song.id;
    }
  }

  return null;
}

/**
 * Ordered upcoming song ids after the current track — respects repeat and skips.
 * Repeat one fills with the current song; repeat all wraps to the playlist start.
 */
export function pickUpcomingPlayableSongIds(
  sortedSongs: QueueSong[],
  currentSongId: number,
  maxCount: number,
  options: PlaybackQueueOptions,
): number[] {
  if (maxCount <= 0 || !sortedSongs.length) return [];

  const current = sortedSongs.find((song) => song.id === currentSongId);
  if (!current || !isEligibleForPlayback(current, options)) return [];

  if (options.repeatMode === 'one') {
    return Array.from({ length: maxCount }, () => currentSongId);
  }

  if (options.shuffle) {
    const result: number[] = [];
    const currentIndex = sortedSongs.findIndex((song) => song.id === currentSongId);
    for (let index = currentIndex + 1; index < sortedSongs.length && result.length < maxCount; index += 1) {
      const song = sortedSongs[index];
      if (song && isEligibleForPlayback(song, options)) result.push(song.id);
    }
    return result;
  }

  const result: number[] = [];
  let cursorId = currentSongId;
  while (result.length < maxCount) {
    const nextId = pickNextPlayableSongId(sortedSongs, cursorId, options);
    if (nextId == null) break;
    result.push(nextId);
    cursorId = nextId;
  }
  return result;
}

export function pickPreviousPlayableSongId(
  sortedSongs: QueueSong[],
  currentSongId: number,
  options?: Pick<PlaybackQueueOptions, 'sessionSkippedIds'>,
): number | null {
  const currentIndex = sortedSongs.findIndex((song) => song.id === currentSongId);
  if (currentIndex < 0) return null;

  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    const song = sortedSongs[index];
    if (song && isEligibleForPlayback(song, options)) return song.id;
  }

  return null;
}

/** When playback is requested for a skipped row, advance to the next playable track. */
export function resolvePlayableSong<T extends QueueSong>(
  sortedSongs: T[],
  requestedSong: T,
  options?: Pick<PlaybackQueueOptions, 'sessionSkippedIds'>,
): T | null {
  if (isEligibleForPlayback(requestedSong, options)) return requestedSong;

  const startIndex = sortedSongs.findIndex((song) => song.id === requestedSong.id);
  if (startIndex < 0) return null;

  for (let index = startIndex + 1; index < sortedSongs.length; index += 1) {
    const song = sortedSongs[index];
    if (song && isEligibleForPlayback(song, options)) return song;
  }

  for (let index = 0; index < startIndex; index += 1) {
    const song = sortedSongs[index];
    if (song && isEligibleForPlayback(song, options)) return song;
  }

  return null;
}
