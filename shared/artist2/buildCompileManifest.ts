/**
 * Map Artist 2.0 catalog rows into the legacy compile manifest shape.
 * Reuses the existing static-site compiler without duplicating emit logic.
 */

import type {
  Artist2Artist,
  Artist2CatalogObject,
  Artist2Membership,
  Artist2SongPayload,
} from './types';
import { songYearForCompile } from './types';
import { publishedSongAudioPath } from './songRecordings';
import { compileStreamLinksFromPayload } from './songLinks';
import { resolvePrimaryArtworkPath } from './songArtwork';
import { resolveSongSlug } from './songSlug';

/** Matches compiler/artistPageCompileService CompileSongManifest (subset used at compile time). */
export type Artist2CompileSongEntry = {
  id: string;
  slug: string;
  title: string;
  album: string;
  year: string;
  caption: string;
  about: string;
  lyrics: string;
  links: { youtube: string; spotify: string; soundcloud: string };
  playback: { quality: 'standard' | 'high' | 'degraded'; scope: 'full' | 'preview'; previewSeconds: 30 | 45 | 60 };
  hasAudio: boolean;
  hasCover: boolean;
  hasExtraImage: boolean;
  audioLocalPath: string | null;
  coverLocalPath: string | null;
  extraImageLocalPath: string | null;
};

export type Artist2CompileManifest = {
  artistSlug: string;
  artistName: string;
  artistBio: string;
  deploySiteUrl: string;
  social: {
    instagram: string;
    tiktok: string;
    youtube: string;
    spotify: string;
    soundcloud: string;
  };
  songs: Artist2CompileSongEntry[];
  hasArtistPhoto: boolean;
  artistPhotoLocalPath: string | null;
};

export type Artist2CompileBuildResult = {
  manifest: Artist2CompileManifest;
  /** Songs skipped because they lack audio or are soft-deleted. */
  skippedSongs: Array<{ id: string; name: string; reason: string }>;
  warnings: string[];
};

function slugifySimple(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function hasPath(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

/** First album name per song from membership rows (stable: lexicographic album name). */
export function albumNameBySongId(
  memberships: Artist2Membership[],
  albumById: Map<string, Artist2CatalogObject>,
): Map<string, string> {
  const bySong = new Map<string, string>();
  const sorted = [...memberships].sort((a, b) => {
    const albumA = albumById.get(a.containerId)?.name ?? '';
    const albumB = albumById.get(b.containerId)?.name ?? '';
    const nameCmp = albumA.localeCompare(albumB, undefined, { sensitivity: 'base' });
    return nameCmp !== 0 ? nameCmp : a.position - b.position;
  });
  for (const row of sorted) {
    if (bySong.has(row.memberId)) continue;
    const album = albumById.get(row.containerId);
    if (album?.kind === 'album') {
      bySong.set(row.memberId, album.name);
    }
  }
  return bySong;
}

export function buildArtist2CompileManifest(input: {
  artist: Artist2Artist;
  songs: Artist2CatalogObject[];
  albums: Artist2CatalogObject[];
  content: Artist2CatalogObject[];
  memberships: Artist2Membership[];
}): Artist2CompileBuildResult {
  const warnings: string[] = [];
  const skippedSongs: Artist2CompileBuildResult['skippedSongs'] = [];

  const contentById = new Map(input.content.map((row) => [row.id, row]));
  const albumById = new Map(input.albums.map((row) => [row.id, row]));
  const albumForSong = albumNameBySongId(input.memberships, albumById);

  const payload = input.artist.payload ?? {};
  const links = payload.links ?? {};
  const artistSlug =
    (typeof payload.slug === 'string' && payload.slug.trim()) ||
    slugifySimple(input.artist.name) ||
    'artist';

  const deploySiteUrl =
    (typeof payload.deploySiteUrl === 'string' && payload.deploySiteUrl.trim()) ||
    (typeof links.website === 'string' && links.website.trim()) ||
    '';

  const compileSongs: Artist2CompileSongEntry[] = [];

  for (const song of input.songs) {
    if (song.kind !== 'song') continue;
    if (song.deletedAt) {
      skippedSongs.push({ id: song.id, name: song.name, reason: 'Soft-deleted' });
      continue;
    }

    const songPayload = song.payload as Artist2SongPayload;
    const audioPath = publishedSongAudioPath(songPayload);
    if (!hasPath(audioPath)) {
      skippedSongs.push({ id: song.id, name: song.name, reason: 'No audio' });
      continue;
    }

    const coverPath = resolvePrimaryArtworkPath(songPayload, contentById);
    compileSongs.push({
      id: song.id,
      slug: resolveSongSlug({ name: song.name, slug: songPayload.slug }) || song.id,
      title: song.name,
      album: albumForSong.get(song.id) ?? '',
      year: songYearForCompile(songPayload),
      // Slice A: caption / about are public; notes are private and never compiled.
      caption: songPayload.caption?.trim() || '',
      about: songPayload.about?.trim() || '',
      lyrics: songPayload.lyrics ?? '',
      links: compileStreamLinksFromPayload(songPayload),
      playback: { quality: 'standard', scope: 'full', previewSeconds: 60 },
      hasAudio: true,
      hasCover: hasPath(coverPath),
      hasExtraImage: false,
      audioLocalPath: audioPath,
      coverLocalPath: coverPath,
      extraImageLocalPath: null,
    });
    if (!hasPath(coverPath)) {
      warnings.push(`“${song.name}” has no cover artwork.`);
    }
  }

  if (compileSongs.length === 0) {
    warnings.push('No songs with audio are ready to compile.');
  }
  if (skippedSongs.length > 0) {
    warnings.push(
      `${skippedSongs.length} song(s) skipped (missing audio or deleted).`,
    );
  }
  if (!deploySiteUrl) {
    warnings.push('Deploy site URL is empty — set it on the Artist profile when you publish.');
  }

  return {
    manifest: {
      artistSlug,
      artistName: input.artist.name,
      artistBio: payload.bio ?? '',
      deploySiteUrl,
      social: {
        instagram: links.instagram ?? '',
        tiktok: links.tiktok ?? '',
        youtube: links.youtube ?? '',
        spotify: links.spotify ?? '',
        soundcloud: links.soundcloud ?? '',
      },
      songs: compileSongs,
      hasArtistPhoto: false,
      artistPhotoLocalPath: null,
    },
    skippedSongs,
    warnings,
  };
}
