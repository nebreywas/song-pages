import assert from 'node:assert/strict';
import test from 'node:test';

import { applyCommandBindingPatch } from './assignments';
import { createDefaultCommandMappingState } from './defaults';
import {
  EXTENDED_FUNCTION_KEYS,
  extendedBindingToElectronAccelerator,
  formatExtendedBindingLabel,
  FUNCTION_KEYS,
  isExtendedFunctionKey,
  NAVIGATION_BINDING_KEYS,
  normalizeExtendedFunctionKey,
  SHIFT_FUNCTION_KEYS,
} from './extendedKeys';
import { formatReservedBindingLabel } from './labels';
import { resolveBindingToCommand } from './resolve';

test('FUNCTION_KEYS covers F1 through F24', () => {
  assert.equal(FUNCTION_KEYS.length, 24);
  assert.equal(FUNCTION_KEYS[0], 'F1');
  assert.equal(FUNCTION_KEYS[10], 'F11');
  assert.equal(FUNCTION_KEYS[23], 'F24');
});

test('SHIFT_FUNCTION_KEYS covers Shift+F1 through Shift+F24', () => {
  assert.equal(SHIFT_FUNCTION_KEYS.length, 24);
  assert.equal(SHIFT_FUNCTION_KEYS[0], 'Shift+F1');
  assert.equal(SHIFT_FUNCTION_KEYS[23], 'Shift+F24');
});

test('EXTENDED_FUNCTION_KEYS includes function, shift-function, and navigation keys', () => {
  assert.equal(EXTENDED_FUNCTION_KEYS.length, 55);
  assert.deepEqual([...NAVIGATION_BINDING_KEYS], [
    'PrintScreen',
    'ScrollLock',
    'Insert',
    'Home',
    'End',
    'PageUp',
    'PageDown',
  ]);
});

test('isExtendedFunctionKey accepts F1–F24 and Shift+F1–F24', () => {
  assert.equal(isExtendedFunctionKey('F1'), true);
  assert.equal(isExtendedFunctionKey('F11'), true);
  assert.equal(isExtendedFunctionKey('F14'), true);
  assert.equal(isExtendedFunctionKey('F24'), true);
  assert.equal(isExtendedFunctionKey('shift+f8'), true);
  assert.equal(isExtendedFunctionKey('Shift+F24'), true);
  assert.equal(isExtendedFunctionKey('PrintScreen'), true);
  assert.equal(isExtendedFunctionKey('F25'), false);
  assert.equal(isExtendedFunctionKey('Shift+F25'), false);
});

test('normalizeExtendedFunctionKey preserves Electron accelerator casing', () => {
  assert.equal(normalizeExtendedFunctionKey('f20'), 'F20');
  assert.equal(normalizeExtendedFunctionKey('shift+f3'), 'Shift+F3');
  assert.equal(normalizeExtendedFunctionKey('printscreen'), 'PrintScreen');
  assert.equal(normalizeExtendedFunctionKey('PgDn'), 'PageDown');
  assert.equal(normalizeExtendedFunctionKey('G1'), null);
});

test('extendedBindingToElectronAccelerator maps shift-function keys correctly', () => {
  assert.equal(extendedBindingToElectronAccelerator('F17'), 'F17');
  assert.equal(extendedBindingToElectronAccelerator('shift+f12'), 'Shift+F12');
  assert.equal(extendedBindingToElectronAccelerator('pgup'), 'PageUp');
});

test('formatExtendedBindingLabel renders friendly navigation labels', () => {
  assert.equal(formatExtendedBindingLabel('PageUp'), 'Page Up');
  assert.equal(formatExtendedBindingLabel('Shift+F5'), 'Shift+F5');
});

test('resolveBindingToCommand finds extended-function mappings', () => {
  let state = createDefaultCommandMappingState();
  state = applyCommandBindingPatch(state, 'toggle-cover', { extendedFunction: 'F17' });

  const resolved = resolveBindingToCommand(state, 'extended-function', 'F17');
  assert.equal(resolved?.commandId, 'toggle-cover');
  assert.equal(resolved?.binding, 'F17');
});

test('resolveBindingToCommand finds shift-function mappings', () => {
  let state = createDefaultCommandMappingState();
  state = applyCommandBindingPatch(state, 'toggle-host', { extendedFunction: 'Shift+F4' });

  const resolved = resolveBindingToCommand(state, 'extended-function', 'shift+f4');
  assert.equal(resolved?.commandId, 'toggle-host');
  assert.equal(resolved?.binding, 'Shift+F4');
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

test('formatReservedBindingLabel renders direct, gated, and hardware keys', () => {
  assert.equal(formatReservedBindingLabel('gated:c'), 'Gated C');
  assert.equal(formatReservedBindingLabel('extended-function:F17'), 'F17');
  assert.equal(formatReservedBindingLabel('extended-function:Shift+F2'), 'Shift+F2');
  assert.equal(formatReservedBindingLabel('extended-function:PageUp'), 'Page Up');
  assert.equal(formatReservedBindingLabel('direct:OCAW+c'), 'Direct OCAW+c');
});
