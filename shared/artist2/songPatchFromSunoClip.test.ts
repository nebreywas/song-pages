import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  creationDateFromSunoClip,
  lyricsFromSunoClip,
  songPatchFromSunoClip,
  staticCoverUrlFromSunoClip,
} from './songPatchFromSunoClip.ts';
import { songYearForCompile } from './types.ts';

const CLIP_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const sampleClip = {
  id: CLIP_ID,
  title: 'Night Almighty',
  created_at: '2025-06-15T12:00:00Z',
  image_large_url: 'https://cdn2.suno.ai/image_large_sample.jpeg',
  image_url: 'https://cdn2.suno.ai/image_sample.jpeg',
  video_url: 'https://cdn1.suno.ai/lyric-video.mp4',
  video_cover_url: 'https://cdn1.suno.ai/animated-cover.mp4',
  audio_url: 'https://cdn1.suno.ai/audio.mp3',
  major_model_version: 'v5',
  model_name: 'chirp-v4',
  handle: 'bensawyer',
  metadata: {
    prompt: '[Verse]\nHello world',
    gpt_description_prompt: 'cinematic folk, warm vocals',
    tags: 'folk, cinematic',
    avg_bpm: 92,
    make_instrumental: false,
  },
};

describe('songPatchFromSunoClip', () => {
  it('maps Studio tags into stylePrompt and creationDate as dd/mm/yyyy', () => {
    const patch = songPatchFromSunoClip(sampleClip, {
      importedAt: '2026-07-16T10:00:00.000Z',
    });

    assert.equal(patch.name, 'Night Almighty');
    assert.equal(patch.payload.creationDate, '15/06/2025');
    assert.equal(patch.payload.lyrics, '[Verse]\nHello world');
    assert.equal(patch.payload.stylePrompt, undefined);
    assert.equal(patch.payload.about, 'cinematic folk, warm vocals');
    assert.equal(patch.payload.description, undefined);
    assert.equal(patch.payload.slug, 'night-almighty');
    assert.equal(patch.payload.slugManual, false);
    assert.equal(patch.payload.links, undefined);
    const sunoLink = patch.payload.linkEntries?.find(
      (e) => e.kind === 'streaming' && e.providerId === 'suno',
    );
    assert.ok(sunoLink);
    assert.equal(sunoLink?.url, `https://suno.com/song/${CLIP_ID}`);
    assert.ok(patch.payload.linkEntries?.some((e) => e.kind === 'song_pages'));
    const aiMusic = patch.payload.creationProcesses?.find(
      (p) => p.target === 'music_mix' && p.processType === 'ai_generation',
    );
    assert.ok(aiMusic);
    assert.equal(aiMusic?.aiModels?.[0]?.provider, 'Suno');
    assert.equal(patch.payload.aiPrompts?.[0]?.text, 'folk, cinematic');
    assert.equal(patch.payload.aiPrompts?.[0]?.primary, true);
    assert.equal(patch.payload.tags, undefined);
    assert.equal(patch.payload.bpm, 92);
    assert.equal(patch.payload.isInstrumental, false);
    assert.equal(patch.payload.suno?.clipId, CLIP_ID);
    assert.equal(patch.payload.suno?.shareUrl, `https://suno.com/song/${CLIP_ID}`);
    assert.equal(patch.staticCoverUrl, 'https://cdn2.suno.ai/image_large_sample.jpeg');

    const serialized = JSON.stringify(patch);
    assert.equal(serialized.includes('audio.mp3'), false);
    assert.equal(serialized.includes('lyric-video.mp4'), false);
    assert.equal(serialized.includes('animated-cover.mp4'), false);
  });

  it('keeps lyrics separate from style prompt', () => {
    assert.equal(lyricsFromSunoClip(sampleClip), '[Verse]\nHello world');
    assert.equal(
      lyricsFromSunoClip({
        metadata: { gpt_description_prompt: 'only style' },
      }),
      '',
    );
  });

  it('falls back to cdn2 static cover pattern without using video cover', () => {
    assert.equal(
      staticCoverUrlFromSunoClip({ id: CLIP_ID }, CLIP_ID),
      `https://cdn2.suno.ai/image_large_${CLIP_ID}.jpeg`,
    );
  });

  it('creationDateFromSunoClip formats ISO to dd/mm/yyyy', () => {
    assert.equal(creationDateFromSunoClip('2025-06-15T12:00:00Z', '2025'), '15/06/2025');
    assert.equal(creationDateFromSunoClip(null, '2024'), '2024');
  });
});

describe('songYearForCompile', () => {
  it('extracts year from flexible creationDate forms', () => {
    assert.equal(songYearForCompile({ creationDate: '2025' }), '2025');
    assert.equal(songYearForCompile({ creationDate: '15/06/2025' }), '2025');
    assert.equal(songYearForCompile({ year: '2023' }), '2023');
  });
});
