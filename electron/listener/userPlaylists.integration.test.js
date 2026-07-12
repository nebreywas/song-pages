const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, afterEach } = require('node:test');

const database = require('../database');
const library = require('./library');
const userPlaylists = require('./userPlaylists');
const playlistOrder = require('./playlistOrder');
const {
  resolveLibrarySongIdForAccess,
  clearStalePlaylistLibrarySongId,
  isUserPlaylistSongId,
} = require('./librarySongLookup');

let tmpDir = null;

afterEach(() => {
  database.closeTestDatabase();
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  tmpDir = null;
});

function openTempDb() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'songpages-playlist-test-'));
  const dbPath = path.join(tmpDir, 'app.db');
  database.openTestDatabase(dbPath);
  return database.getDatabase();
}

const catalogSong = {
  externalId: 'song-a',
  slug: 'song-a',
  title: 'Catalog Song',
  album: '',
  year: '',
  caption: '',
  coverUrl: 'https://artist.example/cover.jpg',
  pageUrl: 'https://artist.example/songs/a.html',
  playbackUrl: 'https://artist.example/audio/a.m3u8',
  songManifestUrl: 'https://artist.example/songs/a.json',
  playbackScope: 'full',
  playbackQuality: 'standard',
  durationSeconds: 180,
};

function seedCatalogArtist() {
  return library.upsertArtistFromCatalog({
    siteUrl: 'https://artist.example',
    siteRootNormalized: 'https://artist.example',
    catalog: { artistName: 'Artist', songs: [{ id: 'song-a' }] },
    artistManifest: null,
    songs: [catalogSong],
    fetchedAt: new Date().toISOString(),
  });
}

test('moveSongToUserPlaylist aborts on destination duplicate and keeps source row', () => {
  openTempDb();
  const artist = seedCatalogArtist();
  const librarySong = library.listSongsForArtist(artist.id)[0];

  const source = userPlaylists.createUserPlaylist('Source');
  const dest = userPlaylists.createUserPlaylist('Dest');

  userPlaylists.addSongToUserPlaylist(source.data.id, librarySong);
  userPlaylists.addSongToUserPlaylist(dest.data.id, librarySong);

  const sourceRows = userPlaylists.listUserPlaylistSongs(source.data.id);
  assert.equal(sourceRows.length, 1);

  const move = userPlaylists.moveSongToUserPlaylist({
    sourceArtistId: userPlaylists.userPlaylistArtistId(source.data.id),
    destPlaylistId: dest.data.id,
    song: sourceRows[0],
  });

  assert.equal(move.ok, false);
  assert.match(move.error, /already on that playlist/i);
  assert.equal(userPlaylists.listUserPlaylistSongs(source.data.id).length, 1);
});

test('insertSongFields appends new track to existing custom order', () => {
  openTempDb();
  const artist = seedCatalogArtist();
  const librarySong = library.listSongsForArtist(artist.id)[0];

  const playlist = userPlaylists.createUserPlaylist('Ordered');
  const first = userPlaylists.addSongToUserPlaylist(playlist.data.id, librarySong);
  const key = playlistOrder.userPlaylistKey(playlist.data.id);

  playlistOrder.saveCustomOrder(key, [first.data.song.id]);

  const secondSong = {
    artist_name: 'YouTube Channel',
    title: 'YouTube Track',
    id: -1,
    library_song_id: null,
    page_url: 'songpages-youtube:watch/abc123def45',
    playback_url: 'https://www.youtube.com/watch?v=abc123def45',
    song_manifest_url: 'songpages-youtube:manifest/abc123def45',
    playback_scope: 'youtube',
    external_id: 'abc123def45',
  };

  const second = userPlaylists.addSongToUserPlaylist(playlist.data.id, secondSong);
  const ordered = playlistOrder.listOrderedSongIds(key);
  assert.equal(ordered.length, 2);
  assert.equal(ordered[0], first.data.song.id);
  assert.equal(ordered[1], second.data.song.id);
});

test('removeUserPlaylistSong removes id from custom order', () => {
  openTempDb();
  const artist = seedCatalogArtist();
  const librarySong = library.listSongsForArtist(artist.id)[0];

  const playlist = userPlaylists.createUserPlaylist('Removable');
  const added = userPlaylists.addSongToUserPlaylist(playlist.data.id, librarySong);
  const key = playlistOrder.userPlaylistKey(playlist.data.id);
  playlistOrder.saveCustomOrder(key, [added.data.song.id]);

  userPlaylists.removeUserPlaylistSong(added.data.song.id);
  assert.deepEqual(playlistOrder.listOrderedSongIds(key), []);
});

test('mergeSnapshotFieldsFillMissing preserves stored title while filling blanks', () => {
  const stored = {
    title: 'Historical Title',
    cover_url: '',
    playback_url: 'https://artist.example/audio/a.m3u8',
  };
  const incoming = {
    title: 'Live Catalog Title',
    cover_url: 'https://artist.example/cover.jpg',
    playback_url: 'https://artist.example/audio/new.m3u8',
  };

  const merged = userPlaylists.mergeSnapshotFieldsFillMissing(stored, incoming);
  assert.equal(merged.title, 'Historical Title');
  assert.equal(merged.cover_url, 'https://artist.example/cover.jpg');
  assert.equal(merged.playback_url, 'https://artist.example/audio/a.m3u8');
});

test('isCompleteCatalogSnapshot rejects provider rows missing external_id', () => {
  assert.equal(
    userPlaylists.isCompleteCatalogSnapshot({
      page_url: 'songpages-youtube:watch/abc123def45',
      playback_url: 'https://www.youtube.com/watch?v=abc123def45',
      song_manifest_url: 'songpages-youtube:manifest/abc123def45',
      external_id: '',
    }),
    false,
  );
});

test('resolveLibrarySongIdForAccess ignores custom playlist synthetic ids', () => {
  openTempDb();
  assert.equal(isUserPlaylistSongId(-3_000_001), true);
  assert.equal(
    resolveLibrarySongIdForAccess({
      id: -3_000_001,
      library_song_id: 42,
      page_url: 'https://artist.example/songs/a.html',
      playback_url: 'https://artist.example/audio/a.m3u8',
    }),
    null,
  );
});

test('clearStalePlaylistLibrarySongId nulls convenience links after catalog delete', () => {
  const db = openTempDb();
  const artist = seedCatalogArtist();
  const librarySong = library.listSongsForArtist(artist.id)[0];

  const playlist = userPlaylists.createUserPlaylist('Stale Link');
  userPlaylists.addSongToUserPlaylist(playlist.data.id, librarySong);

  library.deleteArtist(artist.id);
  assert.equal(clearStalePlaylistLibrarySongId(librarySong.id), true);

  const row = db
    .prepare('SELECT library_song_id FROM user_playlist_songs WHERE playlist_id = ?')
    .get(playlist.data.id);
  assert.equal(row.library_song_id, null);
});
