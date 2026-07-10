import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  normalizeSongRowAssets,
  resolveCanonicalLibrarySongId,
  resolveSongAssetUrl,
  resolveSongCoverUrl,
} from './songResolution';

test('resolveCanonicalLibrarySongId prefers library_song_id on virtual rows', () => {
  assert.equal(resolveCanonicalLibrarySongId({ id: -3000001, library_song_id: 42 }), 42);
  assert.equal(resolveCanonicalLibrarySongId({ id: 7, library_song_id: null }), 7);
  assert.equal(resolveCanonicalLibrarySongId({ id: -1, library_song_id: null }), null);
});

test('resolveSongAssetUrl uses manifest base for relative paths', () => {
  const song = {
    page_url: 'https://artist.example/songs/foo.html',
    song_manifest_url: 'https://artist.example/songs/foo/manifest.json',
    cover_url: null,
  };
  assert.equal(
    resolveSongAssetUrl(song, 'cover.jpg'),
    'https://artist.example/songs/foo/cover.jpg',
  );
});

test('resolveSongCoverUrl prefers row cover then manifest', () => {
  const song = {
    page_url: 'https://artist.example/songs/foo.html',
    song_manifest_url: 'https://artist.example/songs/foo/manifest.json',
    cover_url: null,
  };
  assert.equal(resolveSongCoverUrl(song, 'cover.jpg'), 'https://artist.example/songs/foo/cover.jpg');
});

test('normalizeSongRowAssets resolves manifest-relative snapshot paths', () => {
  const normalized = normalizeSongRowAssets({
    page_url: 'songs/foo.html',
    playback_url: 'songs/foo/manifest.m3u8',
    song_manifest_url: 'songs/foo/songpages-song.json',
    cover_url: 'cover.jpg',
    site_root_normalized: 'https://artist.example',
  });
  assert.equal(normalized.cover_url, 'https://artist.example/songs/foo/cover.jpg');
  assert.equal(
    normalized.song_manifest_url,
    'https://artist.example/songs/foo/songpages-song.json',
  );
});
