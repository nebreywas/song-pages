import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createDefaultCommandMappingState } from './defaults';
import { evaluateGateKey, isSafeDirectModifierChord, shouldCaptureGateKey } from './gate';

test('shouldCaptureGateKey accepts Escape and letters but ignores bare modifiers', () => {
  assert.equal(shouldCaptureGateKey('Escape'), true);
  assert.equal(shouldCaptureGateKey('l'), true);
  assert.equal(shouldCaptureGateKey('Shift'), false);
});

test('isSafeDirectModifierChord detects OCAW and CS families', () => {
  assert.equal(isSafeDirectModifierChord({ type: 'keyDown', key: 'g', alt: true, meta: true }), true);
  assert.equal(isSafeDirectModifierChord({ type: 'keyDown', key: 'l', control: true, shift: true }), true);
  assert.equal(isSafeDirectModifierChord({ type: 'keyDown', key: 'l', alt: false, meta: false }), false);
});

test('evaluateGateKey aborts on Escape while armed', () => {
  const state = createDefaultCommandMappingState();
  state.commands['toggle-cover'] = { gated: 'c' };

  const result = evaluateGateKey(state, true, { type: 'keyDown', key: 'Escape' });
  assert.deepEqual(result, { action: 'abort' });
});

test('evaluateGateKey dispatches a mapped gated key once', () => {
  const state = createDefaultCommandMappingState();
  state.commands['toggle-cover'] = { gated: 'c' };

  const result = evaluateGateKey(state, true, { type: 'keyDown', key: 'c' });
  assert.deepEqual(result, {
    action: 'dispatch',
    commandId: 'toggle-cover',
    binding: 'c',
  });
});

test('evaluateGateKey dispatches gated C while OCAW modifiers are still held', () => {
  const state = createDefaultCommandMappingState();
  state.commands['toggle-cover'] = { gated: 'c' };

  const result = evaluateGateKey(state, true, {
    type: 'keyDown',
    key: 'c',
    alt: true,
    meta: true,
  });
  assert.deepEqual(result, {
    action: 'dispatch',
    commandId: 'toggle-cover',
    binding: 'c',
  });
});

test('evaluateGateKey closes on unmapped keys', () => {
  const state = createDefaultCommandMappingState();
  const result = evaluateGateKey(state, true, { type: 'keyDown', key: 'z' });
  assert.deepEqual(result, { action: 'unmapped', key: 'z' });
});

test('evaluateGateKey ignores registered Safe Direct chords such as gate toggle', () => {
  const state = createDefaultCommandMappingState();
  const result = evaluateGateKey(state, true, {
    type: 'keyDown',
    key: 'g',
    alt: true,
    meta: true,
  });
  assert.deepEqual(result, { action: 'ignore' });
});

test('evaluateGateKey ignores input while gate is closed', () => {
  const state = createDefaultCommandMappingState();
  state.commands['toggle-cover'] = { gated: 'c' };
  const result = evaluateGateKey(state, false, { type: 'keyDown', key: 'c' });
  assert.deepEqual(result, { action: 'ignore' });
});

test('evaluateGateKey reports kudo-unassigned for reserved gated keys without preset', () => {
  const state = createDefaultCommandMappingState();
  state.reservedKudoKeys = ['gated:h'];
  state.kudoPresetByReservedKey = {};

  const result = evaluateGateKey(state, true, { type: 'keyDown', key: 'h' });
  assert.deepEqual(result, { action: 'kudo-unassigned', key: 'h' });
});
