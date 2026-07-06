import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

import type { VcStatePayload } from '@shared/vcModeTypes';

import { getApp } from '../lib/bridge';

const SEEK_DRIFT_SECONDS = 0.4;

function isMirrorReady(audio: HTMLAudioElement, hls: Hls | null): boolean {
  return hls != null || audio.readyState >= HTMLMediaElement.HAVE_METADATA;
}

/**
 * Mirror HLS playback into the VC Electron window so Discord/Twitch/Zoom window
 * capture includes music. The main listener window stays the timing source via IPC.
 */
export function useVcPlaybackAudio(state: VcStatePayload | null) {
  const hlsRef = useRef<Hls | null>(null);
  const loadGenerationRef = useRef(0);
  const loadedSongIdRef = useRef<number | null>(null);
  const playbackRef = useRef({ currentTime: 0, isPlaying: false });
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
    };
  }, [state?.playback.currentTime, state?.playback.isPlaying]);

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
      if (!playbackRef.current.isPlaying || !audio.paused) return;
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
      audio?.pause();
      if (audio) audio.removeAttribute('src');
      reportPlaybackStatus(null);
      return;
    }

    if (loadedSongIdRef.current === mirror.songId && isMirrorReady(audio, hlsRef.current)) {
      tryPlay(audio);
      return;
    }

    const generation = ++loadGenerationRef.current;
    loadedSongIdRef.current = mirror.songId;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    audio.pause();
    reportPlaybackStatus(audio);

    const playbackUrl = mirror.playbackUrl;
    const startPlayback = () => {
      if (generation !== loadGenerationRef.current) return;
      const timing = playbackRef.current;
      if (timing.currentTime > 0) {
        audio.currentTime = timing.currentTime;
      }
      tryPlay(audio);
    };

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
    if (!audioEl || !state) return;
    audioEl.volume = state.audioMirror.volume;
  }, [audioEl, state?.audioMirror.volume, state]);

  useEffect(() => {
    if (!audioEl || !state?.audioMirror.playbackUrl) return;

    if (state.playback.isPlaying && audioEl.paused) {
      tryPlay(audioEl);
      return;
    }
    if (!state.playback.isPlaying && !audioEl.paused) {
      audioEl.pause();
      reportPlaybackStatus(audioEl);
    }
  }, [audioEl, state?.audioMirror.playbackUrl, state?.playback.isPlaying, tryPlay, reportPlaybackStatus]);

  useEffect(() => {
    if (!audioEl || !state?.audioMirror.playbackUrl || !state.playback.isPlaying) return;

    const drift = Math.abs(audioEl.currentTime - state.playback.currentTime);
    if (drift > SEEK_DRIFT_SECONDS) {
      audioEl.currentTime = state.playback.currentTime;
    }
  }, [audioEl, state?.audioMirror?.playbackUrl, state?.playback.currentTime, state?.playback.isPlaying]);

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

  return audioRef;
}
