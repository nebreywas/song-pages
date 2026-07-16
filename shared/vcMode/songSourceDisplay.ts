/**
 * VC Mode — Source / Song URL display helpers.
 * Keeps provider labeling and URL formatting free of React.
 */

import type { PlaylistSongSourceId } from '../listener/playlistSongSource';

/** How the Source cell shows provider identity. */
export type VcSourceDisplayMode = 'icon' | 'title' | 'both';

export const VC_SOURCE_DISPLAY_MODE_IDS = [
  'icon',
  'title',
  'both',
] as const satisfies readonly VcSourceDisplayMode[];

export const VC_SOURCE_DISPLAY_MODE_LABELS: Record<VcSourceDisplayMode, string> = {
  icon: 'Icon',
  title: 'Title',
  both: 'Both',
};

export const DEFAULT_VC_SOURCE_DISPLAY_MODE: VcSourceDisplayMode = 'both';

/**
 * Host-facing Source titles — Artist Page for Song Pages catalog rows
 * (matches “YouTube / Suno / Artist Page” mental model).
 */
export const VC_SOURCE_TITLE_LABELS: Record<PlaylistSongSourceId, string> = {
  'song-pages': 'Artist Page',
  suno: 'Suno',
  youtube: 'YouTube',
  flow: 'Flow Music',
  soundcloud: 'SoundCloud',
};

export type FormatVcSongUrlOptions = {
  /** Strip to host (+ optional scheme) only. */
  rootOnly: boolean;
  /** Keep or re-add https:// lead. Default display strips the scheme. */
  includeHttps: boolean;
};

/** Format a share/page URL for VC Song URL cells. */
export function formatVcSongUrlDisplay(rawUrl: string, options: FormatVcSongUrlOptions): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withScheme);

    if (options.rootOnly) {
      return options.includeHttps ? `https://${url.host}` : url.host;
    }

    const path = `${url.host}${url.pathname === '/' ? '' : url.pathname}${url.search}${url.hash}`;
    return options.includeHttps ? `https://${path}` : path;
  } catch {
    if (options.rootOnly) {
      const host = trimmed.replace(/^https?:\/\//i, '').split('/')[0] ?? trimmed;
      return options.includeHttps ? `https://${host}` : host;
    }
    const stripped = trimmed.replace(/^https?:\/\//i, '');
    return options.includeHttps ? `https://${stripped}` : stripped;
  }
}
