/**
 * Song Video / Animation — stub helpers only.
 * Full attachment / Content-ref / primary-video UX comes later; keep the payload
 * shape stable so the editor shell can reserve the section now.
 */

import type { Artist2VideoEntry, Artist2VideoKind } from './types';

export const ARTIST2_VIDEO_KINDS: Artist2VideoKind[] = [
  'music_video',
  'lyric_video',
  'visualizer',
  'live_performance',
  'animated_cover',
  'other',
];

export const ARTIST2_VIDEO_KIND_LABELS: Record<Artist2VideoKind, string> = {
  music_video: 'Music video',
  lyric_video: 'Lyric video',
  visualizer: 'Visualizer',
  live_performance: 'Live performance',
  animated_cover: 'Animated cover',
  other: 'Other',
};

export function newVideoEntryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `vid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Canonical list for the stub editor (empty until real attach UX ships). */
export function normalizeSongVideos(
  entries: Artist2VideoEntry[] | null | undefined,
): Artist2VideoEntry[] {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((row) => row && typeof row === 'object' && typeof row.id === 'string')
    .map((row, index) => ({
      ...row,
      sortOrder: Number.isFinite(row.sortOrder) ? Number(row.sortOrder) : index * 10,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}
