import { useCallback, useEffect, useRef, useState } from 'react';

import type { VcStatePayload } from '@shared/vcModeTypes';
import { shouldUseDirectAudioPlayback } from '../listener/directAudioPlayback';
import { MediaCoordinator } from '../audio/MediaCoordinator';
import { isPlaybackSourceReady } from '../audio/adapters/attachPlaybackSource';

import { getApp } from '../lib/bridge';

const SEEK_DRIFT_SECONDS = 0.4;

function isMirrorReady(audio: HTMLAudioElement, coordinator: MediaCoordinator, playbackUrl: string): boolean {
  const holder = coordinator.getHlsHolder();
  return shouldUseDirectAudioPlayback(playbackUrl)
    ? audio.readyState >= HTMLMediaElement.HAVE_METADATA
    : isPlaybackSourceReady(audio, playbackUrl, holder);
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
  const coordinatorRef = useRef<MediaCoordinator | null>(null);
  if (!coordinatorRef.current) {
    coordinatorRef.current = new MediaCoordinator();
  }
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
    const coordinator = coordinatorRef.current;
    return () => {
      coordinator?.invalidateLoads();
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
    const coordinator = coordinatorRef.current;
    if (!audio || !mirror?.playbackUrl || mirror.songId == null || !coordinator) {
      if (audio) {
        coordinator.teardownElement(audio);
      } else {
        coordinator.invalidateLoads();
      }
      loadedSongIdRef.current = null;
      loadedPlaybackUrlRef.current = null;
      audio?.pause();
      reportPlaybackStatus(null);
      return;
    }

    if (
      loadedSongIdRef.current === mirror.songId &&
      loadedPlaybackUrlRef.current === mirror.playbackUrl &&
      isMirrorReady(audio, coordinator, mirror.playbackUrl)
    ) {
      tryPlay(audio);
      return;
    }

    const generation = ++loadGenerationRef.current;
    const requestedSongId = mirror.songId;
    const requestedPlaybackUrl = mirror.playbackUrl;
    loadedSongIdRef.current = null;
    loadedPlaybackUrlRef.current = null;

    suppressMirrorEndedRef.current = true;
    coordinator.invalidateLoads();
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

    return coordinator.attach(audio, playbackUrl, {
      generation,
      isGenerationCurrent: (g) => g === loadGenerationRef.current,
      onReady: startPlayback,
      onError: () => reportPlaybackStatus(audio),
    });
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

  // Keep HTML volume in sync even before Effects Lab graph wiring runs.
  useEffect(() => {
    if (!audioEl) return;
    const next = state?.audioMirror?.volume;
    if (typeof next !== 'number' || !Number.isFinite(next)) return;
    // Web Audio (when FX attach) owns loudness via speakerGain — leave encode level high.
    if (audioEl.volume <= 0 && next > 0) {
      audioEl.volume = next;
    }
    audioEl.muted = false;
  }, [audioEl, state?.audioMirror?.volume]);

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
