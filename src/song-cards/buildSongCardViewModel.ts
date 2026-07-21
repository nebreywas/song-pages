/**
 * Build a SongCardViewModel from Song Editor context.
 * Isolates catalog/payload shape from the portrait card renderer.
 */

import { songCreationDate, type Artist2SongPayload } from '@shared/artist2';
import type { SongCardViewModel } from '@shared/songCards';

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Format catalog creationDate for card footers.
 * Accepts year (`2025`) or dd/mm/yyyy → "Apr 14, 2024" style when possible.
 */
export function formatCardCreationDate(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${MONTHS_SHORT[month - 1]} ${day}, ${year}`;
    }
  }

  if (/^\d{4}$/.test(value)) return value;
  return value;
}

export function buildSongCardViewModel(args: {
  title: string;
  artistName: string;
  payload: Artist2SongPayload;
  coverUrl: string | null;
  /** Optional album/playlist track index for footer preview. */
  trackNumber?: string | null;
  /** Placeholder length until recordings carry duration. */
  lengthLabel?: string | null;
  bitrateLabel?: string | null;
  albumName?: string | null;
}): SongCardViewModel {
  const { payload } = args;
  const genres = [
    payload.primaryGenre?.trim(),
    ...(payload.additionalGenres ?? []).map((g) => g.trim()),
  ].filter((g): g is string => Boolean(g));

  const themes = (payload.themes ?? []).map((t) => t.trim()).filter(Boolean);

  return {
    title: args.title.trim() || 'Untitled',
    artistName: args.artistName.trim() || 'Artist',
    subtitle: payload.subtitle?.trim() || undefined,
    caption: payload.caption?.trim() || undefined,
    lyricQuote: payload.lyricQuote?.trim() || undefined,
    genres,
    themes,
    explicit: payload.explicit === true,
    coverUrl: args.coverUrl,
    animatedCoverUrl: null,
    lengthLabel: args.lengthLabel ?? null,
    creationDate: formatCardCreationDate(songCreationDate(payload)),
    bitrateLabel: args.bitrateLabel ?? null,
    trackNumber: args.trackNumber ?? null,
    albumName: args.albumName ?? null,
  };
}
