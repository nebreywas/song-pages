import { useEffect, useRef } from 'react';

import { audioDebug } from '../debug/audioDebug';
import { getAudioGraphIfExists } from '../graph/registry';
import { MediaCoordinator } from '../MediaCoordinator';
import { mirrorCanPlay, tryPlayMirror } from './mirrorPlayback';

const SEEK_DRIFT_SECONDS = 0.4;

type UseAnalyserPlaybackMirrorOptions = {
  mainAudioRef: React.RefObject<HTMLAudioElement | null>;
  analyserAudioRef: React.RefObject<HTMLAudioElement | null>;
  playbackUrl: string | null;
  enabled: boolean;
};

/**
 * Feeds a hidden <audio> element from the same HLS stream as the main player.
 * Before Web Audio attaches, the mirror is HTML-muted to avoid double playback.
 * After createMediaElementSource, muted must be cleared (Chromium FFT quirk) — silence
 * comes from zero speakerGain on the graph, not muted/volume on the element.
 */
export function useAnalyserPlaybackMirror({
  mainAudioRef,
  analyserAudioRef,
  playbackUrl,
  enabled,
}: UseAnalyserPlaybackMirrorOptions): void {
  const coordinatorRef = useRef<MediaCoordinator | null>(null);
  if (!coordinatorRef.current) {
    coordinatorRef.current = new MediaCoordinator();
  }
  const loadGenerationRef = useRef(0);
  /** True after we've attached HLS/src so disable doesn't spam tear down/log every effect re-run. */
  const mirrorArmedRef = useRef(false);

  useEffect(() => {
    const mirror = analyserAudioRef.current;
    if (!mirror || !enabled) return;
    // Pre-graph only — once MediaElementSource exists, unmute via ensureMirrorElementFeedsGraph.
    if (!getAudioGraphIfExists(mirror)) {
      mirror.muted = true;
    }
  }, [analyserAudioRef, enabled, playbackUrl]);

  useEffect(() => {
    const mirror = analyserAudioRef.current;
    const coordinator = coordinatorRef.current;
    if (!mirror || !coordinator) return;

    if (!enabled || !playbackUrl) {
      if (mirrorArmedRef.current) {
        audioDebug.log('mirror', 'Mirror disabled — tearing down HLS', {
          enabled,
          playbackUrl: Boolean(playbackUrl),
        });
        coordinator.teardownElement(mirror);
        mirror.load();
        loadGenerationRef.current += 1;
        mirrorArmedRef.current = false;
      }
      return;
    }

    if (coordinator.isReady(mirror, playbackUrl)) {
      mirrorArmedRef.current = true;
      return;
    }

    const generation = ++loadGenerationRef.current;
    mirrorArmedRef.current = true;

    const startPlayback = () => {
      if (generation !== loadGenerationRef.current) return;
      const main = mainAudioRef.current;
      if (main && main.currentTime > 0) {
        mirror.currentTime = main.currentTime;
      }
      if (main && !main.paused) {
        void tryPlayMirror(mirror, 'mirror');
      }
    };

    audioDebug.log('mirror', 'Loading mirror audio', { playbackUrl: playbackUrl.slice(0, 80) });

    return coordinator.attach(mirror, playbackUrl, {
      generation,
      isGenerationCurrent: (g) => g === loadGenerationRef.current,
      onReady: startPlayback,
      onError: () => {
        audioDebug.log('mirror', 'Mirror direct audio error', {}, 'error');
      },
    });
  }, [analyserAudioRef, enabled, mainAudioRef, playbackUrl]);

  useEffect(() => {
    if (!enabled || !playbackUrl) return;

    const main = mainAudioRef.current;
    const mirror = analyserAudioRef.current;
    if (!main || !mirror) return;

    const syncFromMain = () => {
      if (main.paused) {
        if (!mirror.paused) {
          audioDebug.log('mirror', 'Pausing mirror (main paused)');
          mirror.pause();
        }
        return;
      }
      if (mirror.paused && mirrorCanPlay(mirror)) {
        audioDebug.log('mirror', 'Resuming mirror (main playing)');
        void tryPlayMirror(mirror, 'mirror');
      }
      const drift = Math.abs(mirror.currentTime - main.currentTime);
      if (drift > SEEK_DRIFT_SECONDS) {
        mirror.currentTime = main.currentTime;
      }
    };

    main.addEventListener('play', syncFromMain);
    main.addEventListener('pause', syncFromMain);
    main.addEventListener('seeking', syncFromMain);
    main.addEventListener('seeked', syncFromMain);
    const intervalId = window.setInterval(syncFromMain, 400);
    syncFromMain();

    return () => {
      main.removeEventListener('play', syncFromMain);
      main.removeEventListener('pause', syncFromMain);
      main.removeEventListener('seeking', syncFromMain);
      main.removeEventListener('seeked', syncFromMain);
      window.clearInterval(intervalId);
    };
  }, [analyserAudioRef, enabled, mainAudioRef, playbackUrl]);
}
