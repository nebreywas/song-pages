/**
 * Artist 2.0 catalog service (main process).
 * Index columns in SQLite; evolving fields in payload_json.
 */

const crypto = require('crypto');
const { getDatabase } = require('../database');

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return crypto.randomUUID();
}

function parseJson(raw, fallback) {
  if (raw == null || raw === '') return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** Album + Playlist share ordered song memberships. */
function isSongContainerKind(kind) {
  return kind === 'album' || kind === 'playlist';
}

function mapArtist(row) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    payload: parseJson(row.payload_json, {}),
  };
}

function mapObject(row) {
  return {
    id: row.id,
    artistId: row.artist_id,
    kind: row.kind,
    contentType: row.content_type ?? null,
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
    payload: parseJson(row.payload_json, {}),
  };
}

function mapDeletionReport(row) {
  return {
    id: row.id,
    artistId: row.artist_id,
    deletedObjectId: row.deleted_object_id,
    deletedKind: row.deleted_kind,
    deletedName: row.deleted_name,
    deletedContentType: row.deleted_content_type ?? null,
    deletedAt: row.deleted_at,
    snapshot: parseJson(row.snapshot_json, {}),
    brokenRefs: parseJson(row.broken_refs_json, []),
    createdAt: row.created_at,
    clearedAt: row.cleared_at ?? null,
  };
}

function activeObjectClause(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return `${prefix}deleted_at IS NULL`;
}

function deletionSnapshot(obj) {
  const snapshot = {
    kind: obj.kind,
    contentType: obj.contentType,
    name: obj.name,
    status: obj.status,
  };
  if (obj.kind === 'content') {
    const payload = obj.payload || {};
    if (
      (obj.contentType === 'image' ||
        obj.contentType === 'video' ||
        obj.contentType === 'audio') &&
      payload.filePath
    ) {
      snapshot.filePath = payload.filePath;
    }
    if (obj.contentType === 'text' && typeof payload.body === 'string') {
      snapshot.bodyPreview = payload.body.slice(0, 240);
    }
  }
  return snapshot;
}

/** Objects referencing shared Content via artwork.contentRef. */
function findArtworkRefsToContent(contentId, artistId) {
  const rows = getDatabase()
    .prepare(
      `SELECT id, kind, name, payload_json
       FROM artist2_objects
       WHERE artist_id = ?
         AND kind IN ('song', 'album', 'playlist')
         AND ${activeObjectClause()}`,
    )
    .all(artistId);

  /** @type {Array<{ refKind: string, parentKind: string, parentId: string, parentName: string, field: string, detail?: string }>} */
  const refs = [];
  for (const row of rows) {
    const payload = parseJson(row.payload_json, {});
    const artwork = payload.artwork;
    if (artwork?.mode === 'contentRef' && artwork.contentId === contentId) {
      refs.push({
        refKind: 'artworkRef',
        parentKind: row.kind,
        parentId: row.id,
        parentName: row.name,
        field: 'artwork',
        detail: 'Cover artwork reference',
      });
      continue;
    }
    // Multi-image Song entries may also reference Content.
    const entries = Array.isArray(payload.artworkEntries) ? payload.artworkEntries : [];
    for (const entry of entries) {
      const source = entry?.source;
      if (source?.mode === 'contentRef' && source.contentId === contentId) {
        refs.push({
          refKind: 'artworkRef',
          parentKind: row.kind,
          parentId: row.id,
          parentName: row.name,
          field: 'artwork',
          detail: entry.role === 'primary_cover' ? 'Primary Cover reference' : 'Artwork reference',
        });
        break;
      }
    }
  }
  return refs;
}

/** Song-container memberships for a song (albums + playlists). */
function findSongContainerMemberships(songId) {
  const rows = getDatabase()
    .prepare(
      `SELECT m.id AS membership_id, m.position, c.id AS parent_id, c.name AS parent_name, c.kind AS parent_kind
       FROM artist2_memberships m
       INNER JOIN artist2_objects c ON c.id = m.container_id
       WHERE m.member_id = ?
         AND c.kind IN ('album', 'playlist')
         AND ${activeObjectClause('c')}`,
    )
    .all(songId);

  return rows.map((row) => ({
    refKind: 'containerMembership',
    parentKind: row.parent_kind,
    parentId: row.parent_id,
    parentName: row.parent_name,
    field: 'tracks',
    detail: `Track position ${row.position + 1}`,
    membershipId: row.membership_id,
  }));
}

/** Track list on a container when the container itself is deleted (informational for reports). */
function findContainerTrackMemberships(containerId, parentKind) {
  const rows = getDatabase()
    .prepare(
      `SELECT m.id AS membership_id, m.position, s.id AS song_id, s.name AS song_name
       FROM artist2_memberships m
       INNER JOIN artist2_objects s ON s.id = m.member_id
       WHERE m.container_id = ?
         AND s.kind = 'song'
         AND ${activeObjectClause('s')}`,
    )
    .all(containerId);

  return rows.map((row) => ({
    refKind: 'containerMembership',
    parentKind,
    parentId: containerId,
    parentName: '',
    field: 'tracks',
    detail: `Had track “${row.song_name}” at position ${row.position + 1}`,
    membershipId: row.membership_id,
    memberId: row.song_id,
    memberName: row.song_name,
  }));
}

function clearArtworkContentRef(objectId, contentId) {
  const obj = getObject(objectId);
  if (!obj) return null;
  const payload = { ...obj.payload };
  let changed = false;

  const artwork = payload.artwork;
  if (artwork?.mode === 'contentRef' && (!contentId || artwork.contentId === contentId)) {
    payload.artwork = { mode: 'inline', path: null };
    changed = true;
  }

  if (Array.isArray(payload.artworkEntries) && payload.artworkEntries.length > 0) {
    const nextEntries = payload.artworkEntries.map((entry) => {
      if (
        entry?.source?.mode === 'contentRef' &&
        (!contentId || entry.source.contentId === contentId)
      ) {
        changed = true;
        return { ...entry, source: { mode: 'inline', path: null } };
      }
      return entry;
    });
    if (changed) {
      payload.artworkEntries = nextEntries;
      try {
        require('tsx/cjs/api').register();
        const { legacyArtworkFromEntries } = require('../../shared/artist2/songArtwork.ts');
        payload.artwork = legacyArtworkFromEntries(nextEntries);
      } catch {
        const primary =
          nextEntries.find((e) => e.role === 'primary_cover') || nextEntries[0];
        payload.artwork = primary?.source || { mode: 'inline', path: null };
      }
    }
  }

  if (!changed) return obj;
  return updateObject(objectId, { payload });
}

function insertDeletionReport({
  artistId,
  deletedObject,
  brokenRefs,
  deletedAt,
}) {
  const db = getDatabase();
  const id = newId();
  const ts = nowIso();
  db.prepare(
    `INSERT INTO artist2_deletion_reports
      (id, artist_id, deleted_object_id, deleted_kind, deleted_name,
       deleted_content_type, deleted_at, snapshot_json, broken_refs_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    artistId,
    deletedObject.id,
    deletedObject.kind,
    deletedObject.name,
    deletedObject.contentType,
    deletedAt,
    JSON.stringify(deletionSnapshot(deletedObject)),
    JSON.stringify(brokenRefs),
    ts,
  );
  return id;
}

function getDeleteImpact(id) {
  const existing = getObject(id);
  if (!existing) {
    throw new Error('Object not found.');
  }
  if (existing.deletedAt) {
    throw new Error('Object is already deleted.');
  }

  /** @type {Array<ReturnType<typeof findArtworkRefsToContent>[number]>} */
  let brokenRefs = [];

  if (existing.kind === 'content') {
    brokenRefs = findArtworkRefsToContent(existing.id, existing.artistId);
  } else if (existing.kind === 'song') {
    brokenRefs = findSongContainerMemberships(existing.id);
  } else if (isSongContainerKind(existing.kind)) {
    const trackRefs = findContainerTrackMemberships(existing.id, existing.kind);
    brokenRefs = trackRefs.map((ref) => ({
      ...ref,
      parentName: existing.name,
      detail: ref.detail,
    }));
  }

  return {
    object: {
      id: existing.id,
      kind: existing.kind,
      name: existing.name,
      contentType: existing.contentType,
    },
    brokenRefs,
    willSoftDelete: existing.kind === 'song' || isSongContainerKind(existing.kind),
    willHardDelete: existing.kind === 'content',
  };
}

function mapMembership(row) {
  return {
    id: row.id,
    containerId: row.container_id,
    memberId: row.member_id,
    position: row.position,
    payload: parseJson(row.payload_json, {}),
  };
}

function listArtists() {
  const db = getDatabase();
  return db
    .prepare(
      `SELECT * FROM artist2_artists
       ORDER BY lower(name) ASC, created_at ASC`,
    )
    .all()
    .map(mapArtist);
}

function createArtist({ name }) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) {
    throw new Error('Artist name is required.');
  }
  const db = getDatabase();
  const id = newId();
  const ts = nowIso();
  db.prepare(
    `INSERT INTO artist2_artists (id, name, created_at, updated_at, payload_json)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, trimmed, ts, ts, '{}');
  return getArtist(id);
}

function getArtist(id) {
  const row = getDatabase().prepare('SELECT * FROM artist2_artists WHERE id = ?').get(id);
  return row ? mapArtist(row) : null;
}

function mergePayload(existing, patch) {
  if (!patch || typeof patch !== 'object') return existing;
  const next = { ...existing, ...patch };
  // Nested objects need shallow merge so partial editor patches don't wipe siblings.
  if (patch.links && typeof patch.links === 'object') {
    next.links = { ...(existing.links ?? {}), ...patch.links };
  }
  // Structured link table replaces flat links (cutover — no dual-write).
  if (Array.isArray(patch.linkEntries)) {
    next.linkEntries = patch.linkEntries;
    delete next.links;
  }
  if (patch.site && typeof patch.site === 'object') {
    next.site = { ...(existing.site ?? {}), ...patch.site };
  }
  // recordings[] is replaced wholesale from the editor. `published` is a free
  // per-recording flag; `primary` marks the single canonical cut for compile.
  if (Array.isArray(patch.recordings)) {
    next.recordings = patch.recordings;
    try {
      require('tsx/cjs/api').register();
      const { ensureSinglePrimary, legacyRecordingFromList } = require('../../shared/artist2/songRecordings.ts');
      next.recordings = ensureSinglePrimary(next.recordings);
      next.recording = legacyRecordingFromList(next.recordings);
    } catch {
      const primary =
        next.recordings.find((r) => r.primary) ||
        next.recordings.find((r) => r.published) ||
        next.recordings[0];
      next.recording = primary
        ? { audioPath: primary.audioPath ?? null, label: primary.label || 'Main Recording' }
        : { audioPath: null, label: 'Main Recording' };
    }
  } else if (patch.recording && typeof patch.recording === 'object') {
    // Legacy single-field patch — merge into the primary (or sole) recording.
    next.recording = { ...(existing.recording ?? {}), ...patch.recording };
    const list = Array.isArray(existing.recordings) ? [...existing.recordings] : [];
    if (list.length === 0) {
      next.recordings = [
        {
          id: `rec_${Date.now().toString(36)}`,
          audioPath: next.recording.audioPath ?? null,
          label: next.recording.label || 'Main Recording',
          published: true,
          primary: true,
        },
      ];
    } else {
      const primIdx = list.findIndex((r) => r.primary);
      const idx = primIdx >= 0 ? primIdx : 0;
      list[idx] = {
        ...list[idx],
        audioPath: next.recording.audioPath ?? list[idx].audioPath,
        label: next.recording.label || list[idx].label,
        published: true,
        primary: true,
      };
      next.recordings = list.map((r, i) => ({ ...r, primary: i === idx }));
    }
  }
  if (Array.isArray(patch.relatedSongs)) {
    next.relatedSongs = patch.relatedSongs;
  }
  if (Array.isArray(patch.creationProcesses)) {
    next.creationProcesses = patch.creationProcesses;
  }
  if (Array.isArray(patch.aiPrompts)) {
    next.aiPrompts = patch.aiPrompts;
  }
  // Multi-image artwork list — mirror primary into legacy artwork.
  if (Array.isArray(patch.artworkEntries)) {
    next.artworkEntries = patch.artworkEntries;
    try {
      require('tsx/cjs/api').register();
      const { legacyArtworkFromEntries } = require('../../shared/artist2/songArtwork.ts');
      next.artwork = legacyArtworkFromEntries(next.artworkEntries);
    } catch {
      const primary =
        next.artworkEntries.find((e) => e.role === 'primary_cover') || next.artworkEntries[0];
      next.artwork = primary?.source || { mode: 'inline', path: null };
    }
  } else if (patch.artwork && typeof patch.artwork === 'object') {
    next.artwork = patch.artwork;
    try {
      require('tsx/cjs/api').register();
      const { applyLegacyArtworkToEntries } = require('../../shared/artist2/songArtwork.ts');
      next.artworkEntries = applyLegacyArtworkToEntries(
        existing.artworkEntries,
        patch.artwork,
      );
    } catch {
      // Keep legacy artwork only when helpers unavailable.
    }
  }
  if (Array.isArray(patch.videoEntries)) {
    next.videoEntries = patch.videoEntries;
  }
  if (patch.suno && typeof patch.suno === 'object') {
    next.suno = { ...(existing.suno ?? {}), ...patch.suno };
  }
  return next;
}

function updateArtist(id, patch = {}) {
  const existing = getArtist(id);
  if (!existing) throw new Error('Artist not found.');
  const name =
    typeof patch.name === 'string' && patch.name.trim() ? patch.name.trim() : existing.name;
  const payload =
    patch.payload && typeof patch.payload === 'object'
      ? mergePayload(existing.payload, patch.payload)
      : existing.payload;
  const ts = nowIso();
  getDatabase()
    .prepare(
      `UPDATE artist2_artists
       SET name = ?, updated_at = ?, payload_json = ?
       WHERE id = ?`,
    )
    .run(name, ts, JSON.stringify(payload), id);
  return getArtist(id);
}

function listObjects(artistId, options = {}) {
  const db = getDatabase();
  const params = [artistId];
  let sql = `SELECT * FROM artist2_objects WHERE artist_id = ? AND ${activeObjectClause()}`;
  if (options.kind) {
    sql += ' AND kind = ?';
    params.push(options.kind);
  }
  if (options.search && String(options.search).trim()) {
    sql += ' AND lower(name) LIKE ?';
    params.push(`%${String(options.search).trim().toLowerCase()}%`);
  }
  sql += ' ORDER BY kind ASC, lower(name) ASC, created_at ASC';
  return db.prepare(sql).all(...params).map(mapObject);
}

function listDeletedObjects(artistId) {
  return getDatabase()
    .prepare(
      `SELECT * FROM artist2_objects
       WHERE artist_id = ?
         AND kind IN ('song', 'album', 'playlist')
         AND deleted_at IS NOT NULL
       ORDER BY deleted_at DESC, lower(name) ASC`,
    )
    .all(artistId)
    .map(mapObject);
}

function getObject(id, options = {}) {
  const row = getDatabase().prepare('SELECT * FROM artist2_objects WHERE id = ?').get(id);
  if (!row) return null;
  const obj = mapObject(row);
  if (!options.includeDeleted && obj.deletedAt) return null;
  return obj;
}

function defaultPayload(kind, contentType) {
  if (kind === 'song') {
    return {
      recordings: [
        {
          id: newId(),
          audioPath: null,
          label: 'Main',
          published: true,
          primary: true,
        },
      ],
      recording: { audioPath: null, label: 'Main Recording' },
      artwork: { mode: 'inline', path: null },
      artworkEntries: [],
      videoEntries: [],
      linkEntries: [
        {
          id: newId(),
          kind: 'song_pages',
          label: 'Song Pages',
          visibility: 'public',
          sortOrder: 0,
          songPagesState: 'not_published',
        },
      ],
      suno: null,
      tags: '',
      stylePrompt: '',
      bpm: null,
      isInstrumental: null,
    };
  }
  if (kind === 'album') {
    return {
      artwork: { mode: 'inline', path: null },
    };
  }
  if (kind === 'playlist') {
    return {
      description: '',
      curator: '',
      purpose: '',
      updateDate: '',
      artwork: { mode: 'inline', path: null },
    };
  }
  if (kind === 'content' && contentType === 'image') {
    return { filePath: null };
  }
  if (kind === 'content' && (contentType === 'video' || contentType === 'audio')) {
    // Library media assets — attach to Songs via videoEntries / recordings later.
    return { filePath: null, notes: '' };
  }
  if (kind === 'content' && contentType === 'text') {
    return { body: '', format: 'markdown', summary: '', notes: '' };
  }
  return {};
}

function createObject({ artistId, kind, contentType = null, name, payload }) {
  if (!artistId) throw new Error('artistId is required.');
  if (!getArtist(artistId)) throw new Error('Artist not found.');
  if (!['song', 'album', 'playlist', 'content'].includes(kind)) {
    throw new Error(`Unsupported kind: ${kind}`);
  }
  if (kind === 'content' && !['image', 'text', 'video', 'audio'].includes(contentType)) {
    throw new Error('Content requires contentType image, text, video, or audio.');
  }
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) throw new Error('Name is required.');

  const id = newId();
  const ts = nowIso();
  const body = {
    ...defaultPayload(kind, contentType),
    ...(payload && typeof payload === 'object' ? payload : {}),
  };

  // Song URL slug starts derived from the public label; manual edits lock it later.
  if (kind === 'song' && !body.slug) {
    const { slugifySongName } = require('../../shared/artist2/songSlug.ts');
    body.slug = slugifySongName(trimmed);
    body.slugManual = false;
  }

  getDatabase()
    .prepare(
      `INSERT INTO artist2_objects
        (id, artist_id, kind, content_type, name, status, created_at, updated_at, payload_json)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
    )
    .run(
      id,
      artistId,
      kind,
      kind === 'content' ? contentType : null,
      trimmed,
      ts,
      ts,
      JSON.stringify(body),
    );

  return getObject(id);
}

function updateObject(id, patch = {}) {
  const existing = getObject(id);
  if (!existing) throw new Error('Object not found.');

  const name =
    typeof patch.name === 'string' && patch.name.trim() ? patch.name.trim() : existing.name;
  const status =
    patch.status === 'draft' || patch.status === 'ready' ? patch.status : existing.status;
  const payload =
    patch.payload && typeof patch.payload === 'object'
      ? mergePayload(existing.payload, patch.payload)
      : existing.payload;
  const ts = nowIso();

  getDatabase()
    .prepare(
      `UPDATE artist2_objects
       SET name = ?, status = ?, updated_at = ?, payload_json = ?
       WHERE id = ?`,
    )
    .run(name, status, ts, JSON.stringify(payload), id);

  return getObject(id);
}

function deleteObject(id) {
  const existing = getObject(id, { includeDeleted: true });
  if (!existing) return { ok: true, deleted: false, reportId: null };
  if (existing.deletedAt) return { ok: true, deleted: false, reportId: null };

  const impact = getDeleteImpact(id);
  const brokenRefs = impact.brokenRefs;
  const ts = nowIso();
  const db = getDatabase();
  let reportId = null;

  const tx = db.transaction(() => {
    if (existing.kind === 'content') {
      for (const ref of brokenRefs) {
        clearArtworkContentRef(ref.parentId, existing.id);
      }
      db.prepare('DELETE FROM artist2_objects WHERE id = ?').run(id);
      if (brokenRefs.length > 0) {
        reportId = insertDeletionReport({
          artistId: existing.artistId,
          deletedObject: existing,
          brokenRefs,
          deletedAt: ts,
        });
      }
      return;
    }

    if (existing.kind === 'song') {
      db.prepare('DELETE FROM artist2_memberships WHERE member_id = ?').run(id);
      db.prepare(
        `UPDATE artist2_objects SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      ).run(ts, ts, id);
    } else if (isSongContainerKind(existing.kind)) {
      db.prepare('DELETE FROM artist2_memberships WHERE container_id = ?').run(id);
      db.prepare(
        `UPDATE artist2_objects SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      ).run(ts, ts, id);
    }

    if (brokenRefs.length > 0) {
      reportId = insertDeletionReport({
        artistId: existing.artistId,
        deletedObject: existing,
        brokenRefs,
        deletedAt: ts,
      });
    }
  });
  tx();

  return { ok: true, deleted: true, reportId };
}

function restoreObject(id) {
  const row = getDatabase().prepare('SELECT * FROM artist2_objects WHERE id = ?').get(id);
  if (!row) throw new Error('Object not found.');
  const obj = mapObject(row);
  if (!obj.deletedAt) throw new Error('Object is not deleted.');
  if (obj.kind !== 'song' && !isSongContainerKind(obj.kind)) {
    throw new Error('Only songs, albums, and playlists can be restored.');
  }

  const ts = nowIso();
  getDatabase()
    .prepare(
      `UPDATE artist2_objects SET deleted_at = NULL, updated_at = ? WHERE id = ?`,
    )
    .run(ts, id);

  return getObject(id, { includeDeleted: true });
}

function listDeletionReports(artistId, options = {}) {
  const params = [artistId];
  let sql = `SELECT * FROM artist2_deletion_reports WHERE artist_id = ?`;
  if (!options.includeCleared) {
    sql += ' AND cleared_at IS NULL';
  }
  sql += ' ORDER BY created_at DESC';
  return getDatabase().prepare(sql).all(...params).map(mapDeletionReport);
}

function clearDeletionReport(reportId) {
  const ts = nowIso();
  const result = getDatabase()
    .prepare(
      `UPDATE artist2_deletion_reports SET cleared_at = ? WHERE id = ? AND cleared_at IS NULL`,
    )
    .run(ts, reportId);
  return { ok: true, cleared: result.changes > 0 };
}

function clearAllDeletionReports(artistId) {
  const ts = nowIso();
  const result = getDatabase()
    .prepare(
      `UPDATE artist2_deletion_reports
       SET cleared_at = ?
       WHERE artist_id = ? AND cleared_at IS NULL`,
    )
    .run(ts, artistId);
  return { ok: true, clearedCount: result.changes };
}

/** All active album memberships for an artist (compile + album name resolution). */
function listMembershipsForArtist(artistId) {
  return getDatabase()
    .prepare(
      `SELECT m.*
       FROM artist2_memberships m
       INNER JOIN artist2_objects c ON c.id = m.container_id
       WHERE c.artist_id = ?
         AND c.deleted_at IS NULL`,
    )
    .all(artistId)
    .map(mapMembership);
}

function listMemberships(containerId) {
  return getDatabase()
    .prepare(
      `SELECT * FROM artist2_memberships
       WHERE container_id = ?
       ORDER BY position ASC, id ASC`,
    )
    .all(containerId)
    .map(mapMembership);
}

/** Lightweight track counts for soft incomplete badges in the catalog list. */
function listMembershipCounts(artistId) {
  const rows = getDatabase()
    .prepare(
      `SELECT m.container_id AS container_id, COUNT(*) AS track_count
       FROM artist2_memberships m
       INNER JOIN artist2_objects o ON o.id = m.container_id
       INNER JOIN artist2_objects s ON s.id = m.member_id
       WHERE o.artist_id = ? AND o.kind IN ('album', 'playlist')
         AND ${activeObjectClause('o')}
         AND ${activeObjectClause('s')}
       GROUP BY m.container_id`,
    )
    .all(artistId);
  /** @type {Record<string, number>} */
  const counts = {};
  for (const row of rows) {
    counts[row.container_id] = row.track_count;
  }
  return counts;
}

/** Container id → ordered track summaries for expandable sidebar discovery. */
function listAlbumTrackSummaries(artistId) {
  const rows = getDatabase()
    .prepare(
      `SELECT m.container_id AS container_id, s.id AS song_id, s.name AS song_name, m.position
       FROM artist2_memberships m
       INNER JOIN artist2_objects c ON c.id = m.container_id
       INNER JOIN artist2_objects s ON s.id = m.member_id
       WHERE c.artist_id = ? AND c.kind IN ('album', 'playlist') AND s.kind = 'song'
         AND ${activeObjectClause('c')}
         AND ${activeObjectClause('s')}
       ORDER BY m.container_id ASC, m.position ASC, m.id ASC`,
    )
    .all(artistId);
  /** @type {Record<string, Array<{ id: string, name: string }>>} */
  const summaries = {};
  for (const row of rows) {
    if (!summaries[row.container_id]) summaries[row.container_id] = [];
    summaries[row.container_id].push({ id: row.song_id, name: row.song_name });
  }
  return summaries;
}

function getAlbumDetail(albumId) {
  const album = getObject(albumId);
  if (!album || !isSongContainerKind(album.kind)) {
    throw new Error('Album or playlist not found.');
  }
  const memberships = listMemberships(albumId);
  const tracks = memberships
    .map((m) => getObject(m.memberId))
    .filter((obj) => obj && obj.kind === 'song');
  return { ...album, memberships, tracks };
}

function addMembership({ containerId, memberId }) {
  const container = getObject(containerId);
  const member = getObject(memberId);
  if (!container || !isSongContainerKind(container.kind)) {
    throw new Error('Container must be an album or playlist.');
  }
  if (!member || member.kind !== 'song') {
    throw new Error('Only songs can be added to an album or playlist.');
  }
  if (container.deletedAt || member.deletedAt) {
    throw new Error('Cannot add a deleted song or container to a track list.');
  }
  if (container.artistId !== member.artistId) {
    throw new Error('Song and container must belong to the same artist.');
  }

  const existing = getDatabase()
    .prepare(
      `SELECT id FROM artist2_memberships
       WHERE container_id = ? AND member_id = ?`,
    )
    .get(containerId, memberId);
  if (existing) {
    return getAlbumDetail(containerId);
  }

  const maxRow = getDatabase()
    .prepare(
      `SELECT COALESCE(MAX(position), -1) AS max_pos
       FROM artist2_memberships WHERE container_id = ?`,
    )
    .get(containerId);
  const position = (maxRow?.max_pos ?? -1) + 1;
  const id = newId();

  getDatabase()
    .prepare(
      `INSERT INTO artist2_memberships
        (id, container_id, member_id, position, payload_json)
       VALUES (?, ?, ?, ?, '{}')`,
    )
    .run(id, containerId, memberId, position);

  // Touch album updated_at so the catalog feels live.
  updateObject(containerId, {});
  return getAlbumDetail(containerId);
}

function removeMembership(membershipId) {
  const row = getDatabase()
    .prepare('SELECT * FROM artist2_memberships WHERE id = ?')
    .get(membershipId);
  if (!row) return null;
  getDatabase().prepare('DELETE FROM artist2_memberships WHERE id = ?').run(membershipId);
  reorderCompact(row.container_id);
  updateObject(row.container_id, {});
  return getAlbumDetail(row.container_id);
}

function reorderCompact(containerId) {
  const rows = listMemberships(containerId);
  const db = getDatabase();
  const stmt = db.prepare(
    `UPDATE artist2_memberships SET position = ? WHERE id = ?`,
  );
  const tx = db.transaction(() => {
    rows.forEach((row, index) => stmt.run(index, row.id));
  });
  tx();
}

function reorderMemberships(containerId, orderedMemberIds) {
  if (!Array.isArray(orderedMemberIds)) {
    throw new Error('orderedMemberIds must be an array.');
  }
  const current = listMemberships(containerId);
  const byMember = new Map(current.map((m) => [m.memberId, m]));
  const db = getDatabase();
  const stmt = db.prepare(
    `UPDATE artist2_memberships SET position = ? WHERE id = ?`,
  );
  const tx = db.transaction(() => {
    orderedMemberIds.forEach((memberId, index) => {
      const row = byMember.get(memberId);
      if (row) stmt.run(index, row.id);
    });
  });
  tx();
  updateObject(containerId, {});
  return getAlbumDetail(containerId);
}

/**
 * Promote an inline artwork field into standalone Content and replace with a reference.
 * Core Artist 2.0 workflow: create locally → promote when reusable.
 */
function promoteArtwork({ objectId, name }) {
  const obj = getObject(objectId);
  if (!obj) throw new Error('Object not found.');
  if (obj.kind !== 'song' && !isSongContainerKind(obj.kind)) {
    throw new Error('Only songs, albums, and playlists support artwork promotion.');
  }

  const payload = { ...obj.payload };
  let artwork = payload.artwork;
  let entriesForSong = null;
  let primaryEntryId = null;

  // Prefer Primary Cover from multi-image list when present.
  try {
    require('tsx/cjs/api').register();
    const { normalizeSongArtwork } = require('../../shared/artist2/songArtwork.ts');
    if (obj.kind === 'song') {
      entriesForSong = normalizeSongArtwork(payload);
      const primary = entriesForSong.find((e) => e.role === 'primary_cover') || entriesForSong[0];
      if (primary) {
        artwork = primary.source;
        primaryEntryId = primary.id;
      }
    }
  } catch {
    // Fall through to legacy artwork.
  }

  if (!artwork || artwork.mode !== 'inline' || !artwork.path) {
    throw new Error('Nothing to promote — attach an inline image first.');
  }

  const contentName =
    (typeof name === 'string' && name.trim()) || `${obj.name} Artwork`;

  const content = createObject({
    artistId: obj.artistId,
    kind: 'content',
    contentType: 'image',
    name: contentName,
    payload: {
      filePath: artwork.path,
      promotedFrom: { objectId: obj.id, field: 'artwork' },
    },
  });

  const contentRef = { mode: 'contentRef', contentId: content.id };
  if (obj.kind === 'song' && entriesForSong && primaryEntryId) {
    payload.artworkEntries = entriesForSong.map((entry) =>
      entry.id === primaryEntryId ? { ...entry, source: contentRef } : entry,
    );
    try {
      require('tsx/cjs/api').register();
      const { legacyArtworkFromEntries } = require('../../shared/artist2/songArtwork.ts');
      payload.artwork = legacyArtworkFromEntries(payload.artworkEntries);
    } catch {
      payload.artwork = contentRef;
    }
  } else {
    payload.artwork = contentRef;
  }

  const updated = updateObject(obj.id, { payload });

  return {
    object: updated,
    content,
  };
}

function loadSongRelationHelpers() {
  require('tsx/cjs/api').register();
  return require('../../shared/artist2/songRelations.ts');
}

/**
 * Link two Songs with a relationship (mirrored both ways).
 * Default relation is sister — mixes / adaptations stay separate Songs.
 */
function linkRelatedSongs({ fromSongId, toSongId, relation = 'sister', note = '' }) {
  const { normalizeSongRelations, upsertSongRelation } = loadSongRelationHelpers();
  const from = getObject(fromSongId);
  const to = getObject(toSongId);
  if (!from || from.kind !== 'song') throw new Error('Source Song not found.');
  if (!to || to.kind !== 'song') throw new Error('Target Song not found.');
  if (from.id === to.id) throw new Error('A Song cannot relate to itself.');
  if (from.artistId !== to.artistId) {
    throw new Error('Related Songs must belong to the same Artist.');
  }

  const relationKind = typeof relation === 'string' && relation.trim() ? relation.trim() : 'sister';
  const noteText = typeof note === 'string' ? note : '';

  const fromList = normalizeSongRelations(from.payload?.relatedSongs);
  const toList = normalizeSongRelations(to.payload?.relatedSongs);

  const updatedFrom = updateObject(from.id, {
    payload: {
      relatedSongs: upsertSongRelation(fromList, {
        songId: to.id,
        relation: relationKind,
        note: noteText || undefined,
      }),
    },
  });
  const updatedTo = updateObject(to.id, {
    payload: {
      relatedSongs: upsertSongRelation(toList, {
        songId: from.id,
        relation: relationKind,
        note: noteText || undefined,
      }),
    },
  });

  return { from: updatedFrom, to: updatedTo };
}

function unlinkRelatedSongs({ fromSongId, toSongId }) {
  const { normalizeSongRelations, removeSongRelation } = loadSongRelationHelpers();
  const from = getObject(fromSongId);
  const to = getObject(toSongId);
  if (!from || from.kind !== 'song') throw new Error('Source Song not found.');

  const updatedFrom = updateObject(from.id, {
    payload: {
      relatedSongs: removeSongRelation(
        normalizeSongRelations(from.payload?.relatedSongs),
        toSongId,
      ),
    },
  });

  let updatedTo = to;
  if (to && to.kind === 'song') {
    updatedTo = updateObject(to.id, {
      payload: {
        relatedSongs: removeSongRelation(
          normalizeSongRelations(to.payload?.relatedSongs),
          fromSongId,
        ),
      },
    });
  }

  return { from: updatedFrom, to: updatedTo };
}

function getDeletionReport(reportId) {
  const row = getDatabase()
    .prepare('SELECT * FROM artist2_deletion_reports WHERE id = ?')
    .get(reportId);
  return row ? mapDeletionReport(row) : null;
}

/**
 * Selective repair from a deletion report.
 * v1: re-add a restored Song into a container that lost the membership.
 */
function repairBrokenReference({ reportId, refIndex }) {
  const report = getDeletionReport(reportId);
  if (!report) throw new Error('Deletion report not found.');
  const ref = report.brokenRefs[refIndex];
  if (!ref) throw new Error('Reference index out of range.');

  if (ref.refKind === 'containerMembership') {
    if (report.deletedKind !== 'song') {
      throw new Error('Only Song→container memberships can be re-linked this way.');
    }
    const song = getObject(report.deletedObjectId);
    if (!song || song.kind !== 'song') {
      throw new Error('Restore the Song first, then re-link it to the container.');
    }
    if (song.deletedAt) {
      throw new Error('Restore the Song first, then re-link it to the container.');
    }
    const container = getObject(ref.parentId);
    if (!container || !isSongContainerKind(container.kind)) {
      throw new Error('Container no longer exists in the catalog.');
    }
    const detail = addMembership({
      containerId: container.id,
      memberId: song.id,
    });
    return { repaired: true, kind: 'containerMembership', detail };
  }

  if (ref.refKind === 'artworkRef') {
    throw new Error(
      'Artwork references cannot be auto-repaired after Content hard-delete. Re-attach a cover manually.',
    );
  }

  throw new Error(`Unsupported reference kind: ${ref.refKind}`);
}

module.exports = {
  listArtists,
  createArtist,
  getArtist,
  updateArtist,
  listObjects,
  listDeletedObjects,
  getObject,
  createObject,
  updateObject,
  getDeleteImpact,
  deleteObject,
  restoreObject,
  listDeletionReports,
  getDeletionReport,
  clearDeletionReport,
  clearAllDeletionReports,
  repairBrokenReference,
  listMemberships,
  listMembershipsForArtist,
  listMembershipCounts,
  listAlbumTrackSummaries,
  getAlbumDetail,
  addMembership,
  removeMembership,
  reorderMemberships,
  promoteArtwork,
  linkRelatedSongs,
  unlinkRelatedSongs,
};
