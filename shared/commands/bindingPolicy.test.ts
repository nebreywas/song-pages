import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canClearBindingLayer,
  canReassignConfiguredCommand,
  canRemoveCommandFromConfig,
  isBindingLayerLocked,
  listRequiredBuiltinCommandIds,
} from './bindingPolicy';
import { createDefaultCommandMappingState } from './defaults';
import { pruneConfiguredState, removeCommandFromConfiguredSet } from './configuredSet';

test('toggle-vc-command-gate is required and direct binding is locked', () => {
  assert.equal(listRequiredBuiltinCommandIds().includes('toggle-vc-command-gate'), true);
  assert.equal(canRemoveCommandFromConfig('toggle-vc-command-gate'), false);
  assert.equal(canReassignConfiguredCommand('toggle-vc-command-gate'), false);
  assert.equal(isBindingLayerLocked('toggle-vc-command-gate', 'direct'), true);
  assert.equal(
    canClearBindingLayer('toggle-vc-command-gate', 'direct', { direct: 'OCAW+g' }),
    false,
  );
});

test('pruneConfiguredState restores locked gate toggle direct binding', () => {
  let state = createDefaultCommandMappingState();
  state = removeCommandFromConfiguredSet(state, 'toggle-vc-command-gate');
  state.commands['toggle-vc-command-gate'] = {};

  const pruned = pruneConfiguredState(state);
  assert.equal(pruned.configuredCommandIds.includes('toggle-vc-command-gate'), true);
  assert.equal(pruned.commands['toggle-vc-command-gate']?.direct, 'OCAW+g');
});
