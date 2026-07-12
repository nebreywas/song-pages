import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canonicalizeSoundcloudInput, validateSoundcloudInput } from './canonicalize.ts';

describe('soundcloud canonicalize', () => {
  it('accepts public track permalinks', () => {
    const result = canonicalizeSoundcloudInput('https://soundcloud.com/forss/flickermood');
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.ref.permalink, 'https://soundcloud.com/forss/flickermood');
    assert.equal(result.ref.needsRedirectResolve, false);
  });

  it('rejects artist profiles', () => {
    const result = canonicalizeSoundcloudInput('https://soundcloud.com/forss');
    assert.equal(result.ok, false);
  });

  it('rejects sets', () => {
    const result = canonicalizeSoundcloudInput('https://soundcloud.com/forss/sets/soulhack');
    assert.equal(result.ok, false);
  });

  it('accepts short links for main-process redirect', () => {
    const result = canonicalizeSoundcloudInput('https://on.soundcloud.com/abc123');
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.ref.needsRedirectResolve, true);
  });

  it('validate mirrors canonicalize', () => {
    assert.equal(validateSoundcloudInput('https://soundcloud.com/a/b'), true);
    assert.equal(validateSoundcloudInput('https://soundcloud.com/a'), false);
  });
});
