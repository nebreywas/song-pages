import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatSunoCreatedDate,
  metadataFromSunoClip,
  parseSunoProviderMetadata,
  serializeSunoProviderMetadata,
  splitSunoTags,
  yearFromCreatedAt,
} from './clipMetadata.ts';

const SAMPLE_CLIP = {
  id: '39db1ce8-0c42-442f-983e-2c0b983b6826',
  title: 'Brew',
  created_at: '2026-06-26T04:27:00.000Z',
  major_model_version: 'v5',
  model_name: 'chirp-crow',
  handle: 'bensawyer',
  display_name: 'Ben Sawyer',
  avatar_image_url: 'https://cdn2.suno.ai/avatar.jpeg',
  play_count: 1200,
  upvote_count: 42,
  comment_count: 3,
  is_explicit: false,
  video_url: 'https://cdn1.suno.ai/clip.mp4',
  video_cover_url:
    'https://cdn1.suno.ai/video_upload_7f0b49f6-efb4-4a8a-b56e-544371d31b84_processed_video.mp4',
  metadata: {
    tags: 'hip hop, boom bap, vinyl',
    prompt: '[Verse]\nLyrics here',
    gpt_description_prompt: 'lofi boom bap about brewing coffee',
    duration: 187.2,
    avg_bpm: 88,
    make_instrumental: false,
  },
};

test('splitSunoTags dedupes and trims', () => {
  assert.deepEqual(splitSunoTags('hip hop, Boom Bap,  hip hop | vinyl'), [
    'hip hop',
    'Boom Bap',
    'vinyl',
  ]);
});

test('yearFromCreatedAt reads YYYY', () => {
  assert.equal(yearFromCreatedAt('2026-06-26T04:27:00.000Z'), '2026');
  assert.equal(yearFromCreatedAt('not-a-date'), null);
});

test('metadataFromSunoClip maps Studio fields without copying lyrics', () => {
  const meta = metadataFromSunoClip(SAMPLE_CLIP);
  assert.equal(meta.provider, 'suno');
  assert.equal(meta.clipId, SAMPLE_CLIP.id);
  assert.equal(meta.year, '2026');
  assert.equal(meta.createdAt, SAMPLE_CLIP.created_at);
  assert.equal(meta.tags, 'hip hop, boom bap, vinyl');
  assert.deepEqual(meta.tagList, ['hip hop', 'boom bap', 'vinyl']);
  assert.equal(meta.stylePrompt, 'lofi boom bap about brewing coffee');
  assert.equal(meta.modelBadge, 'v5');
  assert.equal(meta.modelName, 'chirp-crow');
  assert.equal(meta.creatorHandle, 'bensawyer');
  assert.equal(meta.creatorDisplayName, 'Ben Sawyer');
  assert.equal(meta.sunoPlayCount, 1200);
  assert.equal(meta.sunoLikeCount, 42);
  assert.equal(meta.bpm, 88);
  assert.equal(meta.isInstrumental, false);
  assert.equal(meta.explicit, false);
  assert.equal(meta.videoUrl, SAMPLE_CLIP.video_url);
  assert.equal(meta.videoCoverUrl, SAMPLE_CLIP.video_cover_url);
  assert.ok(!('prompt' in meta));
});

test('metadataFromSunoClip keeps lyric video and cover video distinct', () => {
  const meta = metadataFromSunoClip({
    id: 'cover-only',
    video_url: 'https://cdn1.suno.ai/cover-only.mp4',
    video_cover_url: 'https://cdn1.suno.ai/video_upload_demo_processed_video.mp4',
    metadata: {},
  });
  assert.equal(meta.videoUrl, 'https://cdn1.suno.ai/cover-only.mp4');
  assert.equal(meta.videoCoverUrl, 'https://cdn1.suno.ai/video_upload_demo_processed_video.mp4');
});

test('serialize/parse round-trip preserves provider metadata', () => {
  const original = metadataFromSunoClip(SAMPLE_CLIP);
  const restored = parseSunoProviderMetadata(serializeSunoProviderMetadata(original));
  assert.deepEqual(restored, original);
});

test('parseSunoProviderMetadata accepts raw Studio clip JSON', () => {
  const meta = parseSunoProviderMetadata(SAMPLE_CLIP);
  assert.equal(meta?.modelBadge, 'v5');
  assert.equal(meta?.tags, 'hip hop, boom bap, vinyl');
});

test('parseSunoProviderMetadata maps legacy playCount/upvoteCount into suno* fields', () => {
  const meta = parseSunoProviderMetadata({
    schemaVersion: 1,
    provider: 'suno',
    clipId: 'legacy',
    playCount: 99,
    upvoteCount: 7,
  });
  assert.equal(meta?.sunoPlayCount, 99);
  assert.equal(meta?.sunoLikeCount, 7);
  assert.equal('playCount' in (meta ?? {}), false);
  assert.equal('upvoteCount' in (meta ?? {}), false);
});

test('formatSunoCreatedDate is human-readable UTC', () => {
  const label = formatSunoCreatedDate('2026-06-26T04:27:00.000Z');
  assert.match(String(label), /2026/);
  assert.match(String(label), /Jun/);
});
