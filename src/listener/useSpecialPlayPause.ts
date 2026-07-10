import { useCallback, useEffect, useState } from 'react';

import {
  isSpecialPlayStyleActive,
  specialPlayPauseSeconds,
  type VcSpecialPlayPauseState,
  type VcSpecialPlayStyleSettings,
} from '@shared/vcMode/specialPlayStyles';

type UseSpecialPlayPauseOptions = {
  onPlayNext: () => void;
};

/** Between-song pause state for VC special play styles. */
export function useSpecialPlayPause({ onPlayNext }: UseSpecialPlayPauseOptions) {
  const [specialPlayPause, setSpecialPlayPause] = useState<VcSpecialPlayPauseState | null>(null);

  useEffect(() => {
    if (!specialPlayPause?.active || specialPlayPause.endsAt == null) return;

    const endsAt = specialPlayPause.endsAt;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSpecialPlayPause((prev) => (prev ? { ...prev, secondsRemaining: remaining } : null));
      if (remaining <= 0) {
        setSpecialPlayPause(null);
        onPlayNext();
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 250);
    return () => window.clearInterval(intervalId);
  }, [onPlayNext, specialPlayPause?.active, specialPlayPause?.endsAt]);

  const beginPauseAfterSong = useCallback((style: VcSpecialPlayStyleSettings): boolean => {
    if (!isSpecialPlayStyleActive(style.style)) return false;

    const timedSeconds = specialPlayPauseSeconds(style.style);
    if (style.style === 'pause-end') {
      setSpecialPlayPause({ active: true, endsAt: null, secondsRemaining: null });
      return true;
    }

    if (timedSeconds != null) {
      setSpecialPlayPause({
        active: true,
        endsAt: Date.now() + timedSeconds * 1000,
        secondsRemaining: timedSeconds,
      });
      return true;
    }

    return false;
  }, []);

  const playNextAfterPause = useCallback(() => {
    setSpecialPlayPause(null);
    onPlayNext();
  }, [onPlayNext]);

  const clearPause = useCallback(() => setSpecialPlayPause(null), []);

  return {
    specialPlayPause,
    beginPauseAfterSong,
    playNextAfterPause,
    clearPause,
  };
}
