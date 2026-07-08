import assert from 'node:assert/strict';
import test from 'node:test';

import { applyCommandBindingPatch } from './assignments';
import { addCommandToConfiguredSet } from './configuredSet';
import { createDefaultCommandMappingState } from './defaults';
import { listCatalogCommands } from './bindingPolicy';
import {
  RESERVE_KUDO_SLOT_TEMPLATE_ID,
  migrateOrphanReservedKeysToSlots,
  syncReservedKudoKeysFromSlots,
} from './kudoReserve';
import { listUnassignedCatalogActions } from './configuredSet';

test('adding reserve template creates slot row and syncs reserved keys', () => {
  let state = createDefaultCommandMappingState();
  state = addCommandToConfiguredSet(state, RESERVE_KUDO_SLOT_TEMPLATE_ID);
  const slotId = state.configuredCommandIds.find((id) => id.startsWith('reserve-kudo-slot:'));
  assert.ok(slotId);

  state = applyCommandBindingPatch(state, slotId!, { gated: 'h' });
  state = syncReservedKudoKeysFromSlots(state);
  assert.equal(state.reservedKudoKeys.includes('gated:h'), true);
});

test('reserve template stays in unassigned catalog for repeat adds', () => {
  const state = createDefaultCommandMappingState();
  const catalog = listCatalogCommands([]);
  const unassigned = listUnassignedCatalogActions(state, catalog);
  assert.equal(
    unassigned.some((row) => row.id === RESERVE_KUDO_SLOT_TEMPLATE_ID),
    true,
  );
});

test('migrateOrphanReservedKeysToSlots materializes placeholder rows', () => {
  const state = createDefaultCommandMappingState();
  state.reservedKudoKeys = ['gated:j'];
  state.kudoPresetByReservedKey = {};

  const migrated = migrateOrphanReservedKeysToSlots(state);
  assert.equal(migrated.reservedKudoKeys.includes('gated:j'), true);
  const slotId = migrated.configuredCommandIds.find((id) => id.startsWith('reserve-kudo-slot:'));
  assert.ok(slotId);
  assert.equal(migrated.commands[slotId!]?.gated, 'j');
});
