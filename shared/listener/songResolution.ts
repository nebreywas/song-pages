/** Resolve a song-page asset reference (often relative) against a base page URL. */
function resolveAssetUrl(
  baseUrl: string | null | undefined,
  reference: string | null | undefined,
): string | null {
  const trimmed = reference?.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('data:')) return null;
  if (/^(?:mailto:|tel:|javascript:)/i.test(trimmed)) return null;

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return trimmed;
  }

  if (!baseUrl?.trim()) return trimmed;

  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
}

export type SongAssetSource = {
  page_url: string;
  song_manifest_url?: string | null;
  cover_url?: string | null;
};

export type CanonicalSongRef = {
  id: number;
  library_song_id?: number | null;
};

/** Canonical library row for cache + manifest resolution (custom playlist snapshots). */
export function resolveCanonicalLibrarySongId(song: CanonicalSongRef): number | null {
  if (typeof song.library_song_id === 'number' && song.library_song_id > 0) {
    return song.library_song_id;
  }
  if (typeof song.id === 'number' && song.id > 0) {
    return song.id;
  }
  return null;
}

/**
 * Resolve cover/manifest asset paths.
 * Manifest-relative paths (e.g. cover.jpg) use song_manifest_url as base.
 */
export function resolveSongAssetUrl(
  song: SongAssetSource,
  reference: string | null | undefined,
): string | null {
  const trimmed = reference?.trim();
  if (!trimmed) return null;

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return resolveAssetUrl(song.page_url, trimmed);
  }

  const manifestBase = song.song_manifest_url ?? song.page_url;
  return resolveAssetUrl(manifestBase, trimmed) ?? resolveAssetUrl(song.page_url, trimmed);
}

/** Prefer stored cover URL, then manifest cover for VC / previews. */
export function resolveSongCoverUrl(
  song: SongAssetSource,
  manifestCoverUrl?: string | null,
): string | null {
  return resolveSongAssetUrl(song, song.cover_url ?? manifestCoverUrl ?? null);
}

export type NormalizableSongRow = SongAssetSource & {
  page_url: string;
  playback_url?: string;
  site_root_normalized?: string | null;
};

/** Absolutize snapshot URLs so renderer consumers can use cover/manifest paths safely. */
export function normalizeSongRowAssets<T extends NormalizableSongRow>(song: T): T {
  const siteRoot = song.site_root_normalized?.trim() || null;
  const absolutize = (reference: string | null | undefined, ...bases: (string | null | undefined)[]) => {
    const trimmed = reference?.trim();
    if (!trimmed) return null;
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
    for (const base of bases) {
      const resolved = resolveAssetUrl(base ?? null, trimmed);
      if (resolved) return resolved;
    }
    return trimmed;
  };

  const pageUrl = absolutize(song.page_url, siteRoot) ?? song.page_url;
  const songManifestUrl = song.song_manifest_url
    ? absolutize(song.song_manifest_url, siteRoot, pageUrl)
    : song.song_manifest_url;
  const assetSong: SongAssetSource = {
    page_url: pageUrl,
    song_manifest_url: songManifestUrl ?? null,
    cover_url: song.cover_url ?? null,
  };

  return {
    ...song,
    page_url: pageUrl,
    playback_url: song.playback_url
      ? absolutize(song.playback_url, siteRoot, pageUrl) ?? song.playback_url
      : song.playback_url,
    song_manifest_url: songManifestUrl ?? null,
    cover_url: song.cover_url ? resolveSongAssetUrl(assetSong, song.cover_url) : song.cover_url,
  };
}
