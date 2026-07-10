/**
 * Generate Song Pages JSON manifests — compiler outputs, not canonical editor data.
 * @see documentation/manifest-schemas.md
 */
import type { StaticSiteBuildInfo } from './staticSiteBuild';
import type { CompileArtistManifest, CompileSongManifest } from './artistPageCompileService';
import {
  MANIFEST_SCHEMA_VERSION,
  type CatalogSongEntry,
  type SongPagesArtistManifest,
  type SongPagesCatalogManifest,
  type SongPagesSongManifest,
} from '../shared/manifests';
import { normalizePlaybackQuality } from './hlsExport';
import { slugifySiteText } from './staticSiteUtils';

function normalizeDeploySiteUrl(raw: string | undefined | null, fallback: string): string {
  const value = (raw || '').trim() || fallback;
  try {
    const url = new URL(value);
    const pathname = url.pathname.replace(/\/+$/, '') || '';
    return `${url.origin}${pathname}`;
  } catch {
    return fallback;
  }
}

export function buildArtistManifestJson(
  manifest: CompileArtistManifest,
  buildInfo: StaticSiteBuildInfo,
  siteRoot: string,
): SongPagesArtistManifest {
  const slug = slugifySiteText(manifest.artistSlug);
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    siteRoot,
    artistSlug: slug,
    artistName: manifest.artistName,
    bio: manifest.artistBio,
    photoUrl: manifest.hasArtistPhoto ? 'images/artist.jpg' : null,
    social: manifest.social,
    catalogUrl: 'songpages-catalog.json',
    buildVersion: buildInfo.buildVersion,
    generatedAt: buildInfo.generatedAt,
  };
}

export function buildCatalogManifestJson(
  manifest: CompileArtistManifest,
  activeSongs: CompileSongManifest[],
  buildInfo: StaticSiteBuildInfo,
  siteRoot: string,
  durationBySongId?: Map<string, number | null>,
): SongPagesCatalogManifest {
  const slug = slugifySiteText(manifest.artistSlug);

  const songs: CatalogSongEntry[] = activeSongs.map((song) => {
    const songSlug = slugifySiteText(song.slug || song.title);
    const durationSeconds = durationBySongId?.get(song.id) ?? null;
    return {
      id: song.id,
      slug: songSlug,
      title: song.title,
      album: song.album,
      year: song.year,
      caption: song.caption,
      coverUrl: song.hasCover ? `songs/${songSlug}/cover.jpg` : null,
      pageUrl: `songs/${songSlug}.html`,
      playbackUrl: `songs/${songSlug}/manifest.m3u8`,
      songManifestUrl: `songs/${songSlug}/songpages-song.json`,
      playbackScope: song.playback.scope,
      playbackQuality: normalizePlaybackQuality(song.playback.quality),
      ...(durationSeconds != null ? { durationSeconds } : {}),
    };
  });

  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    siteRoot,
    artistSlug: slug,
    artistName: manifest.artistName,
    artistPhotoUrl: manifest.hasArtistPhoto ? 'images/artist.jpg' : null,
    buildVersion: buildInfo.buildVersion,
    generatedAt: buildInfo.generatedAt,
    songs,
  };
}

export function buildSongManifestJson(
  manifest: CompileArtistManifest,
  song: CompileSongManifest,
  buildInfo: StaticSiteBuildInfo,
  siteRoot: string,
  hasCover: boolean,
  hasExtra: boolean,
  durationSeconds?: number | null,
): SongPagesSongManifest {
  const slug = slugifySiteText(song.slug || song.title);
  const artistSlug = slugifySiteText(manifest.artistSlug);

  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    siteRoot,
    artistSlug,
    artistName: manifest.artistName,
    id: song.id,
    slug,
    title: song.title,
    album: song.album,
    year: song.year,
    caption: song.caption,
    about: song.about,
    lyrics: song.lyrics,
    coverUrl: hasCover ? 'cover.jpg' : null,
    extraImageUrl: hasExtra ? 'extra.jpg' : null,
    pageUrl: `../${slug}.html`,
    playbackUrl: 'manifest.m3u8',
    streamLinks: song.links,
    playbackScope: song.playback.scope,
    playbackQuality: normalizePlaybackQuality(song.playback.quality),
    buildVersion: buildInfo.buildVersion,
    ...(durationSeconds != null ? { durationSeconds } : {}),
  };
}

export function resolveSiteRootForCompile(
  manifest: CompileArtistManifest,
  outputRoot: string,
): string {
  // When deploy URL is unknown, use a placeholder derived from slug — listener prefers subscription URL.
  const fallback = `https://songpages.local/${slugifySiteText(manifest.artistSlug)}`;
  return normalizeDeploySiteUrl(manifest.deploySiteUrl, fallback);
}
