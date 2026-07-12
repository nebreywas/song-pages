import assert from 'node:assert/strict';
import { test } from 'node:test';

import { canonicalizeFlowInput, validateFlowInput } from '../providers/flow/canonicalize.ts';
import {
  flowManifestUrl,
  flowPageUrl,
  isFlowSong,
  parseFlowManifestClipId,
} from './flowFeature.ts';

const PUBLIC_ID = '57d4ab70-3279-4175-b327-c56d1df6a298';

test('validateFlowInput accepts share URLs and bare UUIDs', () => {
  assert.equal(validateFlowInput(PUBLIC_ID), true);
  assert.equal(validateFlowInput(`https://www.flowmusic.app/song/${PUBLIC_ID}`), true);
  assert.equal(validateFlowInput(`https://flowmusic.app/song/${PUBLIC_ID}`), true);
});

test('validateFlowInput accepts public GCS clip URLs', () => {
  assert.equal(
    validateFlowInput(`https://storage.googleapis.com/producer-app-public/clips/${PUBLIC_ID}.m4a`),
    true,
  );
});

test('canonicalizeFlowInput rejects private buckets and signed URLs', () => {
  const privateClip = canonicalizeFlowInput(
    'https://storage.googleapis.com/producer-app-private/clips/c061736b-2d7c-4cd6-a3cc-91b12f4500a6.m4a',
  );
  assert.equal(privateClip.ok, false);

  const signed = canonicalizeFlowInput(
    'https://storage.googleapis.com/producer-app-private/clips/c061736b-2d7c-4cd6-a3cc-91b12f4500a6.m4a?X-Goog-Algorithm=GOOG4-RSA-SHA256',
  );
  assert.equal(signed.ok, false);
});

test('flowPageUrl and manifest helpers round-trip', () => {
  assert.equal(flowPageUrl(PUBLIC_ID), `songpages-flow:page/${PUBLIC_ID}`);
  assert.equal(parseFlowManifestClipId(flowManifestUrl(PUBLIC_ID)), PUBLIC_ID);
  assert.equal(
    isFlowSong({ playback_scope: 'flow', page_url: flowPageUrl(PUBLIC_ID) }),
    true,
  );
});
