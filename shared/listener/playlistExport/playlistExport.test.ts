import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildPlaylistExportModel,
  orderSongsForPlaylistExport,
  renderPlaylistExport,
  renderPlaylistExportMarkdown,
  renderPlaylistExportPlainText,
} from './index.ts';

const sampleSongs = [
  {
    id: 3,
    sort_order: 30,
    title: 'Afterlight',
    artist_name: 'Ben Sawyer',
    album: 'Music From Games',
    year: '2025',
    duration_seconds: 227,
    page_url: 'https://example.com/songs/afterlight',
    external_id: 'a1',
    slug: 'afterlight',
    skipped: 0,
  },
  {
    id: 1,
    sort_order: 10,
    title: 'Schmup 1.5',
    artist_name: 'Ben Sawyer',
    album: 'Music From Games',
    year: '2026',
    duration_seconds: 246,
    page_url: 'https://example.com/songs/schmup',
    external_id: 's1',
    slug: 'schmup-15',
    skipped: 0,
  },
  {
    id: 2,
    sort_order: 20,
    title: 'Skipped Row',
    artist_name: 'Ben Sawyer',
    page_url: 'https://example.com/songs/skipped',
    external_id: 'skip',
    slug: 'skipped',
    skipped: 1,
  },
];

test('orderSongsForPlaylistExport uses sort_order and omits skipped rows', () => {
  const ordered = orderSongsForPlaylistExport(sampleSongs, null);
  assert.deepEqual(
    ordered.map((song) => song.id),
    [1, 3],
  );
});

test('orderSongsForPlaylistExport respects saved custom order', () => {
  const ordered = orderSongsForPlaylistExport(sampleSongs, [3, 1]);
  assert.deepEqual(
    ordered.map((song) => song.id),
    [3, 1],
  );
});

test('buildPlaylistExportModel applies missing-information fallbacks', () => {
  const model = buildPlaylistExportModel({
    playlistName: 'Test',
    createdAt: '2026-07-01',
    songs: [
      {
        id: 9,
        sort_order: 1,
        title: '',
        artist_name: '',
        page_url: '',
        external_id: 'x',
        slug: 'x',
      },
    ],
  });

  assert.equal(model.tracks[0]?.title, 'Unknown Track Name');
  assert.equal(model.tracks[0]?.artistName, 'Name Unknown');
  assert.equal(model.tracks[0]?.url, null);
});

test('renderPlaylistExportPlainText uses inline metadata only', () => {
  const model = buildPlaylistExportModel({
    playlistName: 'June 2026',
    introduction: 'Hi,',
    createdAt: '2026-07-01',
    songs: [sampleSongs[0]!],
  });

  const text = renderPlaylistExportPlainText(model, {
    playlistName: 'June 2026',
    introduction: 'Hi,',
    includeAlbum: true,
    includeYear: true,
    includeLength: true,
    linkStyle: 'fullUrls',
    outputFormat: 'plainText',
  });

  assert.match(text, /Afterlight - Ben Sawyer \(Music From Games, 2025\) - 3:47/);
  assert.match(text, /https:\/\/example\.com\/songs\/afterlight/);
  assert.doesNotMatch(text, /\n\(/);
});

test('renderPlaylistExportMarkdown uses Discord subtext attribution', () => {
  const model = buildPlaylistExportModel({
    playlistName: 'June 2026',
    createdAt: '2026-07-01',
    songs: [sampleSongs[0]!],
  });

  const md = renderPlaylistExportMarkdown(model, {
    playlistName: 'June 2026',
    introduction: '',
    includeAlbum: false,
    includeYear: true,
    includeLength: true,
    linkStyle: 'maskedLinks',
    outputFormat: 'markdown',
  });

  assert.match(md, /\[\*\*Afterlight\*\*\]\(https:\/\/example\.com\/songs\/afterlight\)/);
  assert.match(md, /-# This playlist was created with Song Pages/);
});

test('renderPlaylistExportMarkdown uses compact playlist header lines', () => {
  const model = buildPlaylistExportModel({
    playlistName: 'Latest Genres',
    createdAt: '2026-07-11',
    songs: [sampleSongs[0]!],
  });

  const md = renderPlaylistExportMarkdown(model, {
    playlistName: 'Latest Genres',
    introduction: '',
    includeAlbum: false,
    includeYear: false,
    includeLength: false,
    linkStyle: 'noLinks',
    outputFormat: 'markdown',
  });

  assert.match(md, /# Latest Genres\n## Created .+\n### 1 Track/);
  assert.doesNotMatch(md, /# Latest Genres\n\n## Created/);
});

test('renderPlaylistExportPlainText uses compact playlist header lines', () => {
  const model = buildPlaylistExportModel({
    playlistName: 'Latest Genres',
    createdAt: '2026-07-11',
    songs: [sampleSongs[0]!],
  });

  const text = renderPlaylistExportPlainText(model, {
    playlistName: 'Latest Genres',
    introduction: '',
    includeAlbum: false,
    includeYear: false,
    includeLength: false,
    linkStyle: 'noLinks',
    outputFormat: 'plainText',
  });

  assert.match(text, /Latest Genres\nCreated .+\n1 track/);
  assert.doesNotMatch(text, /Latest Genres\n\nCreated/);
});

test('renderPlaylistExportMarkdown places full URLs directly under track lines', () => {
  const model = buildPlaylistExportModel({
    playlistName: 'June 2026',
    createdAt: '2026-07-01',
    songs: [sampleSongs[0]!],
  });

  const md = renderPlaylistExportMarkdown(model, {
    playlistName: 'June 2026',
    introduction: '',
    includeAlbum: false,
    includeYear: true,
    includeLength: true,
    linkStyle: 'fullUrls',
    outputFormat: 'markdown',
  });

  assert.match(md, /3:47\nhttps:\/\/example\.com\/songs\/afterlight/);
  assert.doesNotMatch(md, /3:47\n\nhttps:\/\/example\.com\/songs\/afterlight/);
});

test('renderPlaylistExport coerces masked links to full URLs for plain text', () => {
  const plain = renderPlaylistExport({
    playlistName: 'Demo',
    introduction: '',
    createdAt: null,
    songs: [sampleSongs[0]!],
    options: {
      playlistName: 'Demo',
      introduction: '',
      includeAlbum: false,
      includeYear: false,
      includeLength: false,
      linkStyle: 'maskedLinks',
      outputFormat: 'plainText',
    },
  });

  assert.match(plain, /https:\/\/example\.com\/songs\/afterlight/);
  assert.doesNotMatch(plain, /\]\(/);
});
