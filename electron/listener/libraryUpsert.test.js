const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, afterEach } = require('node:test');

const database = require('../database');
const library = require('./library');

let tmpDir = null;

afterEach(() => {
  database.closeTestDatabase();
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  tmpDir = null;
});

function openTempLibraryDb() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'songpages-library-test-'));
  const dbPath = path.join(tmpDir, 'app.db');
  database.openTestDatabase(dbPath);
  return dbPath;
}

const sampleSong = {
  externalId: 'song-a',
  slug: 'song-a',
  title: 'Song A',
  album: '',
  year: '',
  caption: '',
  coverUrl: null,
  pageUrl: 'https://artist.example/songs/a.html',
  playbackUrl: 'https://artist.example/audio/a.m3u8',
  songManifestUrl: null,
  playbackScope: 'full',
  playbackQuality: 'standard',
  durationSeconds: 180,
};

test('upsertArtistFromCatalog refresh rolls back when a song insert fails', () => {
  openTempLibraryDb();

  library.upsertArtistFromCatalog({
    siteUrl: 'https://artist.example',
    siteRootNormalized: 'https://artist.example',
    catalog: { artistName: 'Artist', songs: [{ id: 'song-a' }] },
    artistManifest: null,
    songs: [sampleSong],
    fetchedAt: new Date().toISOString(),
  });

  const db = database.getDatabase();
  const artist = db.prepare('SELECT id FROM artists WHERE site_url = ?').get('https://artist.example');
  assert.ok(artist);

  const badSong = {
    ...sampleSong,
    externalId: 'song-b',
    slug: 'song-b',
    title: 'Song B',
    pageUrl: null,
    playbackUrl: 'https://artist.example/audio/b.m3u8',
  };

  assert.throws(() => {
    library.upsertArtistFromCatalog({
      siteUrl: 'https://artist.example',
      siteRootNormalized: 'https://artist.example',
      catalog: { artistName: 'Artist', songs: [{ id: 'song-a' }, { id: 'song-b' }] },
      artistManifest: null,
      songs: [sampleSong, badSong],
      fetchedAt: new Date().toISOString(),
    });
  });

  const afterCount = db.prepare('SELECT COUNT(*) AS n FROM songs WHERE artist_id = ?').get(artist.id).n;
  assert.equal(afterCount, 1, 'failed refresh must not leave catalog empty');

  const titles = db
    .prepare('SELECT title FROM songs WHERE artist_id = ? ORDER BY sort_order ASC')
    .all(artist.id)
    .map((row) => row.title);
  assert.deepEqual(titles, ['Song A']);
});

test('upsertArtistFromCatalog creates artist and songs atomically for new subscription', () => {
  openTempLibraryDb();

  const artist = library.upsertArtistFromCatalog({
    siteUrl: 'https://new.example',
    siteRootNormalized: 'https://new.example',
    catalog: { artistName: 'New Artist', songs: [{ id: 'song-a' }] },
    artistManifest: null,
    songs: [sampleSong],
    fetchedAt: new Date().toISOString(),
  });

  assert.equal(artist.artist_name, 'New Artist');
  const db = database.getDatabase();
  const songCount = db.prepare('SELECT COUNT(*) AS n FROM songs WHERE artist_id = ?').get(artist.id).n;
  assert.equal(songCount, 1);
});
