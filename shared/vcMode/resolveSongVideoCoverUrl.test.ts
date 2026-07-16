import assert from 'node:assert/strict';
import { test } from 'node:test';

import { serializeSunoProviderMetadata, metadataFromSunoClip } from '../providers/suno/clipMetadata.ts';
import { resolveSongVideoCoverUrl } from './resolveSongVideoCoverUrl.ts';

const SUNO_LYRIC_VIDEO = 'https://cdn1.suno.ai/clip.mp4';
const SUNO_COVER_VIDEO =
  'https://cdn1.suno.ai/video_upload_7f0b49f6-efb4-4a8a-b56e-544371d31b84_processed_video.mp4';

const baseSong = {
  page_url: 'https://suno.com/song/abc',
  song_manifest_url: null as string | null,
  cover_url: 'https://cdn1.suno.ai/cover.jpeg',
};

test('resolveSongVideoCoverUrl prefers Suno video_cover_url over lyric video_url', () => {
  const meta = metadataFromSunoClip({
    id: 'clip-1',
    video_url: SUNO_LYRIC_VIDEO,
    video_cover_url: SUNO_COVER_VIDEO,
    metadata: {},
  });
  const url = resolveSongVideoCoverUrl(baseSong, {
    providerMetadata: meta as unknown as Record<string, unknown>,
    extraImageUrl: 'https://example.com/extra.jpg',
  });
  assert.equal(url, SUNO_COVER_VIDEO);
});

test('resolveSongVideoCoverUrl ignores lyric-only video_url', () => {
  const meta = metadataFromSunoClip({
    id: 'clip-2',
    video_url: SUNO_LYRIC_VIDEO,
    metadata: {},
  });
  const url = resolveSongVideoCoverUrl(
    {
      ...baseSong,
      provider_metadata_json: serializeSunoProviderMetadata(meta),
    },
    null,
  );
  assert.equal(url, null);
});

test('resolveSongVideoCoverUrl falls back to song snapshot videoCoverUrl', () => {
  const meta = metadataFromSunoClip({
    id: 'clip-3',
    video_cover_url: SUNO_COVER_VIDEO,
    metadata: {},
  });
  const url = resolveSongVideoCoverUrl(
    {
      ...baseSong,
      provider_metadata_json: serializeSunoProviderMetadata(meta),
    },
    null,
  );
  assert.equal(url, SUNO_COVER_VIDEO);
});

test('resolveSongVideoCoverUrl uses extraImageUrl when no Suno cover video exists', () => {
  const url = resolveSongVideoCoverUrl(baseSong, {
    providerMetadata: null,
    extraImageUrl: 'https://example.com/extra.mp4',
  });
  assert.equal(url, 'https://example.com/extra.mp4');
});

test('resolveSongVideoCoverUrl returns null when nothing is available', () => {
  assert.equal(resolveSongVideoCoverUrl(baseSong, null), null);
});
