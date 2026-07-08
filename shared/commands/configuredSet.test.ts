import assert from 'node:assert/strict';
import test from 'node:test';

import { applyCommandBindingPatch } from './assignments';
import { createDefaultCommandMappingState } from './defaults';
import {
  addCommandToConfiguredSet,
  listAvailableKeysForSource,
  listUnassignedCatalogActions,
  removeCommandFromConfiguredSet,
} from './configuredSet';
import { listCatalogCommands } from './bindingPolicy';

test('removeCommandFromConfiguredSet drops action and bindings', () => {
  const state = createDefaultCommandMappingState();
  const next = removeCommandFromConfiguredSet(state, 'toggle-cover');
  assert.equal(next.configuredCommandIds.includes('toggle-cover'), false);
  assert.equal(next.commands['toggle-cover'], undefined);
});

test('addCommandToConfiguredSet adds Kudo preset row', () => {
  let state = createDefaultCommandMappingState();
  state = addCommandToConfiguredSet(state, 'trigger-kudo-applause');
  assert.equal(state.configuredKudoPresetIds.includes('applause'), true);
});

test('listUnassignedCatalogActions excludes configured builtins and kudos', () => {
  const state = createDefaultCommandMappingState();
  const catalog = listCatalogCommands([{ id: 'applause', name: 'Applause' }]);
  const unassigned = listUnassignedCatalogActions(state, catalog);
  assert.equal(
    unassigned.some((row) => row.id === 'toggle-cover'),
    false,
  );
  assert.equal(
    unassigned.some((row) => row.id === 'trigger-kudo-applause'),
    true,
  );
});

test('listAvailableKeysForSource excludes assigned gated keys', () => {
  let state = createDefaultCommandMappingState();
  state = applyCommandBindingPatch(state, 'toggle-cover', { gated: 'c' });
  const available = listAvailableKeysForSource(state, 'gated');
  assert.equal(available.includes('c'), false);
  assert.equal(available.includes('h'), true);
});
