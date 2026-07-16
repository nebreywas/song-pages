import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

import {
  createEmptyAnalyserBusState,
  registerAnalyserConsumer,
  scheduleAnalyserBusSync,
  updateAnalyserConsumer,
  type AnalyserBusState,
} from '../AnalyserBus';

type UseAnalyserBusOptions = {
  /** Stable id — visualizer and VC manager share one bus via distinct consumer ids. */
  consumerId: string;
  audioRef: RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  enabled: boolean;
};

/**
 * Subscribe to the shared analyser bus for the hidden mirror `<audio>`.
 * Only one Web Audio graph is created per element regardless of consumer count.
 */
export function useAnalyserBus({
  consumerId,
  audioRef,
  isPlaying,
  enabled,
}: UseAnalyserBusOptions): AnalyserBusState {
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
