/**
 * Establish URL authority provenance from SQLite library state (subscribed catalogs).
 */
const listenerLibrary = require('./library');
const { parseHttpUrl } = require('../net/urlPolicy');

function normalizeComparableUrl(raw) {
  const parsed = parseHttpUrl(raw);
  if (!parsed) return null;
  parsed.hash = '';
  return parsed.href;
}

function urlUnderSiteRoot(targetUrl, siteRoot) {
  const target = parseHttpUrl(targetUrl);
  const base = parseHttpUrl(siteRoot);
  if (!target || !base) return false;
  if (target.origin !== base.origin) return false;

  const basePath = base.pathname.replace(/\/+$/, '') || '';
  const targetPath = target.pathname.replace(/\/+$/, '') || '';
  if (!basePath || basePath === '/') {
    return true;
  }
  return targetPath === basePath || targetPath.startsWith(`${basePath}/`);
}

function listSubscribedSiteRoots() {
  const artists = listenerLibrary.listArtists();
  const roots = new Set();
  for (const artist of artists) {
    if (artist.site_root_normalized) {
      roots.add(artist.site_root_normalized);
    }
    if (artist.site_url) {
      roots.add(artist.site_url);
    }
  }
  return [...roots];
}

function isUrlUnderSubscribedSite(url) {
  const normalized = normalizeComparableUrl(url);
  if (!normalized) return false;
  return listSubscribedSiteRoots().some((root) => urlUnderSiteRoot(normalized, root));
}

function findSongMatchingUrl(url) {
  const normalized = normalizeComparableUrl(url);
  if (!normalized) return null;

  const songs = listenerLibrary.listAllSongs();
  for (const song of songs) {
    const candidates = [song.page_url, song.playback_url, song.song_manifest_url].filter(Boolean);
    for (const candidate of candidates) {
      if (normalizeComparableUrl(candidate) === normalized) {
        return song;
      }
    }
  }
  return null;
}

/** Provenance for listener:fetchSongManifest */
function resolveManifestFetchProvenance(url) {
  if (findSongMatchingUrl(url)) {
    return 'catalog-context';
  }
  if (isUrlUnderSubscribedSite(url)) {
    return 'catalog-context';
  }
  return 'none';
}

/** Provenance for listener:probeSongAvailability — both URLs must share song or catalog context. */
function resolveProbeProvenance(pageUrl, playbackUrl) {
  const pageSong = findSongMatchingUrl(pageUrl);
  const playbackSong = findSongMatchingUrl(playbackUrl);

  if (pageSong && playbackSong && pageSong.id === playbackSong.id) {
    return 'song-context';
  }

  const pageUnderSite = isUrlUnderSubscribedSite(pageUrl);
  const playbackUnderSite = isUrlUnderSubscribedSite(playbackUrl);
  if (pageUnderSite && playbackUnderSite) {
    return 'catalog-context';
  }

  return 'none';
}

module.exports = {
  resolveManifestFetchProvenance,
  resolveProbeProvenance,
  isUrlUnderSubscribedSite,
  urlUnderSiteRoot,
};
