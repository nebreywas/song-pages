import { withBuildVersion } from '@shared/manifests';
import type { ArtistRow, ArtistSocialIds } from '../types/app';

/** Resolve stored photo path to an absolute CDN URL with cache-bust. */
export function resolveArtistPhotoUrl(artist: ArtistRow): string | null {
  if (!artist.artist_photo_url) return null;
  const raw = artist.artist_photo_url.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) {
    return withBuildVersion(raw, artist.build_version);
  }
  const relative = raw.replace(/^\.\/+/, '').replace(/^\/+/, '');
  return withBuildVersion(`${artist.site_root_normalized}/${relative}`, artist.build_version);
}

export function parseArtistSocial(json: string | null): ArtistSocialIds | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as ArtistSocialIds;
  } catch {
    return null;
  }
}

const SOCIAL_LABELS: Record<keyof ArtistSocialIds, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  spotify: 'Spotify',
  soundcloud: 'SoundCloud',
};

export function formatArtistSongCount(count: number | null | undefined): string {
  const n = typeof count === 'number' && Number.isFinite(count) ? Math.max(0, count) : 0;
  return n === 1 ? '1 song' : `${n} songs`;
}

/** Two-letter monogram for collapsed sidebar avatars. */
export function artistInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  const word = parts[0] ?? '?';
  return word.slice(0, 2).toUpperCase();
}

export function listArtistSocialLinks(
  social: ArtistSocialIds | null,
): Array<{ platform: keyof ArtistSocialIds; label: string; url: string }> {
  if (!social) return [];
  return (Object.keys(SOCIAL_LABELS) as Array<keyof ArtistSocialIds>)
    .filter((key) => social[key]?.trim())
    .map((key) => ({
      platform: key,
      label: SOCIAL_LABELS[key],
      url: normalizeSocialHref(key, social[key]),
    }))
    .filter((link) => link.url);
}

/** Turn manifest social handles into clickable URLs for the listener profile panel. */
function normalizeSocialHref(platform: keyof ArtistSocialIds, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const handle = trimmed.replace(/^@/, '');
  switch (platform) {
    case 'instagram':
      return `https://instagram.com/${handle}`;
    case 'tiktok':
      return `https://tiktok.com/@${handle}`;
    case 'youtube':
      return `https://youtube.com/@${handle}`;
    case 'spotify':
      return trimmed.includes('spotify.com')
        ? trimmed.startsWith('http')
          ? trimmed
          : `https://${trimmed}`
        : `https://open.spotify.com/user/${handle}`;
    case 'soundcloud':
      return `https://soundcloud.com/${handle}`;
    default:
      return trimmed;
  }
}
