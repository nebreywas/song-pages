/**
 * Artist 2.0 catalog — core reference + promote workflows.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { afterEach, test } = require('node:test');

const database = require('../database');
const catalog = require('./catalog');

let tmpDir = null;

afterEach(() => {
  database.closeTestDatabase();
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  tmpDir = null;
});

function openTempDb() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'artist2-'));
  const dbPath = path.join(tmpDir, 'test.db');
  database.openTestDatabase(dbPath);
}

test('artist2: creates artist, song, album membership by reference', () => {
  openTempDb();
  const artist = catalog.createArtist({ name: 'Test Artist' });
  const songA = catalog.createObject({
    artistId: artist.id,
    kind: 'song',
    name: 'Night Almighty',
  });
  const songB = catalog.createObject({
    artistId: artist.id,
    kind: 'song',
    name: 'Two-Step Trouble',
  });
  const album = catalog.createObject({
    artistId: artist.id,
    kind: 'album',
    name: 'Best Of (2025)',
  });

  const detail = catalog.addMembership({
    containerId: album.id,
    memberId: songA.id,
  });
  assert.deepEqual(
    detail.tracks.map((t) => t.id),
    [songA.id],
  );

  catalog.addMembership({ containerId: album.id, memberId: songB.id });
  const reordered = catalog.reorderMemberships(album.id, [songB.id, songA.id]);
  assert.deepEqual(
    reordered.tracks.map((t) => t.name),
    ['Two-Step Trouble', 'Night Almighty'],
  );

  // Removing membership does not delete the Song.
  catalog.removeMembership(reordered.memberships[0].id);
  assert.equal(catalog.getObject(songB.id)?.name, 'Two-Step Trouble');
  assert.equal(catalog.getAlbumDetail(album.id).tracks.length, 1);
});

test('artist2: promoteArtwork creates Content and replaces inline with reference', () => {
  openTempDb();
  const artist = catalog.createArtist({ name: 'Promo Artist' });
  const song = catalog.createObject({
    artistId: artist.id,
    kind: 'song',
    name: 'Cover Song',
    payload: {
      artwork: { mode: 'inline', path: '/tmp/cover.png' },
    },
  });

  const result = catalog.promoteArtwork({ objectId: song.id, name: 'Cover Art' });
  assert.equal(result.content.kind, 'content');
  assert.equal(result.content.contentType, 'image');
  assert.equal(result.content.payload.filePath, '/tmp/cover.png');
  assert.deepEqual(result.object.payload.artwork, {
    mode: 'contentRef',
    contentId: result.content.id,
  });

  const listed = catalog.listObjects(artist.id, { kind: 'content' });
  assert.equal(
    listed.some((row) => row.id === result.content.id),
    true,
  );
});

test('artist2: listAlbumTrackSummaries returns ordered nested tracks', () => {
  openTempDb();
  const artist = catalog.createArtist({ name: 'Nested Artist' });
  const songA = catalog.createObject({
    artistId: artist.id,
    kind: 'song',
    name: 'Track A',
  });
  const songB = catalog.createObject({
    artistId: artist.id,
    kind: 'song',
    name: 'Track B',
  });
  const album = catalog.createObject({
    artistId: artist.id,
    kind: 'album',
    name: 'Nested Album',
  });
  catalog.addMembership({ containerId: album.id, memberId: songA.id });
  catalog.addMembership({ containerId: album.id, memberId: songB.id });

  const summaries = catalog.listAlbumTrackSummaries(artist.id);
  assert.deepEqual(summaries[album.id], [
    { id: songA.id, name: 'Track A' },
    { id: songB.id, name: 'Track B' },
  ]);
});

test('artist2: delete content clears artwork refs and logs deletion report', () => {
  openTempDb();
  const artist = catalog.createArtist({ name: 'Cover Artist' });
  const cover = catalog.createObject({
    artistId: artist.id,
    kind: 'content',
    contentType: 'image',
    name: 'Shared Cover',
    payload: { filePath: '/tmp/shared-cover.png' },
  });
  const album = catalog.createObject({
    artistId: artist.id,
    kind: 'album',
    name: 'Western Skies',
    payload: { artwork: { mode: 'contentRef', contentId: cover.id } },
  });

  const impact = catalog.getDeleteImpact(cover.id);
  assert.equal(impact.brokenRefs.length, 1);
  assert.equal(impact.brokenRefs[0].parentName, 'Western Skies');

  const result = catalog.deleteObject(cover.id);
  assert.equal(result.deleted, true);
  assert.ok(result.reportId);

  const updatedAlbum = catalog.getObject(album.id);
  assert.deepEqual(updatedAlbum.payload.artwork, { mode: 'inline', path: null });
  assert.equal(catalog.getObject(cover.id), null);

  const reports = catalog.listDeletionReports(artist.id);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].deletedName, 'Shared Cover');
  assert.equal(reports[0].brokenRefs.length, 1);
});

test('artist2: soft delete song removes album memberships and restore does not relink', () => {
  openTempDb();
  const artist = catalog.createArtist({ name: 'Soft Delete Artist' });
  const song = catalog.createObject({
    artistId: artist.id,
    kind: 'song',
    name: 'Night Almighty',
  });
  const album = catalog.createObject({
    artistId: artist.id,
    kind: 'album',
    name: 'Best Of',
  });
  catalog.addMembership({ containerId: album.id, memberId: song.id });

  const result = catalog.deleteObject(song.id);
  assert.equal(result.deleted, true);
  assert.ok(result.reportId);

  assert.equal(catalog.getObject(song.id), null);
  assert.equal(catalog.getAlbumDetail(album.id).tracks.length, 0);

  const deleted = catalog.listDeletedObjects(artist.id);
  assert.equal(deleted.length, 1);
  assert.equal(deleted[0].name, 'Night Almighty');

  const restored = catalog.restoreObject(song.id);
  assert.equal(restored.name, 'Night Almighty');
  assert.equal(restored.deletedAt, null);
  assert.equal(catalog.listDeletedObjects(artist.id).length, 0);
  assert.equal(catalog.getAlbumDetail(album.id).tracks.length, 0);
});

test('artist2: clearDeletionReport hides report from active list', () => {
  openTempDb();
  const artist = catalog.createArtist({ name: 'Report Artist' });
  const cover = catalog.createObject({
    artistId: artist.id,
    kind: 'content',
    contentType: 'image',
    name: 'Cover',
    payload: { filePath: '/tmp/cover.png' },
  });
  catalog.createObject({
    artistId: artist.id,
    kind: 'album',
    name: 'Album One',
    payload: { artwork: { mode: 'contentRef', contentId: cover.id } },
  });

  const result = catalog.deleteObject(cover.id);
  assert.ok(result.reportId);

  assert.equal(catalog.listDeletionReports(artist.id).length, 1);
  catalog.clearDeletionReport(result.reportId);
  assert.equal(catalog.listDeletionReports(artist.id).length, 0);
  assert.equal(catalog.listDeletionReports(artist.id, { includeCleared: true }).length, 1);
});

test('artist2: playlist membership mirrors album track workflow', () => {
  openTempDb();
  const artist = catalog.createArtist({ name: 'Playlist Artist' });
  const song = catalog.createObject({
    artistId: artist.id,
    kind: 'song',
    name: 'After Light',
  });
  const playlist = catalog.createObject({
    artistId: artist.id,
    kind: 'playlist',
    name: 'Late Night',
  });

  const detail = catalog.addMembership({
    containerId: playlist.id,
    memberId: song.id,
  });
  assert.equal(detail.kind, 'playlist');
  assert.deepEqual(
    detail.tracks.map((t) => t.id),
    [song.id],
  );

  const summaries = catalog.listAlbumTrackSummaries(artist.id);
  assert.equal(summaries[playlist.id]?.[0]?.name, 'After Light');

  const impact = catalog.getDeleteImpact(song.id);
  assert.equal(impact.brokenRefs[0]?.parentKind, 'playlist');
  assert.equal(impact.brokenRefs[0]?.refKind, 'containerMembership');
});

test('artist2: sister song link is mirrored and repair re-adds container membership', () => {
  openTempDb();
  const artist = catalog.createArtist({ name: 'Relate Artist' });
  const songA = catalog.createObject({
    artistId: artist.id,
    kind: 'song',
    name: 'Midnight Crossing',
  });
  const songB = catalog.createObject({
    artistId: artist.id,
    kind: 'song',
    name: 'Midnight Crossing in Memphis',
  });
  const album = catalog.createObject({
    artistId: artist.id,
    kind: 'album',
    name: 'Western Skies',
  });
  catalog.addMembership({ containerId: album.id, memberId: songA.id });

  const linked = catalog.linkRelatedSongs({
    fromSongId: songA.id,
    toSongId: songB.id,
    relation: 'sister',
  });
  assert.equal(linked.from.payload.relatedSongs?.[0]?.songId, songB.id);
  assert.equal(linked.to.payload.relatedSongs?.[0]?.songId, songA.id);

  const deleted = catalog.deleteObject(songA.id);
  assert.ok(deleted.reportId);
  const restored = catalog.restoreObject(songA.id);
  assert.ok(restored);
  assert.equal(catalog.getAlbumDetail(album.id).tracks.length, 0);

  const report = catalog.getDeletionReport(deleted.reportId);
  assert.ok(report);
  const membershipRefIndex = report.brokenRefs.findIndex(
    (ref) => ref.refKind === 'containerMembership',
  );
  assert.ok(membershipRefIndex >= 0);
  catalog.repairBrokenReference({
    reportId: deleted.reportId,
    refIndex: membershipRefIndex,
  });
  assert.equal(catalog.getAlbumDetail(album.id).tracks.length, 1);
});
