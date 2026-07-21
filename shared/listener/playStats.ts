/**
 * Play-count estimates derived from song history (+ seek events).
 *
 * History rows are the durable listen log (they keep playlist snapshots even
 * after a playlist is deleted). Aggregates are computed on read so we can
 * change the display formula without rewriting stored counters.
 *
 * Provider-imported counters (e.g. Suno `sunoPlayCount` / `sunoLikeCount` on
 * clip metadata) are unrelated — never feed them into these aggregates.
 *
 * Estimated full plays (soft, not rights-accounting):
 *   Floor( starts − (interruptions − 0.5 × seekHitStarts) )
 * where seekHitStarts = number of starts that had ≥1 seekbar interaction.
 */

import type { SongHistoryEntry } from './songHistory';

/** How the UI should present play counts when we surface them. */
export type PlayCountDisplayMode = 'all-starts' | 'estimated-full';

export const PLAY_COUNT_DISPLAY_MODES: readonly PlayCountDisplayMode[] = [
  'all-starts',
  'estimated-full',
];

export function normalizePlayCountDisplayMode(raw: unknown): PlayCountDisplayMode {
  return PLAY_COUNT_DISPLAY_MODES.includes(raw as PlayCountDisplayMode)
    ? (raw as PlayCountDisplayMode)
    : 'all-starts';
}

export type SongHistorySeekDirection = 'forward' | 'back';

export type SongHistorySeekEvent = {
  id: number;
  historyEntryId: number;
  songId: number;
  playlistId: number | null;
  direction: SongHistorySeekDirection;
  fromSeconds: number;
  toSeconds: number;
  createdAt: string;
};

export type SongPlayStats = {
  songId: number;
  /** Every history start for this song (all playlists + direct play). */
  totalStarts: number;
  /** Starts that ended interrupted (next/play-now/etc.). */
  totalInterruptions: number;
  /** Starts that had at least one seek interaction. */
  seekHitStarts: number;
  /** Sum of recorded playbackSeconds across starts. */
  totalPlaybackSeconds: number;
  /**
   * Soft estimate of “full listens”:
   * Floor(starts − interruptions + 0.5×seekHitStarts)
   */
  estimatedFullPlays: number;
};

export type PlaylistSongPlayStats = SongPlayStats & {
  playlistId: number | null;
};

/** Floor(starts − (interruptions − 0.5×seekHits)) with a floor of 0. */
export function estimatedFullPlays(
  starts: number,
  interruptions: number,
  seekHitStarts: number,
): number {
  const raw = starts - (interruptions - 0.5 * seekHitStarts);
  return Math.max(0, Math.floor(raw));
}

export function displayPlayCount(
  stats: Pick<SongPlayStats, 'totalStarts' | 'estimatedFullPlays'>,
  mode: PlayCountDisplayMode,
): number {
  return mode === 'estimated-full' ? stats.estimatedFullPlays : stats.totalStarts;
}

/**
 * Aggregate total (cross-playlist) stats for each song.
 * `seekHitEntryIds` = history entry ids that recorded ≥1 seek.
 */
export function aggregateSongPlayStats(
  entries: readonly SongHistoryEntry[],
  seekHitEntryIds: ReadonlySet<number>,
): Map<number, SongPlayStats> {
  const bySong = new Map<number, SongPlayStats>();

  for (const entry of entries) {
    let row = bySong.get(entry.songId);
    if (!row) {
      row = {
        songId: entry.songId,
        totalStarts: 0,
        totalInterruptions: 0,
        seekHitStarts: 0,
        totalPlaybackSeconds: 0,
        estimatedFullPlays: 0,
      };
      bySong.set(entry.songId, row);
    }
    row.totalStarts += 1;
    if (entry.interrupted) row.totalInterruptions += 1;
    if (seekHitEntryIds.has(entry.id)) row.seekHitStarts += 1;
    row.totalPlaybackSeconds += Math.max(0, entry.playbackSeconds || 0);
  }

  for (const row of bySong.values()) {
    row.estimatedFullPlays = estimatedFullPlays(
      row.totalStarts,
      row.totalInterruptions,
      row.seekHitStarts,
    );
  }

  return bySong;
}

/**
 * Aggregate per song within a playlist snapshot id (null = Direct Play).
 * Totals cannot be recovered by summing these after a playlist is deleted —
 * use {@link aggregateSongPlayStats} for lifetime totals.
 */
export function aggregatePlaylistSongPlayStats(
  entries: readonly SongHistoryEntry[],
  seekHitEntryIds: ReadonlySet<number>,
): Map<string, PlaylistSongPlayStats> {
  const byKey = new Map<string, PlaylistSongPlayStats>();

  for (const entry of entries) {
    const key = `${entry.playlistId ?? 'direct'}:${entry.songId}`;
    let row = byKey.get(key);
    if (!row) {
      row = {
        songId: entry.songId,
        playlistId: entry.playlistId,
        totalStarts: 0,
        totalInterruptions: 0,
        seekHitStarts: 0,
        totalPlaybackSeconds: 0,
        estimatedFullPlays: 0,
      };
      byKey.set(key, row);
    }
    row.totalStarts += 1;
    if (entry.interrupted) row.totalInterruptions += 1;
    if (seekHitEntryIds.has(entry.id)) row.seekHitStarts += 1;
    row.totalPlaybackSeconds += Math.max(0, entry.playbackSeconds || 0);
  }

  for (const row of byKey.values()) {
    row.estimatedFullPlays = estimatedFullPlays(
      row.totalStarts,
      row.totalInterruptions,
      row.seekHitStarts,
    );
  }

  return byKey;
}

export function seekDirectionFromDelta(fromSeconds: number, toSeconds: number): SongHistorySeekDirection {
  return toSeconds >= fromSeconds ? 'forward' : 'back';
}
