import type { RepeatMode } from '../detours/state';

/** Cycle repeat mode: off → all → one → off. */
export function cycleRepeatMode(mode: RepeatMode): RepeatMode {
  if (mode === 'off') return 'all';
  if (mode === 'all') return 'one';
  return 'off';
}
