import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

import type { VcStatePayload } from '@shared/vcModeTypes';
import { shouldUseDirectAudioPlayback, loadDirectAudioPlayback } from '../listener/directAudioPlayback';

import { getApp } from '../lib/bridge';

const SEEK_DRIFT_SECONDS = 0.4;

function isMirrorReady(audio: HTMLAudioElement, hls: Hls | null, directAudio: boolean): boolean {
  return directAudio ? audio.readyState >= HTMLMediaElement.HAVE_METADATA : hls != null || audio.readyState >= HTMLMediaElement.HAVE_METADATA;
}

/** Main listener owns queue advance — mirror must not loop after a natural `ended`. */
function canMirrorResume(audio: HTMLAudioElement, isPlaying: boolean): boolean {
  if (!isPlaying || !audio.paused) return false;
  if (audio.ended) return false;
  return true;
}

/**
 * Mirror HLS playback into the VC Electron window so Discord/Twitch/Zoom window
 * capture includes music. The main listener window stays the timing source via IPC.
 */
export function useVcPlaybackAudio(state: VcStatePayload | null) {
  const hlsRef = useRef<Hls | null>(null);
  const loadGenerationRef = useRef(0);
  const loadedSongIdRef = useRef<number | null>(null);
  const loadedPlaybackUrlRef = useRef<string | null>(null);
  const playbackRef = useRef({ currentTime: 0, isPlaying: false, songId: null as number | null });
  const suppressMirrorEndedRef = useRef(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  const audioRef = useCallback((node: HTMLAudioElement | null) => {
    setAudioEl(node);
  }, []);

  const reportPlaybackStatus = useCallback((audio: HTMLAudioElement | null) => {
    const app = getApp();
    if (!app?.vc?.sendPlaybackStatus) return;
    const active = Boolean(audio && !audio.paused && !audio.ended && audio.readyState > 0);
    app.vc.sendPlaybackStatus({ active });
  }, []);

  useEffect(() => {
    if (!state) return;
    playbackRef.current = {
      currentTime: state.playback.currentTime,
      isPlaying: state.playback.isPlaying,
      songId: state.audioMirror?.songId ?? null,
    };
  }, [state?.playback.currentTime, state?.playback.isPlaying, state?.audioMirror?.songId]);

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      reportPlaybackStatus(null);
    };
  }, [reportPlaybackStatus]);

  const tryPlay = useCallback(
    (audio: HTMLAudioElement) => {
      const timing = playbackRef.current;
      if (!canMirrorResume(audio, timing.isPlaying)) return;
      void audio.play().then(() => reportPlaybackStatus(audio)).catch(() => {
        reportPlaybackStatus(audio);
      });
    },
    [reportPlaybackStatus],
  );

  useEffect(() => {
    const audio = audioEl;
    const mirror = state?.audioMirror;
    if (!audio || !mirror?.playbackUrl || mirror.songId == null) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      loadedSongIdRef.current = null;
      loadedPlaybackUrlRef.current = null;
      audio?.pause();
      if (audio) audio.removeAttribute('src');
      reportPlaybackStatus(null);
      return;
    }

    if (
      loadedSongIdRef.current === mirror.songId &&
      loadedPlaybackUrlRef.current === mirror.playbackUrl &&
      isMirrorReady(audio, hlsRef.current, shouldUseDirectAudioPlayback(mirror.playbackUrl))
    ) {
      tryPlay(audio);
      return;
    }

    const generation = ++loadGenerationRef.current;
    const requestedSongId = mirror.songId;
    const requestedPlaybackUrl = mirror.playbackUrl;
    loadedSongIdRef.current = null;
    loadedPlaybackUrlRef.current = null;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    suppressMirrorEndedRef.current = true;
    audio.pause();
    reportPlaybackStatus(audio);

    const playbackUrl = requestedPlaybackUrl;
    const startPlayback = () => {
      if (generation !== loadGenerationRef.current) return;
      loadedSongIdRef.current = requestedSongId;
      loadedPlaybackUrlRef.current = requestedPlaybackUrl;
      suppressMirrorEndedRef.current = false;
      // Fresh source load — always start at 0; drift sync catches up for mid-track VC attach.
      audio.currentTime = 0;
      tryPlay(audio);
    };

    if (shouldUseDirectAudioPlayback(playbackUrl)) {
      const cleanup = loadDirectAudioPlayback(audio, playbackUrl, {
        onReady: startPlayback,
        onError: () => reportPlaybackStatus(audio),
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
      hls.attachMedia(audio);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (generation !== loadGenerationRef.current) return;
        startPlayback();
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (generation !== loadGenerationRef.current) return;
        if (data.fatal) {
          console.warn('[VC mirror] HLS fatal error', data.type, data.details);
          hls.destroy();
          if (hlsRef.current === hls) hlsRef.current = null;
          reportPlaybackStatus(audio);
        }
      });
      return;
    }

    if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = playbackUrl;
      const onLoaded = () => {
        if (generation !== loadGenerationRef.current) return;
        startPlayback();
      };
      audio.addEventListener('loadedmetadata', onLoaded, { once: true });
      return () => audio.removeEventListener('loadedmetadata', onLoaded);
    }
  }, [
    audioEl,
    state?.audioMirror?.playbackUrl,
    state?.audioMirror?.songId,
    tryPlay,
    reportPlaybackStatus,
  ]);

  useEffect(() => {
    if (!audioEl || !state?.audioMirror.playbackUrl) return;

    const timing = playbackRef.current;
    if (timing.isPlaying && canMirrorResume(audioEl, timing.isPlaying)) {
      tryPlay(audioEl);
      return;
    }
    if (!timing.isPlaying && !audioEl.paused) {
      audioEl.pause();
      reportPlaybackStatus(audioEl);
    }
  }, [
    audioEl,
    state?.audioMirror?.playbackUrl,
    state?.audioMirror?.songId,
    state?.playback.isPlaying,
    tryPlay,
    reportPlaybackStatus,
  ]);

  useEffect(() => {
    if (!audioEl || !state?.audioMirror?.playbackUrl || !state.playback.isPlaying) return;
    if (audioEl.ended || suppressMirrorEndedRef.current) return;
    if (loadedSongIdRef.current !== state.audioMirror.songId) return;
    if (loadedPlaybackUrlRef.current !== state.audioMirror.playbackUrl) return;

    const drift = Math.abs(audioEl.currentTime - state.playback.currentTime);
    if (drift > SEEK_DRIFT_SECONDS) {
      audioEl.currentTime = state.playback.currentTime;
    }
  }, [
    audioEl,
    state?.audioMirror?.playbackUrl,
    state?.audioMirror?.songId,
    state?.playback.currentTime,
    state?.playback.isPlaying,
  ]);

  useEffect(() => {
    if (!audioEl) return;

    const notify = () => reportPlaybackStatus(audioEl);
    audioEl.addEventListener('play', notify);
    audioEl.addEventListener('pause', notify);
    audioEl.addEventListener('ended', notify);
    notify();

    return () => {
      audioEl.removeEventListener('play', notify);
      audioEl.removeEventListener('pause', notify);
      audioEl.removeEventListener('ended', notify);
    };
  }, [audioEl, reportPlaybackStatus]);

  return { audioRef, audioEl };
}
