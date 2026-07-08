import assert from 'node:assert/strict';
import { test } from 'node:test';

/** Same splice logic used by useKudoPresets.reorderPresets. */
function reorderPresets<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...items];
  const [row] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, row!);
  return next;
}

test('reorderPresets moves an item to a new index', () => {
  assert.deepEqual(reorderPresets(['a', 'b', 'c', 'd'], 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(reorderPresets(['a', 'b', 'c', 'd'], 3, 0), ['d', 'a', 'b', 'c']);
});
