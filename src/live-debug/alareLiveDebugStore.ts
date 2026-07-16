/**
 * VC-window-only publish/subscribe for Live Debug section snapshots.
 * Main cannot see ALARE trim (it lives on the projection surface).
 */

import {
  EMPTY_ALARE_LIVE_DEBUG,
  type AlareLiveDebugSnapshot,
} from '@shared/liveDebug/alareSnapshot';

let alareSnapshot: AlareLiveDebugSnapshot = { ...EMPTY_ALARE_LIVE_DEBUG };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeAlareLiveDebug(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAlareLiveDebugSnapshot(): AlareLiveDebugSnapshot {
  return alareSnapshot;
}

/** Push or clear the ALARE debug section (call from VcAlareLyricsView). */
export function publishAlareLiveDebug(next: AlareLiveDebugSnapshot | null): void {
  alareSnapshot = next ? { ...next } : { ...EMPTY_ALARE_LIVE_DEBUG, updatedAt: Date.now() };
  emit();
}
