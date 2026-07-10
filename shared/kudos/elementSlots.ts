/**
 * Map a clicked slot index to the compact storage index.
 * Filled values stay left-aligned with no gaps; clicking box 3 when only one
 * value exists inserts at index 1 (box 2), not index 2.
 */
export function compactElementSlotIndex(clickIndex: number, filledCount: number): number {
  return Math.min(clickIndex, filledCount);
}

/** Insert or replace a value in a compact left-aligned slot list. */
export function setCompactElementSlot<T>(values: T[], clickIndex: number, nextValue: T, maxSlots: number): T[] {
  const targetIndex = compactElementSlotIndex(clickIndex, values.length);
  const next = [...values];
  if (targetIndex < next.length) {
    next[targetIndex] = nextValue;
  } else {
    next.push(nextValue);
  }
  return next.slice(0, maxSlots);
}

/** Remove the slot at clickIndex and shift later values left. */
export function clearCompactElementSlot<T>(values: T[], clickIndex: number): T[] {
  const targetIndex = compactElementSlotIndex(clickIndex, values.length);
  if (targetIndex >= values.length) return values;
  return values.filter((_, index) => index !== targetIndex);
}
