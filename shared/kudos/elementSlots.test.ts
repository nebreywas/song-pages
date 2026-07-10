import assert from 'node:assert/strict';
import { test } from 'node:test';

import { compactElementSlotIndex, clearCompactElementSlot, setCompactElementSlot } from './elementSlots';

test('clearCompactElementSlot removes a filled slot and compacts', () => {
  assert.deepEqual(clearCompactElementSlot(['a', 'b', 'c'], 1), ['a', 'c']);
  assert.deepEqual(clearCompactElementSlot(['a'], 0), []);
  assert.deepEqual(clearCompactElementSlot(['a', 'b'], 3), ['a', 'b']);
});

test('compactElementSlotIndex edits filled slots in place', () => {
  assert.equal(compactElementSlotIndex(0, 2), 0);
  assert.equal(compactElementSlotIndex(1, 2), 1);
});

test('compactElementSlotIndex compacts inserts past the filled run', () => {
  assert.equal(compactElementSlotIndex(2, 1), 1);
  assert.equal(compactElementSlotIndex(3, 1), 1);
  assert.equal(compactElementSlotIndex(3, 0), 0);
});

test('setCompactElementSlot appends and replaces compactly', () => {
  assert.deepEqual(setCompactElementSlot(['a'], 3, 'b', 4), ['a', 'b']);
  assert.deepEqual(setCompactElementSlot(['a', 'b'], 0, 'x', 4), ['x', 'b']);
  assert.deepEqual(setCompactElementSlot([], 2, 'z', 4), ['z']);
});
