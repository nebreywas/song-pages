import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applyCommandBindingPatch,
  detectBindingAssignmentConflicts,
  normalizeUniqueBindings,
} from './assignments';
import { createDefaultCommandMappingState } from './defaults';
import { migrateCommandMappingState, sanitizeCommandMappingStateForSave } from './migrate';
import { resolveBindingToCommand } from './resolve';

test('migrateCommandMappingState remaps toggle-host from OCAW+H to OCAW+F', () => {
  const state = migrateCommandMappingState({
    version: 2,
    configuredCommandIds: ['toggle-host'],
    configuredKudoPresetIds: [],
    commands: {
      'toggle-host': { direct: 'OCAW+h' },
    },
    reservedKudoKeys: [],
    kudoPresetByReservedKey: {},
    kudoPresetBindings: {},
  });
  assert.equal(state.commands['toggle-host']?.direct, 'OCAW+f');
});

test('migrateCommandMappingState seeds defaults when empty', () => {
  const state = migrateCommandMappingState(null);
  assert.equal(state.commands['toggle-vc-command-gate']?.direct, 'OCAW+g');
  assert.equal(state.commands['toggle-layout-mode']?.direct, 'OCAW+l');
  assert.equal(state.commands['toggle-host']?.direct, 'OCAW+f');
});

test('resolveBindingToCommand finds direct legacy mapping', () => {
  const state = createDefaultCommandMappingState();
  const resolved = resolveBindingToCommand(state, 'direct', 'OCAW+c');
  assert.equal(resolved?.commandId, 'toggle-cover');
});

test('detectBindingAssignmentConflicts finds occupied Safe Direct binding', () => {
  const state = createDefaultCommandMappingState();
  const conflicts = detectBindingAssignmentConflicts(state, 'toggle-host', { direct: 'OCAW+c' });
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0]?.existingCommandId, 'toggle-cover');
});

test('applyCommandBindingPatch reassigns Safe Direct binding without duplicates', () => {
  const state = createDefaultCommandMappingState();
  const next = applyCommandBindingPatch(state, 'toggle-host', { direct: 'OCAW+c' });

  assert.equal(next.commands['toggle-host']?.direct, 'OCAW+c');
  assert.equal(next.commands['toggle-cover']?.direct, undefined);
  assert.equal(resolveBindingToCommand(next, 'direct', 'OCAW+c')?.commandId, 'toggle-host');
});

test('normalizeUniqueBindings drops bindings outside the Safe Direct pool', () => {
  const state = createDefaultCommandMappingState();
  state.commands['toggle-host'] = { direct: 'OCAW+not-a-real-binding' };

  const next = normalizeUniqueBindings(state);
  assert.equal(next.commands['toggle-host']?.direct, undefined);
});

test('normalizeUniqueBindings keeps first owner when duplicates exist', () => {
  const state = createDefaultCommandMappingState();
  state.commands['toggle-host'] = { direct: 'OCAW+c' };

  const next = normalizeUniqueBindings(state);
  assert.equal(next.commands['toggle-cover']?.direct, 'OCAW+c');
  assert.equal(next.commands['toggle-host']?.direct, undefined);
});

test('sanitize + migrate roundtrip keeps gated cover binding', () => {
  let state = createDefaultCommandMappingState();
  state = applyCommandBindingPatch(state, 'toggle-cover', { gated: 'c' });

  const saved = sanitizeCommandMappingStateForSave(state);
  assert.equal(saved.commands['toggle-cover']?.gated, 'c');
  assert.equal(saved.commands['toggle-cover']?.direct, 'OCAW+c');

  const reloaded = migrateCommandMappingState(saved);
  assert.equal(reloaded.commands['toggle-cover']?.gated, 'c');
  assert.equal(reloaded.commands['toggle-cover']?.direct, 'OCAW+c');
});
