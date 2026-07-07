import assert from 'node:assert/strict';
import { test } from 'node:test';

import { densityToParticleCountLegacy, resolveParticleCount } from './particleCount';

test('resolveParticleCount prefers explicit particleCount', () => {
  assert.equal(resolveParticleCount({ particleCount: 80, density: 0 }), 80);
  assert.equal(resolveParticleCount({ particleCount: 200, density: 0 }), 150);
  assert.equal(resolveParticleCount({ particleCount: 0, density: 0.5 }), 1);
});

test('resolveParticleCount falls back to legacy density mapping', () => {
  assert.equal(resolveParticleCount({ density: 0 }), 8);
  assert.equal(resolveParticleCount({ density: 1 }), 40);
});

test('densityToParticleCountLegacy maps 0–1 to ~8–40', () => {
  assert.equal(densityToParticleCountLegacy(0.5), 24);
});
