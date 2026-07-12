import { SOUNDCLOUD_WIDGET_HOST } from './constants.ts';

export type SoundcloudOEmbedResponse = {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
  html?: string;
  height?: number;
};

/** oEmbed iframe src often URL-encodes slashes: api.soundcloud.com%2Ftracks%2F{id} */
const TRACK_API_RE = /api\.soundcloud\.com(?:\/|%2F)tracks(?:\/|%2F)(\d+)/i;
const PLAYLIST_API_RE = /api\.soundcloud\.com(?:\/|%2F)playlists(?:\/|%2F)/i;

/** Extract numeric track id from oEmbed iframe HTML — rejects playlists/sets. */
export function parseTrackIdFromOEmbedHtml(html: string): string | null {
  if (PLAYLIST_API_RE.test(html)) return null;
  const match = html.match(TRACK_API_RE);
  return match?.[1] ?? null;
}

export function isSoundcloudTrackOEmbed(html: string): boolean {
  return parseTrackIdFromOEmbedHtml(html) != null;
}

/** Compact widget iframe URL — `visual=true` fills the VC visualizer slot with SoundCloud's waveform UI. */
export function soundcloudWidgetUrl(
  permalink: string,
  options: { visual?: boolean } = {},
): string {
  const visual = options.visual === true;
  const params = new URLSearchParams({
    url: permalink,
    auto_play: 'false',
    show_artwork: visual ? 'true' : 'false',
    visual: visual ? 'true' : 'false',
    color: '#ff5500',
  });
  return `https://${SOUNDCLOUD_WIDGET_HOST}/player/?${params.toString()}`;
}

export function soundcloudOEmbedUrl(permalink: string): string {
  const params = new URLSearchParams({
    format: 'json',
    url: permalink,
    maxheight: '81',
  });
  return `https://soundcloud.com/oembed?${params.toString()}`;
}
