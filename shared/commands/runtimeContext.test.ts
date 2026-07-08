import assert from 'node:assert/strict';
import test from 'node:test';

import { getBuiltinCommand } from './catalog';
import { createDefaultCommandMappingState } from './defaults';
import { applyCommandBindingPatch } from './assignments';
import { listOverlayMappings } from './resolve';
import {
  deriveCommandRuntimeContextFromVcState,
  isCommandAvailable,
} from './runtimeContext';
import type { VcStatePayload } from '../vcModeTypes';

function sampleVcPayload(overrides: Partial<VcStatePayload> = {}): VcStatePayload {
  return {
    config: {
      surface: { rows: 2, cols: 2, dividers: [], floats: [] },
      visualizerId: 'aurora',
    },
    playback: { currentTime: 12, duration: 180, isPlaying: true },
    audioMirror: { songId: 1, playbackUrl: null, volume: 1 },
    currentSong: {
      id: 1,
      title: 'Song',
      artist: 'Artist',
      coverUrl: 'https://example.com/cover.jpg',
    },
    nextSong: null,
    upcoming: [],
    hostGraphicUrl: null,
    artistName: 'Artist',
    artistBio: null,
    artistPhotoUrl: null,
    effectiveVisualizerId: 'aurora',
    kudoPresets: [],
    ...overrides,
  } as VcStatePayload;
}

test('deriveCommandRuntimeContextFromVcState reflects queue and media flags', () => {
  const context = deriveCommandRuntimeContextFromVcState(
    sampleVcPayload({
      nextSong: { title: 'Next', artist: 'Band' },
      upcoming: [{ id: 2, title: 'Later', artist: 'Band', durationSeconds: 200, coverUrl: null }],
      hostGraphicUrl: 'file:///host.png',
    }),
    { vcModeActive: true },
  );

  assert.equal(context.hasNextSong, true);
  assert.equal(context.hasUpcomingSongs, true);
  assert.equal(context.hasCurrentSong, true);
  assert.equal(context.hasCoverArt, true);
  assert.equal(context.hasHostGraphic, true);
  assert.equal(context.hasPlaybackTiming, true);
});

test('toggle-next-overlay is unavailable without a next song', () => {
  const command = getBuiltinCommand('toggle-next-overlay');
  assert.ok(command);

  const available = isCommandAvailable(command, {
    vcModeActive: true,
    hasNextSong: false,
  });
  assert.equal(available, false);
});

test('listOverlayMappings grays Toggle Next when runtime context lacks next song', () => {
  let state = createDefaultCommandMappingState();
  state = applyCommandBindingPatch(state, 'toggle-next-overlay', { gated: 'n' });

  const rows = listOverlayMappings(state, [], {
    vcModeActive: true,
    hasNextSong: false,
  });
  const nextRow = rows.find((row) => row.commandId === 'toggle-next-overlay');
  assert.equal(nextRow?.available, false);
});
