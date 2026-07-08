import { isSongSkipped } from './playlistKinds';

type QueueSong = { id: number; skipped?: number | boolean | null };

/** Songs that auto-advance and shuffle may select. */
export function playableQueueSongs<T extends QueueSong>(songs: T[]): T[] {
  return songs.filter((song) => !isSongSkipped(song));
}

export function pickNextPlayableSongId(
  sortedSongs: QueueSong[],
  currentSongId: number,
  options: { shuffle: boolean; repeatMode: 'off' | 'one' | 'all' },
): number | null {
  if (!sortedSongs.length) return null;

  const playable = playableQueueSongs(sortedSongs);
  if (!playable.length) return null;

  const currentIndex = sortedSongs.findIndex((song) => song.id === currentSongId);

  if (options.shuffle) {
    if (playable.length === 1) return playable[0]?.id ?? null;
    const candidates = playable.filter((song) => song.id !== currentSongId);
    const pool = candidates.length > 0 ? candidates : playable;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return pick?.id ?? null;
  }

  for (let index = currentIndex + 1; index < sortedSongs.length; index += 1) {
    const song = sortedSongs[index];
    if (song && !isSongSkipped(song)) return song.id;
  }

  if (options.repeatMode === 'all') {
    for (let index = 0; index <= currentIndex; index += 1) {
      const song = sortedSongs[index];
      if (song && !isSongSkipped(song)) return song.id;
    }
  }

  return null;
}

export function pickPreviousPlayableSongId(sortedSongs: QueueSong[], currentSongId: number): number | null {
  const currentIndex = sortedSongs.findIndex((song) => song.id === currentSongId);
  if (currentIndex < 0) return null;

  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    const song = sortedSongs[index];
    if (song && !isSongSkipped(song)) return song.id;
  }

  return null;
}

/** When playback is requested for a skipped row, advance to the next playable track. */
export function resolvePlayableSong<T extends QueueSong>(
  sortedSongs: T[],
  requestedSong: T,
): T | null {
  if (!isSongSkipped(requestedSong)) return requestedSong;

  const startIndex = sortedSongs.findIndex((song) => song.id === requestedSong.id);
  if (startIndex < 0) return null;

  for (let index = startIndex + 1; index < sortedSongs.length; index += 1) {
    const song = sortedSongs[index];
    if (song && !isSongSkipped(song)) return song;
  }

  for (let index = 0; index < startIndex; index += 1) {
    const song = sortedSongs[index];
    if (song && !isSongSkipped(song)) return song;
  }

  return null;
}
