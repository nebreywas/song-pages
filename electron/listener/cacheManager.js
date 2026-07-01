/**
 * Song cache manager — transparent local cache for song pages and HLS playback.
 *
 * All song asset access should go through resolveSongAccess() so future features
 * (offline mode, prefetch, pinning) can extend one subsystem.
 */
const { getDatabase, getSetting } = require('../database');
const logger = require('../logger');
const library = require('./library');
const { CACHE_MAX_ENTRIES_KEY, DEFAULT_MAX_CACHE_ENTRIES } = require('./cache/constants');
const {
  cacheAssetUrl,
  extensionFromUrl,
  resolveRemoteUrl,
} = require('./cache/urls');
const {
  createOpaqueCacheId,
  ensureCacheRoot,
  writeEntryFile,
  entryFileExists,
  measureEntryBytes,
  removeEntryDir,
  removeEntryDirSync,
} = require('./cache/storage');
const {
  fetchBuffer,
  extractHtmlAssetUrls,
  parseMediaPlaylist,
  rewriteHtmlForCache,
  rewritePlaylistForCache,
} = require('./cache/fetchAssets');
const { recordCacheEvent, getCacheEvents, clearCacheEvents } = require('./cache/cacheAnalytics');

/** @type {Map<number, Promise<void>>} */
const populateInflight = new Map();

function getMaxCacheEntries() {
  const configured = getSetting(CACHE_MAX_ENTRIES_KEY, DEFAULT_MAX_CACHE_ENTRIES);
  const parsed = Number.parseInt(String(configured), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_MAX_CACHE_ENTRIES;
  }
  return parsed;
}

function getCacheRowBySongId(songId) {
  return getDatabase()
    .prepare(
      `SELECT id, artist_id, song_id, manifest_revision, page_filename, playlist_filename,
              total_bytes, created_at, last_accessed_at
       FROM song_cache WHERE song_id = ?`,
    )
    .get(songId);
}

function getCacheRowById(cacheId) {
  return getDatabase()
    .prepare(
      `SELECT id, artist_id, song_id, manifest_revision, page_filename, playlist_filename,
              total_bytes, created_at, last_accessed_at
       FROM song_cache WHERE id = ?`,
    )
    .get(cacheId);
}

function touchCacheEntry(cacheId) {
  getDatabase()
    .prepare(`UPDATE song_cache SET last_accessed_at = datetime('now') WHERE id = ?`)
    .run(cacheId);
}

function getCacheStats() {
  const db = getDatabase();
  const summary = db
    .prepare(
      `SELECT COUNT(*) AS entry_count, COALESCE(SUM(total_bytes), 0) AS total_bytes
       FROM song_cache`,
    )
    .get();

  return {
    entryCount: summary?.entry_count ?? 0,
    totalBytes: summary?.total_bytes ?? 0,
    maxEntries: getMaxCacheEntries(),
  };
}

function songSummary(songId) {
  const song = library.getSongById(songId);
  if (!song) return { songId };
  return { songId, songTitle: song.title, artistId: song.artist_id };
}

async function deleteCacheEntry(cacheId, reason = 'unknown') {
  const row = getCacheRowById(cacheId);
  getDatabase().prepare('DELETE FROM song_cache WHERE id = ?').run(cacheId);
  await removeEntryDir(cacheId);
  if (row) {
    recordCacheEvent('cache_remove', {
      reason,
      cacheId,
      songId: row.song_id,
      artistId: row.artist_id,
      totalBytes: row.total_bytes,
    });
  }
}

async function evictLruEntries(maxEntries) {
  const rows = getDatabase()
    .prepare(
      `SELECT id FROM song_cache ORDER BY last_accessed_at ASC, created_at ASC`,
    )
    .all();

  const overflow = rows.length - maxEntries;
  if (overflow <= 0) return;

  for (let i = 0; i < overflow; i += 1) {
    const row = rows[i];
    if (!row) break;
    await deleteCacheEntry(row.id, 'lru');
  }
}

function isCacheRowValid(row, manifestRevision) {
  if (!row) return false;
  if (row.manifest_revision !== manifestRevision) return false;
  return true;
}

async function cacheFilesExist(row) {
  if (!(await entryFileExists(row.id, row.page_filename))) return false;
  if (row.playlist_filename && !(await entryFileExists(row.id, row.playlist_filename))) {
    return false;
  }
  return true;
}

function buildResolvedUrls(row) {
  return {
    pageUrl: cacheAssetUrl(row.id, row.page_filename),
    playbackUrl: row.playlist_filename ? cacheAssetUrl(row.id, row.playlist_filename) : null,
    fromCache: true,
  };
}

function uniqueFilename(baseName, usedNames) {
  if (!usedNames.has(baseName)) {
    usedNames.add(baseName);
    return baseName;
  }
  const dot = baseName.lastIndexOf('.');
  const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
  const ext = dot > 0 ? baseName.slice(dot) : '';
  let index = 2;
  while (usedNames.has(`${stem}-${index}${ext}`)) {
    index += 1;
  }
  const next = `${stem}-${index}${ext}`;
  usedNames.add(next);
  return next;
}

/**
 * Download page HTML, referenced static assets, song manifest, and HLS segments.
 * Stores everything under an opaque cache directory and registers metadata in SQLite.
 */
async function populateSongCache(songId) {
  const startedAt = Date.now();
  recordCacheEvent('populate_start', songSummary(songId));

  const song = library.getSongById(songId);
  if (!song) {
    throw new Error('Song not found.');
  }

  const artist = library.getArtistById(song.artist_id);
  if (!artist) {
    throw new Error('Artist not found.');
  }

  const manifestRevision = artist.build_version || 'unknown';
  const existing = getCacheRowBySongId(songId);
  if (existing && existing.manifest_revision === manifestRevision && (await cacheFilesExist(existing))) {
    touchCacheEntry(existing.id);
    recordCacheEvent('populate_skip', {
      ...songSummary(songId),
      cacheId: existing.id,
      manifestRevision,
    });
    return;
  }

  if (existing) {
    await deleteCacheEntry(existing.id, 'replace');
  }

  await ensureCacheRoot();

  const cacheId = createOpaqueCacheId();
  const remoteToLocal = new Map();
  const usedNames = new Set(['page.html', 'playlist.m3u8', 'manifest.json']);
  let assetIndex = 0;

  const assignLocalName = (remoteUrl, preferredBase) => {
    const ext = extensionFromUrl(remoteUrl, 'bin');
    const base = preferredBase || `asset-${String(assetIndex).padStart(3, '0')}.${ext}`;
    assetIndex += 1;
    const filename = uniqueFilename(base, usedNames);
    remoteToLocal.set(remoteUrl, filename);
    return filename;
  };

  const pageBuffer = await fetchBuffer(song.page_url);
  const pageHtml = pageBuffer.toString('utf8');
  const htmlAssetUrls = extractHtmlAssetUrls(pageHtml, song.page_url);

  for (const assetUrl of htmlAssetUrls) {
    const filename = assignLocalName(assetUrl);
    const data = await fetchBuffer(assetUrl);
    await writeEntryFile(cacheId, filename, data);
  }

  if (song.cover_url) {
    try {
      const coverUrl = resolveRemoteUrl(song.page_url, song.cover_url) || song.cover_url;
      if (!remoteToLocal.has(coverUrl)) {
        const filename = assignLocalName(coverUrl, `artwork.${extensionFromUrl(coverUrl, 'jpg')}`);
        await writeEntryFile(cacheId, filename, await fetchBuffer(coverUrl));
      }
    } catch (error) {
      logger.debug('Cache cover download skipped', { songId, error: String(error) });
    }
  }

  if (song.song_manifest_url) {
    try {
      const manifestBuffer = await fetchBuffer(song.song_manifest_url);
      await writeEntryFile(cacheId, 'manifest.json', manifestBuffer);
    } catch (error) {
      logger.debug('Cache song manifest skipped', { songId, error: String(error) });
    }
  }

  const playlistBuffer = await fetchBuffer(song.playback_url);
  const playlistText = playlistBuffer.toString('utf8');
  const segmentUrls = parseMediaPlaylist(playlistText, song.playback_url);

  let segmentNumber = 1;
  for (const segmentUrl of segmentUrls) {
    const filename = assignLocalName(segmentUrl, `seg${String(segmentNumber).padStart(3, '0')}.ts`);
    segmentNumber += 1;
    await writeEntryFile(cacheId, filename, await fetchBuffer(segmentUrl));
  }

  const rewrittenHtml = rewriteHtmlForCache(pageHtml, song.page_url, cacheId, remoteToLocal);
  await writeEntryFile(cacheId, 'page.html', Buffer.from(rewrittenHtml, 'utf8'));

  const rewrittenPlaylist = rewritePlaylistForCache(
    playlistText,
    song.playback_url,
    cacheId,
    remoteToLocal,
  );
  await writeEntryFile(cacheId, 'playlist.m3u8', Buffer.from(rewrittenPlaylist, 'utf8'));

  const totalBytes = await measureEntryBytes(cacheId);
  const db = getDatabase();

  db.prepare(
    `INSERT INTO song_cache (
       id, artist_id, song_id, manifest_revision, page_filename, playlist_filename, total_bytes
     ) VALUES (?, ?, ?, ?, 'page.html', 'playlist.m3u8', ?)`,
  ).run(cacheId, song.artist_id, song.id, manifestRevision, totalBytes);

  const insertAsset = db.prepare(
    `INSERT INTO song_cache_assets (cache_id, role, remote_url, local_filename, bytes)
     VALUES (?, ?, ?, ?, ?)`,
  );

  const insertAssets = db.transaction(() => {
    for (const [remoteUrl, localFilename] of remoteToLocal.entries()) {
      let role = 'asset';
      if (segmentUrls.includes(remoteUrl)) role = 'segment';
      else if (htmlAssetUrls.includes(remoteUrl)) role = 'static';
      else if (remoteUrl === song.cover_url) role = 'artwork';
      insertAsset.run(cacheId, role, remoteUrl, localFilename, 0);
    }
  });
  insertAssets();

  await evictLruEntries(getMaxCacheEntries());

  recordCacheEvent('populate_complete', {
    ...songSummary(songId),
    cacheId,
    manifestRevision,
    totalBytes,
    segmentCount: segmentUrls.length,
    durationMs: Date.now() - startedAt,
  });
  logger.info('Song cached', { songId, cacheId, totalBytes, segmentCount: segmentUrls.length });
}

function schedulePopulate(songId) {
  if (populateInflight.has(songId)) {
    return populateInflight.get(songId);
  }

  recordCacheEvent('populate_scheduled', songSummary(songId));

  const task = populateSongCache(songId)
    .catch((error) => {
      recordCacheEvent('populate_failed', {
        ...songSummary(songId),
        error: String(error),
      });
      logger.warn('Song cache populate failed', { songId, error: String(error) });
    })
    .finally(() => {
      populateInflight.delete(songId);
    });

  populateInflight.set(songId, task);
  return task;
}

/**
 * Resolve page + playback URLs for a song.
 * Returns cache URLs when valid; otherwise network URLs and populates cache in the background.
 */
async function resolveSongAccess(songId, source = 'unknown') {
  const song = library.getSongById(songId);
  if (!song) {
    return { ok: false, error: 'Song not found.' };
  }

  const artist = library.getArtistById(song.artist_id);
  const manifestRevision = artist?.build_version || 'unknown';
  const row = getCacheRowBySongId(songId);

  if (isCacheRowValid(row, manifestRevision) && (await cacheFilesExist(row))) {
    touchCacheEntry(row.id);
    recordCacheEvent('resolve_hit', {
      source,
      ...songSummary(songId),
      cacheId: row.id,
      manifestRevision,
    });
    const cached = buildResolvedUrls(row);
    return {
      ok: true,
      data: {
        pageUrl: cached.pageUrl,
        playbackUrl: cached.playbackUrl || song.playback_url,
        fromCache: true,
      },
    };
  }

  if (row) {
    recordCacheEvent('invalidate_stale', {
      source,
      ...songSummary(songId),
      cacheId: row.id,
      cachedRevision: row.manifest_revision,
      currentRevision: manifestRevision,
    });
    await deleteCacheEntry(row.id, 'stale');
  }

  recordCacheEvent('resolve_miss', {
    source,
    ...songSummary(songId),
    manifestRevision,
  });

  schedulePopulate(songId);

  return {
    ok: true,
    data: {
      pageUrl: song.page_url,
      playbackUrl: song.playback_url,
      fromCache: false,
    },
  };
}

function invalidateArtistSync(artistId) {
  const rows = getDatabase()
    .prepare(
      `SELECT id, song_id, total_bytes FROM song_cache WHERE artist_id = ?`,
    )
    .all(artistId);

  if (rows.length > 0) {
    recordCacheEvent('invalidate_artist', {
      artistId,
      entryCount: rows.length,
      totalBytes: rows.reduce((sum, row) => sum + (row.total_bytes || 0), 0),
    });
  }

  for (const row of rows) {
    getDatabase().prepare('DELETE FROM song_cache WHERE id = ?').run(row.id);
    removeEntryDirSync(row.id);
  }
}

async function invalidateArtist(artistId) {
  const rows = getDatabase()
    .prepare('SELECT id FROM song_cache WHERE artist_id = ?')
    .all(artistId);

  if (rows.length > 0) {
    recordCacheEvent('invalidate_artist', { artistId, entryCount: rows.length });
  }

  for (const row of rows) {
    await deleteCacheEntry(row.id, 'artist_refresh');
  }
}

/** Called after catalog refresh when buildVersion changes. */
async function invalidateArtistIfRevisionChanged(artistId, previousRevision, nextRevision) {
  if (!previousRevision || !nextRevision || previousRevision === nextRevision) {
    return false;
  }
  await invalidateArtist(artistId);
  return true;
}

module.exports = {
  getMaxCacheEntries,
  getCacheStats,
  getCacheEvents,
  clearCacheEvents,
  resolveSongAccess,
  populateSongCache,
  schedulePopulate,
  invalidateArtist,
  invalidateArtistSync,
  invalidateArtistIfRevisionChanged,
  touchCacheEntry,
  getCacheRowBySongId,
};
