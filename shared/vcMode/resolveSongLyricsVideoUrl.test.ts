import assert from 'node:assert/strict';
import { test } from 'node:test';

import { serializeSunoProviderMetadata, metadataFromSunoClip } from '../providers/suno/clipMetadata.ts';
import { resolveSongLyricsVideoUrl } from './resolveSongLyricsVideoUrl.ts';

const SUNO_LYRIC_VIDEO = 'https://cdn1.suno.ai/clip.mp4';
const SUNO_COVER_VIDEO =
  'https://cdn1.suno.ai/video_upload_7f0b49f6-efb4-4a8a-b56e-544371d31b84_processed_video.mp4';

const baseSong = {
  page_url: 'https://suno.com/song/abc',
  song_manifest_url: null as string | null,
  cover_url: 'https://cdn1.suno.ai/cover.jpeg',
};

test('resolveSongLyricsVideoUrl prefers Suno video_url from manifest provider metadata', () => {
  const meta = metadataFromSunoClip({
    id: 'clip-1',
    video_url: SUNO_LYRIC_VIDEO,
    video_cover_url: SUNO_COVER_VIDEO,
    metadata: {},
  });
  const url = resolveSongLyricsVideoUrl(baseSong, {
    providerMetadata: meta as unknown as Record<string, unknown>,
  });
  assert.equal(url, SUNO_LYRIC_VIDEO);
});

test('resolveSongLyricsVideoUrl falls back to song snapshot provider metadata', () => {
  const meta = metadataFromSunoClip({
    id: 'clip-2',
    video_url: SUNO_LYRIC_VIDEO,
    metadata: {},
  });
  const url = resolveSongLyricsVideoUrl(
    {
      ...baseSong,
      provider_metadata_json: serializeSunoProviderMetadata(meta),
    },
    null,
  );
  assert.equal(url, SUNO_LYRIC_VIDEO);
});

test('resolveSongLyricsVideoUrl ignores cover-only video_cover_url', () => {
  const meta = metadataFromSunoClip({
    id: 'clip-3',
    video_cover_url: SUNO_COVER_VIDEO,
    metadata: {},
  });
  const url = resolveSongLyricsVideoUrl(
    {
      ...baseSong,
      provider_metadata_json: serializeSunoProviderMetadata(meta),
    },
    null,
  );
  assert.equal(url, null);
});

test('resolveSongLyricsVideoUrl returns null when nothing is available', () => {
  assert.equal(resolveSongLyricsVideoUrl(baseSong, null), null);
});
