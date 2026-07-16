import type { PlaybackSnapshot } from '@shared/playback';
import type { VcSpecialPlayPauseState } from '@shared/vcModeTypes';

/**
 * VC between-song pause UI is driven by session phase; countdown fields come from the hook.
 */
export function projectSpecialPlayPauseForVc(
  snapshot: Pick<PlaybackSnapshot, 'playbackPhase'>,
  countdown: VcSpecialPlayPauseState | null,
): VcSpecialPlayPauseState | null {
  if (snapshot.playbackPhase !== 'waiting-for-host') return null;
  if (countdown?.active) return countdown;
  return { active: true, endsAt: null, secondsRemaining: null };
}
