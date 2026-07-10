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

test('overlay toggle commands stay available in VC mode even without queue data', () => {
  const context = { vcModeActive: true, hasNextSong: false, hasUpcomingSongs: false };

  for (const commandId of [
    'toggle-host',
    'toggle-next-overlay',
    'toggle-upcoming',
    'toggle-cover',
    'toggle-song-info',
    'toggle-remaining',
  ]) {
    const command = getBuiltinCommand(commandId);
    assert.ok(command);
    assert.equal(isCommandAvailable(command, context), true, commandId);
  }
});

test('toggle-host is available when hostGraphicPopupId is configured', () => {
  const command = getBuiltinCommand('toggle-host');
  assert.ok(command);

  const available = isCommandAvailable(
    command,
    deriveCommandRuntimeContextFromVcState(
      sampleVcPayload({
        config: {
          ...sampleVcPayload().config,
          hostGraphicPopupId: 'graphic-1',
        },
      }),
      { vcModeActive: true },
    ),
  );
  assert.equal(available, true);
});

test('listOverlayMappings keeps Toggle Next available without queue data', () => {
  let state = createDefaultCommandMappingState();
  state = applyCommandBindingPatch(state, 'toggle-next-overlay', { gated: 'n' });

  const rows = listOverlayMappings(state, [], {
    vcModeActive: true,
    hasNextSong: false,
  });
  const nextRow = rows.find((row) => row.commandId === 'toggle-next-overlay');
  assert.equal(nextRow?.available, true);
});
