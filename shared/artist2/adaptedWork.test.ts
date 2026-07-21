import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  emptyAdaptedWork,
  patchAdaptedWork,
  songAdaptedWork,
  toggleAdaptedWorkListValue,
} from './adaptedWork';

test('songAdaptedWork returns empty when unset', () => {
  assert.deepEqual(songAdaptedWork({}), emptyAdaptedWork());
});

test('patchAdaptedWork merges without dropping prior fields', () => {
  const next = patchAdaptedWork(
    { enabled: true, originalWorkName: 'Greensleeves' },
    { adaptationType: 'arrangement' },
  );
  assert.equal(next.enabled, true);
  assert.equal(next.originalWorkName, 'Greensleeves');
  assert.equal(next.adaptationType, 'arrangement');
});

test('toggleAdaptedWorkListValue adds and removes', () => {
  assert.deepEqual(toggleAdaptedWorkListValue(undefined, 'existing_music', true), [
    'existing_music',
  ]);
  assert.deepEqual(
    toggleAdaptedWorkListValue(['existing_music', 'existing_lyrics'], 'existing_music', false),
    ['existing_lyrics'],
  );
});
