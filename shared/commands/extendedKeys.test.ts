import assert from 'node:assert/strict';
import test from 'node:test';

import { applyCommandBindingPatch } from './assignments';
import { createDefaultCommandMappingState } from './defaults';
import { EXTENDED_FUNCTION_KEYS, isExtendedFunctionKey, normalizeExtendedFunctionKey } from './extendedKeys';
import { formatReservedBindingLabel } from './labels';
import { resolveBindingToCommand } from './resolve';

test('EXTENDED_FUNCTION_KEYS covers F13 through F24', () => {
  assert.equal(EXTENDED_FUNCTION_KEYS.length, 12);
  assert.equal(EXTENDED_FUNCTION_KEYS[0], 'F13');
  assert.equal(EXTENDED_FUNCTION_KEYS[11], 'F24');
});

test('isExtendedFunctionKey accepts F13–F24 only', () => {
  assert.equal(isExtendedFunctionKey('F17'), true);
  assert.equal(isExtendedFunctionKey('f17'), true);
  assert.equal(isExtendedFunctionKey('F12'), false);
  assert.equal(isExtendedFunctionKey('F25'), false);
});

test('normalizeExtendedFunctionKey uppercases valid keys', () => {
  assert.equal(normalizeExtendedFunctionKey('f20'), 'F20');
  assert.equal(normalizeExtendedFunctionKey('F20'), 'F20');
  assert.equal(normalizeExtendedFunctionKey('G1'), null);
});

test('resolveBindingToCommand finds extended-function mappings', () => {
  let state = createDefaultCommandMappingState();
  state = applyCommandBindingPatch(state, 'toggle-cover', { extendedFunction: 'F17' });

  const resolved = resolveBindingToCommand(state, 'extended-function', 'F17');
  assert.equal(resolved?.commandId, 'toggle-cover');
  assert.equal(resolved?.binding, 'F17');
});

test('applyCommandBindingPatch clears extended-function duplicates', () => {
  let state = createDefaultCommandMappingState();
  state = applyCommandBindingPatch(state, 'toggle-cover', { extendedFunction: 'F17' });
  state = applyCommandBindingPatch(state, 'toggle-host', { extendedFunction: 'F17' });

  assert.equal(state.commands['toggle-cover']?.extendedFunction, undefined);
  assert.equal(state.commands['toggle-host']?.extendedFunction, 'F17');
});

test('clearing extended-function removes matching Kudo reservation', () => {
  let state = createDefaultCommandMappingState();
  state = applyCommandBindingPatch(state, 'toggle-cover', { extendedFunction: 'F17' });
  state = {
    ...state,
    reservedKudoKeys: ['extended-function:F17'],
    kudoPresetByReservedKey: { 'extended-function:F17': 'preset-a' },
  };

  state = applyCommandBindingPatch(state, 'toggle-cover', { extendedFunction: undefined });
  assert.equal(state.commands['toggle-cover']?.extendedFunction, undefined);
  assert.equal(state.reservedKudoKeys.includes('extended-function:F17'), false);
  assert.equal(state.kudoPresetByReservedKey['extended-function:F17'], undefined);
});

test('formatReservedBindingLabel renders direct, gated, and F-keys', () => {
  assert.equal(formatReservedBindingLabel('gated:c'), 'Gated C');
  assert.equal(formatReservedBindingLabel('extended-function:F17'), 'F17');
  assert.equal(formatReservedBindingLabel('direct:OCAW+c'), 'Direct OCAW+c');
});
