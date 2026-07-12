import type { SoundcloudDiscardedContext } from './canonicalize.ts';

/** Optional non-error notice when canonicalization stripped URL context. */
export function buildSoundcloudIntakeToastMessage(
  discarded: SoundcloudDiscardedContext,
): string | null {
  if (discarded.notes.length === 0) return null;
  return `Added track — removed from pasted URL: ${discarded.notes.join('; ')}.`;
}
