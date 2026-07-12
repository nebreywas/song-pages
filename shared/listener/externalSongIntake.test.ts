import assert from 'node:assert/strict';
import { test } from 'node:test';

import { canonicalizeSunoInput } from '../providers/suno/canonicalize.ts';
import { detectExternalSongProvider } from './externalSongIntake.ts';

test('canonicalizeSunoInput accepts clip UUIDs and share URLs', () => {
  const uuid = '3fe940b3-ea01-4b41-9e39-15b46447b4fb';
  assert.equal(canonicalizeSunoInput(uuid).ok, true);
  assert.equal(
    canonicalizeSunoInput(`https://suno.com/song/${uuid}`).ok,
    true,
  );
  assert.equal(
    canonicalizeSunoInput('https://suno.com/s/Ngm70Weq9IBYFMyi').ok,
    true,
  );
});

test('detectExternalSongProvider recognizes Suno short share URLs', () => {
  const result = detectExternalSongProvider('https://suno.com/s/Ngm70Weq9IBYFMyi');
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.provider, 'suno');
});

test('detectExternalSongProvider rejects unsupported hosts', () => {
  const result = detectExternalSongProvider('https://open.spotify.com/track/abc');
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /not supported/i);
  }
});

test('detectExternalSongProvider recognizes YouTube watch URLs', () => {
  const result = detectExternalSongProvider('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.provider, 'youtube');
});
