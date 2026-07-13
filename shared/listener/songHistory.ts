export const SONG_HISTORY_MAX_ENTRIES = 1000;

export type SongHistoryPlaybackType = 'normal' | 'on-deck' | 'play-now';

export type SongHistoryEntry = {
  id: number;
  songId: number;
  songTitle: string;
  artistName: string | null;
  playlistId: number | null;
  playlistName: string | null;
  startedAt: string;
  completed: boolean;
  playbackSeconds: number;
  durationSeconds: number | null;
  interrupted: boolean;
  interruptedPrevious: boolean;
  playbackType: SongHistoryPlaybackType;
  vcMode: boolean;
  vcModeLabel: string | null;
};

export type SongHistoryStartInput = {
  songId: number;
  songTitle: string;
  artistName?: string | null;
  playlistId?: number | null;
  playlistName?: string | null;
  playbackType?: SongHistoryPlaybackType;
  interruptedPrevious?: boolean;
  vcMode?: boolean;
  vcModeLabel?: string | null;
  durationSeconds?: number | null;
};

export type SongHistoryUpdateInput = {
  completed?: boolean;
  playbackSeconds?: number;
  durationSeconds?: number | null;
  interrupted?: boolean;
};

const PLAYBACK_TYPES: SongHistoryPlaybackType[] = ['normal', 'on-deck', 'play-now'];

export function normalizeSongHistoryPlaybackType(value: unknown): SongHistoryPlaybackType {
  return PLAYBACK_TYPES.includes(value as SongHistoryPlaybackType)
    ? (value as SongHistoryPlaybackType)
    : 'normal';
}

export function normalizeSongHistoryEntry(raw: unknown): SongHistoryEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<SongHistoryEntry>;
  if (typeof row.id !== 'number' || typeof row.songId !== 'number') return null;
  if (typeof row.songTitle !== 'string' || typeof row.startedAt !== 'string') return null;

  return {
    id: row.id,
    songId: row.songId,
    songTitle: row.songTitle,
    artistName: typeof row.artistName === 'string' ? row.artistName : null,
    playlistId: typeof row.playlistId === 'number' ? row.playlistId : null,
    playlistName: typeof row.playlistName === 'string' ? row.playlistName : null,
    startedAt: row.startedAt,
    completed: row.completed === true || row.completed === 1,
    playbackSeconds:
      typeof row.playbackSeconds === 'number' && Number.isFinite(row.playbackSeconds)
        ? row.playbackSeconds
        : 0,
    durationSeconds:
      typeof row.durationSeconds === 'number' && Number.isFinite(row.durationSeconds)
        ? row.durationSeconds
        : null,
    interrupted: row.interrupted === true || row.interrupted === 1,
    interruptedPrevious: row.interruptedPrevious === true || row.interruptedPrevious === 1,
    playbackType: normalizeSongHistoryPlaybackType(row.playbackType),
    vcMode: row.vcMode === true || row.vcMode === 1,
    vcModeLabel: typeof row.vcModeLabel === 'string' ? row.vcModeLabel : null,
  };
}

export function formatHistorySongCell(entry: SongHistoryEntry): string {
  if (entry.completed) return entry.songTitle;
  if (!entry.interrupted || entry.playbackSeconds <= 0) return entry.songTitle;

  const duration = entry.durationSeconds;
  if (duration != null && duration > 0) {
    return `${entry.songTitle} (${formatHistoryClock(entry.playbackSeconds)} / ${formatHistoryClock(duration)})`;
  }
  return `${entry.songTitle} (${formatHistoryClock(entry.playbackSeconds)})`;
}

export function formatHistoryPlaybackCell(entry: SongHistoryEntry): string {
  if (entry.playbackType === 'on-deck') return 'Played On Deck';
  if (entry.playbackType === 'play-now' || entry.interruptedPrevious) {
    return 'Interrupted previous song';
  }
  if (entry.interrupted) return 'Interrupted by another song';
  if (entry.completed) return 'Completed';
  return '—';
}

export function formatHistoryPlaylistCell(entry: SongHistoryEntry): string {
  const name = entry.playlistName?.trim();
  if (!name) return 'Direct Play';
  return name;
}

export function formatHistoryVcCell(entry: SongHistoryEntry): string {
  if (!entry.vcMode) return '—';
  return entry.vcModeLabel?.trim() || 'Yes';
}

function formatHistoryClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export type SongHistorySessionGroup = {
  label: string;
  entries: SongHistoryEntry[];
};

/** Group newest-first history rows under Today / Yesterday / date headings. */
export function groupSongHistoryBySession(
  entries: readonly SongHistoryEntry[],
  now = new Date(),
): SongHistorySessionGroup[] {
  const groups: SongHistorySessionGroup[] = [];
  let currentLabel: string | null = null;
  let currentEntries: SongHistoryEntry[] = [];

  const flush = () => {
    if (!currentLabel || !currentEntries.length) return;
    groups.push({ label: currentLabel, entries: currentEntries });
    currentEntries = [];
  };

  for (const entry of entries) {
    const label = sessionLabelForDate(new Date(entry.startedAt), now);
    if (label !== currentLabel) {
      flush();
      currentLabel = label;
    }
    currentEntries.push(entry);
  }
  flush();
  return groups;
}

function sessionLabelForDate(date: Date, now: Date): string {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfEntry = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfEntry.getTime()) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function formatHistoryDateCell(startedAt: string): string {
  const date = new Date(startedAt);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatHistoryTimeCell(startedAt: string): string {
  const date = new Date(startedAt);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}
