import assert from 'node:assert/strict';
import { test } from 'node:test';

import { canonicalizeFlowInput } from './canonicalize.ts';
import { isFlowClipUnavailableBody, metadataFromFlowPage } from './metadata.ts';

test('canonicalizeFlowInput builds public clip URL', () => {
  const clipId = '57d4ab70-3279-4175-b327-c56d1df6a298';
  const result = canonicalizeFlowInput(`https://www.flowmusic.app/song/${clipId}`);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.ref.publicClipUrl, `https://storage.googleapis.com/producer-app-public/clips/${clipId}.m4a`);
});

test('isFlowClipUnavailableBody detects GCS NoSuchKey XML', () => {
  const xml = `<Error><Code>NoSuchKey</Code><Message>The specified key does not exist.</Message></Error>`;
  assert.equal(isFlowClipUnavailableBody(xml), true);
  assert.equal(isFlowClipUnavailableBody('not xml'), false);
});

test('metadataFromFlowPage maps sound prompt and lyrics', () => {
  const clipId = '57d4ab70-3279-4175-b327-c56d1df6a298';
  const ref = canonicalizeFlowInput(clipId);
  assert.equal(ref.ok, true);
  if (!ref.ok) return;

  const metadata = metadataFromFlowPage(
    ref.ref,
    {
      id: clipId,
      title: 'Silver Pulse (Take 2)',
      audio_url: ref.ref.publicClipUrl,
      image_url: 'https://storage.googleapis.com/producer-app-public/assets/f8869e41.jpg',
      duration: { value: '177.088' },
      lyrics: { value: { text: 'New skin, coming in' } },
      operation: { sound_prompt: 'Witch house, occult house' },
    },
    { username: 'Sawyerhouse' },
  );

  assert.equal(metadata.title, 'Silver Pulse (Take 2)');
  assert.equal(metadata.artistName, 'Sawyerhouse');
  assert.equal(metadata.soundPrompt, 'Witch house, occult house');
  assert.equal(metadata.lyrics, 'New skin, coming in');
  assert.equal(metadata.durationSeconds, 177.088);
});
