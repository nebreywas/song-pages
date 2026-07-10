import type { VcStatePayload } from '@shared/vcModeTypes';

/** Red on-white countdown badge for timed special play-style pauses. */
export function VcSpecialPlayCountdown({ state }: { state: VcStatePayload }) {
  const pause = state.specialPlayPause;
  const settings = state.config.specialPlayStyle;
  if (!pause?.active || !settings.showCountdownOnSurface) return null;

  const label =
    pause.secondsRemaining != null ? String(pause.secondsRemaining) : 'Pause';

  return (
    <div className="vc-special-play-countdown" aria-live="polite">
      {label}
    </div>
  );
}
