import { useEffect, useState } from 'react';

import {
  createEmptyAnalyserBusState,
  registerAnalyserConsumer,
  scheduleAnalyserBusSync,
  updateAnalyserConsumer,
  type AnalyserBusState,
} from '../AnalyserBus';
import type { ButterchurnAudioSettings } from '../types';

type UseAudioAnalyserOptions = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  enabled: boolean;
  /** When omitted, uses a dedicated consumer id (prefer explicit ids for shared mirrors). */
  consumerId?: string;
};

type UseAudioAnalyserResult = AnalyserBusState;

/**
 * @deprecated Prefer `useAnalyserBus` with an explicit `consumerId` for shared mirror elements.
 * Wire AnalyserNode to the hidden mirror <audio> — never the audible playback element.
 */
export function useAudioAnalyser({
  audioRef,
  isPlaying,
  enabled,
  consumerId = 'audio-analyser',
}: UseAudioAnalyserOptions): UseAudioAnalyserResult {
  const [state, setState] = useState(createEmptyAnalyserBusState);

  useEffect(() => {
    return registerAnalyserConsumer(consumerId, {
      audioRef,
      isPlaying,
      enabled,
      onState: setState,
    });
  }, [audioRef, consumerId]);

  useEffect(() => {
    updateAnalyserConsumer(consumerId, { isPlaying, enabled });
    scheduleAnalyserBusSync();
  }, [consumerId, enabled, isPlaying]);

  return state;
}

export type { ButterchurnAudioSettings };
