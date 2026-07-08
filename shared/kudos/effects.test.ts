import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isParticleEffectImplemented,
  isTextEffectImplemented,
  listShippedParticleEffects,
  listShippedTextEffects,
} from './effects';

test('Phase B particle effects are implemented', () => {
  for (const effect of ['fountain', 'swarm', 'scatter', 'spiral']) {
    assert.equal(isParticleEffectImplemented(effect), true);
  }
});

test('Phase B text effects are implemented', () => {
  for (const effect of ['stamp', 'flash', 'bounce', 'drop', 'zoom', 'wave']) {
    assert.equal(isTextEffectImplemented(effect), true);
  }
});

test('Phase C particle effects are implemented', () => {
  for (const effect of ['wave', 'pop', 'pulse', 'comet']) {
    assert.equal(isParticleEffectImplemented(effect), true);
  }
});

test('listShippedParticleEffects includes full particle library', () => {
  assert.equal(listShippedParticleEffects().length, 12);
});

test('listShippedTextEffects includes all MVP text effects', () => {
  assert.equal(listShippedTextEffects().length, 10);
});
