/** Shared manifest types — used by compiler and listener renderer. */

export const MANIFEST_SCHEMA_VERSION = 1;

export type SongPlaybackScope = 'full' | 'preview';
export type SongPlaybackQuality = 'standard' | 'high' | 'degraded';

export type ArtistSocialIds = {
  instagram: string;
  tiktok: string;
  youtube: string;
  spotify: string;
  soundcloud: string;
};

export type SongStreamLinks = {
  youtube: string;
  spotify: string;
  soundcloud: string;
};

export type SongPagesArtistManifest = {
  schemaVersion: typeof MANIFEST_SCHEMA_VERSION;
  siteRoot: string;
  artistSlug: string;
  artistName: string;
  bio: string;
  photoUrl: string | null;
  social: ArtistSocialIds;
  catalogUrl: string;
  buildVersion: string;
  generatedAt: string;
};

export type CatalogSongEntry = {
  id: string;
  slug: string;
  title: string;
  album: string;
  year: string;
  caption: string;
  coverUrl: string | null;
  pageUrl: string;
  playbackUrl: string;
  songManifestUrl: string;
  playbackScope: SongPlaybackScope;
  playbackQuality: SongPlaybackQuality;
  /** Whole-track seconds from source audio at compile time; omitted when unknown. */
  durationSeconds?: number | null;
};

export type SongPagesCatalogManifest = {
  schemaVersion: typeof MANIFEST_SCHEMA_VERSION;
  siteRoot: string;
  artistSlug: string;
  artistName: string;
  artistPhotoUrl: string | null;
  buildVersion: string;
  generatedAt: string;
  songs: CatalogSongEntry[];
};

export type SongPagesSongManifest = {
  schemaVersion: typeof MANIFEST_SCHEMA_VERSION;
  siteRoot: string;
  artistSlug: string;
  artistName: string;
  id: string;
  slug: string;
  title: string;
  album: string;
  year: string;
  caption: string;
  about: string;
  lyrics: string;
  coverUrl: string | null;
  extraImageUrl: string | null;
  pageUrl: string;
  playbackUrl: string;
  streamLinks: SongStreamLinks;
  playbackScope: SongPlaybackScope;
  playbackQuality: SongPlaybackQuality;
  buildVersion: string;
  durationSeconds?: number | null;
};

export const CATALOG_MANIFEST_FILENAME = 'songpages-catalog.json';
export const ARTIST_MANIFEST_FILENAME = 'songpages-artist.json';
export const SONG_MANIFEST_FILENAME = 'songpages-song.json';

/** Normalize user-entered subscription URL to a base without trailing slash. */
export function normalizeSiteUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Site URL is required.');
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('Enter a valid URL (e.g. https://artist.example.com).');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Site URL must use http or https.');
  }

  // Strip trailing slash from pathname unless root only.
  let pathname = url.pathname.replace(/\/+$/, '');
  if (!pathname) {
    pathname = '';
  }

  return `${url.origin}${pathname}`;
}

/** Join site base with a root-relative manifest path. */
export function resolveSitePath(siteBase: string, relativePath: string): string {
  const base = normalizeSiteUrl(siteBase);
  const clean = relativePath.replace(/^\.\/+/, '').replace(/^\/+/, '');
  return `${base}/${clean}`;
}

/** Append cache-bust query when buildVersion is present. */
export function withBuildVersion(url: string, buildVersion: string | null | undefined): string {
  if (!buildVersion) {
    return url;
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${encodeURIComponent(buildVersion)}`;
}
