/**
 * Fetch Song Pages manifests and import into SQLite.
 */
const logger = require('../logger');
const library = require('./library');

const CATALOG_FILENAME = 'songpages-catalog.json';
const ARTIST_FILENAME = 'songpages-artist.json';
const FETCH_TIMEOUT_MS = 30000;

function normalizeSiteUrl(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed) {
    throw new Error('Site URL is required.');
  }

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('Enter a valid URL (e.g. https://artist.example.com).');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Site URL must use http or https.');
  }

  const pathname = url.pathname.replace(/\/+$/, '') || '';
  return `${url.origin}${pathname}`;
}

function resolveSitePath(siteBase, relativePath) {
  const clean = String(relativePath || '').replace(/^\.\/+/, '').replace(/^\/+/, '');
  return `${siteBase}/${clean}`;
}

function withBuildVersion(url, buildVersion) {
  if (!buildVersion) {
    return url;
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${encodeURIComponent(buildVersion)}`;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${url}`);
    }

    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function validateCatalogManifest(data) {
  if (!data || data.schemaVersion !== 1) {
    throw new Error('Unsupported or missing catalog manifest (expected schemaVersion: 1).');
  }
  if (!Array.isArray(data.songs)) {
    throw new Error('Catalog manifest is missing songs array.');
  }
  if (!data.artistName && !data.artistSlug) {
    throw new Error('Catalog manifest is missing artist identity.');
  }
  return data;
}

function mapCatalogSongs(catalog, siteBase) {
  const buildVersion = catalog.buildVersion || null;

  return catalog.songs.map((song) => {
    if (!song.pageUrl || !song.playbackUrl) {
      throw new Error(`Song "${song.title || song.slug || song.id}" is missing page or playback URL.`);
    }

    return {
      externalId: song.id || song.slug,
      slug: song.slug,
      title: song.title || song.slug,
      album: song.album || '',
      year: song.year || '',
      caption: song.caption || '',
      coverUrl: song.coverUrl ? withBuildVersion(resolveSitePath(siteBase, song.coverUrl), buildVersion) : null,
      pageUrl: withBuildVersion(resolveSitePath(siteBase, song.pageUrl), buildVersion),
      playbackUrl: withBuildVersion(resolveSitePath(siteBase, song.playbackUrl), buildVersion),
      songManifestUrl: song.songManifestUrl
        ? withBuildVersion(resolveSitePath(siteBase, song.songManifestUrl), buildVersion)
        : null,
      playbackScope: song.playbackScope || 'full',
      playbackQuality: song.playbackQuality || 'standard',
      durationSeconds:
        typeof song.durationSeconds === 'number' && Number.isFinite(song.durationSeconds)
          ? Math.round(song.durationSeconds)
          : null,
    };
  });
}

async function fetchArtistManifest(siteRootNormalized, buildVersion, options = {}) {
  const { bustCache = false } = options;
  const cacheKey = bustCache ? `${buildVersion || '0'}-${Date.now()}` : buildVersion;
  const artistUrl = withBuildVersion(`${siteRootNormalized}/${ARTIST_FILENAME}`, cacheKey);

  try {
    const data = await fetchJson(artistUrl);
    if (data?.schemaVersion === 1) {
      return data;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.debug('Artist manifest not available', { artistUrl, error: message });
  }

  return null;
}

async function subscribeArtist(siteUrlInput, options = {}) {
  const { bustArtistManifestCache = false } = options;
  const siteRootNormalized = normalizeSiteUrl(siteUrlInput);
  const catalogUrl = `${siteRootNormalized}/${CATALOG_FILENAME}`;

  logger.info('Subscribing to artist', { siteUrl: siteRootNormalized, catalogUrl });

  let catalog;
  try {
    catalog = validateCatalogManifest(await fetchJson(catalogUrl));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not fetch catalog manifest: ${message}`);
  }

  const artistManifest = await fetchArtistManifest(
    siteRootNormalized,
    catalog.buildVersion,
    { bustCache: bustArtistManifestCache },
  );

  if (catalog.siteRoot && catalog.siteRoot !== siteRootNormalized) {
    logger.warn('Catalog siteRoot differs from subscription URL', {
      subscription: siteRootNormalized,
      manifestSiteRoot: catalog.siteRoot,
    });
  }

  const songs = mapCatalogSongs(catalog, siteRootNormalized);
  if (songs.length === 0) {
    throw new Error('Catalog manifest contains no songs.');
  }

  const artist = library.upsertArtistFromCatalog({
    siteUrl: siteRootNormalized,
    siteRootNormalized,
    catalog,
    artistManifest,
    songs,
    fetchedAt: new Date().toISOString(),
  });

  logger.info('Artist subscribed', { artistId: artist.id, songCount: songs.length });

  return {
    artist,
    songs: library.listSongsForArtist(artist.id),
    siteRootWarning:
      catalog.siteRoot && catalog.siteRoot !== siteRootNormalized
        ? `Manifest siteRoot (${catalog.siteRoot}) differs from subscription URL. Using subscription URL.`
        : null,
  };
}

async function refreshArtist(artistId) {
  const artist = library.getArtistById(artistId);
  if (!artist) {
    throw new Error('Artist not found.');
  }
  return subscribeArtist(artist.site_url, { bustArtistManifestCache: true });
}

async function refreshAllArtists() {
  const artists = library.listArtists();
  const results = [];

  for (const artist of artists) {
    try {
      const result = await refreshArtist(artist.id);
      results.push({ artistId: artist.id, ok: true, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Artist refresh failed', { artistId: artist.id, error: message });
      results.push({ artistId: artist.id, ok: false, error: message });
    }
  }

  return results;
}

/**
 * Fetch songpages-artist.json and merge identity fields into SQLite.
 * Always re-fetches so manual manifest edits show up without a full catalog recompile.
 */
async function ensureArtistManifest(artistId) {
  const artist = library.getArtistById(artistId);
  if (!artist) {
    throw new Error('Artist not found.');
  }

  const artistManifest = await fetchArtistManifest(artist.site_root_normalized, artist.build_version, {
    bustCache: true,
  });

  if (artistManifest) {
    return library.updateArtistFromManifest(artistId, artistManifest);
  }

  return artist;
}

module.exports = {
  normalizeSiteUrl,
  subscribeArtist,
  refreshArtist,
  refreshAllArtists,
  ensureArtistManifest,
};
