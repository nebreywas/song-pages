import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isPlaybackCommandType, PLAYBACK_COMMAND_TYPES } from './commands.ts';

test('PLAYBACK_COMMAND_TYPES includes core transport commands', () => {
  assert.ok(PLAYBACK_COMMAND_TYPES.includes('NEXT'));
  assert.ok(PLAYBACK_COMMAND_TYPES.includes('PREVIOUS'));
  assert.ok(PLAYBACK_COMMAND_TYPES.includes('TOGGLE_PLAY_PAUSE'));
});

test('isPlaybackCommandType narrows known command type strings', () => {
  assert.equal(isPlaybackCommandType('NEXT'), true);
  assert.equal(isPlaybackCommandType('toggle-vc-command-gate'), false);
  assert.equal(isPlaybackCommandType(null), false);
});
