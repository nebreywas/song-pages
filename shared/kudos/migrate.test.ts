import assert from 'node:assert/strict';
import { test } from 'node:test';

import { migrateKudosState } from './migrate';

test('migrateKudosState keeps valid hybrid presets with text and particle', () => {
  const state = migrateKudosState({
    version: 1,
    presets: [
      {
        id: 'hybrid-1',
        name: 'Awesome Burst',
        contentType: 'hybrid',
        text: {
          value: 'AWESOME!',
          effectId: 'slam',
          fontId: 'impact',
          durationMs: 2600,
          textColor: '#ffffff',
          outline: 'heavy',
          shadow: 'soft',
          placement: 'center',
        },
        particle: {
          elements: [
            { type: 'builtin-asset', assetId: 'star' },
            { type: 'builtin-asset', assetId: 'sparkles' },
          ],
          effectId: 'burst',
          durationMs: 2600,
          speed: 0.5,
          density: 0.5,
          particleCount: 40,
          size: 0.5,
          variation: 0.5,
          origin: 'center',
        },
      },
    ],
  });

  assert.equal(state.presets.length, 1);
  assert.equal(state.presets[0]?.contentType, 'hybrid');
  assert.equal(state.presets[0]?.text?.value, 'AWESOME!');
  assert.equal(state.presets[0]?.particle?.effectId, 'burst');
});

test('migrateKudosState drops hybrid presets missing a layer', () => {
  const state = migrateKudosState({
    version: 1,
    presets: [
      {
        id: 'hybrid-bad',
        name: 'Broken',
        contentType: 'hybrid',
        particle: {
          elements: [{ type: 'builtin-asset', assetId: 'heart' }],
          effectId: 'rise',
          durationMs: 2000,
          speed: 0.5,
          density: 0.5,
          size: 0.5,
          variation: 0.5,
          origin: 'bottom',
        },
      },
      {
        id: 'hybrid-good',
        name: 'Awesome Burst',
        contentType: 'hybrid',
        text: {
          value: 'AWESOME!',
          effectId: 'slam',
          fontId: 'impact',
          durationMs: 2600,
          outline: 'heavy',
          shadow: 'soft',
          placement: 'center',
        },
        particle: {
          elements: [{ type: 'builtin-asset', assetId: 'star' }],
          effectId: 'burst',
          durationMs: 2600,
          speed: 0.5,
          density: 0.5,
          size: 0.5,
          variation: 0.5,
          origin: 'center',
        },
      },
    ],
  });

  assert.equal(state.presets.length, 1);
  assert.equal(state.presets[0]?.id, 'hybrid-good');
});
