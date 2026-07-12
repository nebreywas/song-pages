import assert from 'node:assert/strict';
import { test } from 'node:test';

import { canonicalizeYoutubeInput, validateYoutubeInput } from './canonicalize.ts';

test('validateYoutubeInput mirrors canonicalize success', () => {
  assert.equal(validateYoutubeInput('ExeQM08TwbE'), true);
  assert.equal(validateYoutubeInput('https://youtu.be/ExeQM08TwbE'), true);
  assert.equal(validateYoutubeInput('not-valid'), false);
});

test('canonicalizeYoutubeInput records tracking params as discarded', () => {
  const result = canonicalizeYoutubeInput(
    'https://www.youtube.com/watch?v=ExeQM08TwbE&utm_source=test&fbclid=abc',
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.discarded.queryParams.utm_source, 'test');
  assert.equal(result.discarded.queryParams.fbclid, 'abc');
});
