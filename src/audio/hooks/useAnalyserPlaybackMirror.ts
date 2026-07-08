import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

import { loadDirectAudioPlayback, shouldUseDirectAudioPlayback } from '../../listener/directAudioPlayback';
import { audioDebug } from '../debug/audioDebug';
import { getAudioGraphIfExists } from '../graph/registry';
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
  const hlsRef = useRef<Hls | null>(null);
  const loadGenerationRef = useRef(0);
  const loadedUrlRef = useRef<string | null>(null);

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
    if (!mirror) return;

    if (!enabled || !playbackUrl) {
      audioDebug.log('mirror', 'Mirror disabled — tearing down HLS', { enabled, playbackUrl: Boolean(playbackUrl) });
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      loadedUrlRef.current = null;
      loadGenerationRef.current += 1;
      mirror.pause();
      mirror.removeAttribute('src');
      mirror.load();
      return;
    }

    if (loadedUrlRef.current === playbackUrl) {
      const ready = shouldUseDirectAudioPlayback(playbackUrl)
        ? mirror.readyState > 0
        : hlsRef.current != null || mirror.readyState > 0;
      if (ready) return;
    }

    const generation = ++loadGenerationRef.current;
    loadedUrlRef.current = playbackUrl;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    mirror.pause();

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

    if (shouldUseDirectAudioPlayback(playbackUrl)) {
      const cleanup = loadDirectAudioPlayback(mirror, playbackUrl, {
        onReady: startPlayback,
        onError: () => {
          audioDebug.log('mirror', 'Mirror direct audio error', {}, 'error');
        },
      });
      return cleanup;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        },
      });
      hlsRef.current = hls;
      hls.loadSource(playbackUrl);
      hls.attachMedia(mirror);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (generation !== loadGenerationRef.current) return;
        audioDebug.log('mirror', 'Mirror manifest parsed');
        startPlayback();
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (generation !== loadGenerationRef.current) return;
        if (data.fatal) {
          audioDebug.log('mirror', 'Mirror HLS fatal error', { type: data.type, details: data.details }, 'error');
          hls.destroy();
          if (hlsRef.current === hls) hlsRef.current = null;
        }
      });
      return () => {
        if (generation !== loadGenerationRef.current) return;
      };
    }

    if (mirror.canPlayType('application/vnd.apple.mpegurl')) {
      mirror.src = playbackUrl;
      const onLoaded = () => {
        if (generation !== loadGenerationRef.current) return;
        startPlayback();
      };
      mirror.addEventListener('loadedmetadata', onLoaded, { once: true });
      return () => mirror.removeEventListener('loadedmetadata', onLoaded);
    }
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
