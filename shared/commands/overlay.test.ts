import assert from 'node:assert/strict';
import test from 'node:test';

import { createDefaultCommandMappingState } from './defaults';
import { applyCommandBindingPatch } from './assignments';
import { addCommandToConfiguredSet } from './configuredSet';
import { RESERVE_KUDO_SLOT_TEMPLATE_ID, syncReservedKudoKeysFromSlots } from './kudoReserve';
import { listOverlayMappings } from './resolve';

test('listOverlayMappings includes gated builtin commands', () => {
  let state = createDefaultCommandMappingState();
  state = applyCommandBindingPatch(state, 'toggle-cover', { gated: 'c' });

  const rows = listOverlayMappings(state, [], { vcModeActive: true });
  const cover = rows.find((row) => row.commandId === 'toggle-cover');
  assert.equal(cover?.key, 'C');
  assert.equal(cover?.available, true);
});

test('listOverlayMappings marks VC commands unavailable outside VC Mode', () => {
  let state = createDefaultCommandMappingState();
  state = applyCommandBindingPatch(state, 'toggle-cover', { gated: 'c' });

  const rows = listOverlayMappings(state, [], { vcModeActive: false });
  const cover = rows.find((row) => row.commandId === 'toggle-cover');
  assert.equal(cover?.available, false);
});

test('listOverlayMappings includes reserved Kudo gated keys', () => {
  const state = createDefaultCommandMappingState();
  state.reservedKudoKeys = ['gated:k'];
  state.kudoPresetByReservedKey = { 'gated:k': 'preset-a' };

  const rows = listOverlayMappings(state, [{ id: 'preset-a', name: 'Applause' }], { vcModeActive: true });
  const kudo = rows.find((row) => row.commandId === 'trigger-kudo-preset-a');
  assert.equal(kudo?.key, 'K');
  assert.equal(kudo?.label, 'Kudo: Applause');
});

test('listOverlayMappings shows TBD reserve gated keys as unavailable', () => {
  let state = createDefaultCommandMappingState();
  state = addCommandToConfiguredSet(state, RESERVE_KUDO_SLOT_TEMPLATE_ID);
  const slotId = state.configuredCommandIds.find((id) => id.startsWith('reserve-kudo-slot:'));
  assert.ok(slotId);
  state = applyCommandBindingPatch(state, slotId!, { gated: 'h' });
  state = syncReservedKudoKeysFromSlots(state);

  const rows = listOverlayMappings(state, [], { vcModeActive: true });
  const reserve = rows.find((row) => row.key === 'H');
  assert.equal(reserve?.label, 'Kudo (preset TBD)');
  assert.equal(reserve?.available, false);
});
