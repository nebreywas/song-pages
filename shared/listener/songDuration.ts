type SongDurationInput = {
  id?: number;
  duration_seconds?: number | null;
};

/** Resolve a song length in seconds from persisted metadata or runtime probes. */
export function resolveSongDurationSeconds(
  song: SongDurationInput,
  runtimeDurations?: Record<number, number>,
): number | null {
  const seconds = song.duration_seconds ?? (song.id != null ? runtimeDurations?.[song.id] : undefined);
  return seconds != null && seconds > 0 ? seconds : null;
}

/** True when the song runs strictly longer than the given whole-minute threshold. */
export function isSongLongerThanMinutes(
  song: SongDurationInput,
  minutes: number,
  runtimeDurations?: Record<number, number>,
): boolean {
  const seconds = resolveSongDurationSeconds(song, runtimeDurations);
  if (seconds == null) return false;
  return seconds > minutes * 60;
}
