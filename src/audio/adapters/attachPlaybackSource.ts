/**
 * Shared HLS.js / direct / native HLS attach logic used by MediaCoordinator.
 * Generation guards prevent stale load callbacks from racing track changes.
 *
 * @see documentation/audio-pipeline.md
 */
import Hls from 'hls.js';

import {
  loadDirectAudioPlayback,
  shouldUseDirectAudioPlayback,
} from '../../listener/directAudioPlayback';

export type AttachPlaybackSourceOptions = {
  playbackUrl: string;
  playbackScope?: string | null;
  generation: number;
  isGenerationCurrent: (generation: number) => boolean;
  onReady: () => void;
  onError: (detail?: string) => void;
};

/** Owns one hls.js instance for a media element — shared by main, mirror, and VC paths. */
export type HlsHolder = {
  get(): Hls | null;
  set(hls: Hls | null): void;
  destroy(): void;
};

export function createHlsHolder(): HlsHolder {
  let hls: Hls | null = null;
  return {
    get: () => hls,
    set: (next) => {
      hls = next;
    },
    destroy: () => {
      if (hls) {
        hls.destroy();
        hls = null;
      }
    },
  };
}

/** Whether a URL is already attached and decoded enough to resume playback. */
export function isPlaybackSourceReady(
  audio: HTMLAudioElement,
  playbackUrl: string,
  hlsHolder: HlsHolder,
  playbackScope?: string | null,
): boolean {
  return shouldUseDirectAudioPlayback(playbackUrl, playbackScope)
    ? audio.readyState > 0
    : hlsHolder.get() != null || audio.readyState > 0;
}

/**
 * Attach direct audio, hls.js, or native HLS to an element.
 * Stale generations are ignored so rapid track changes cannot fire duplicate callbacks.
 */
export function attachPlaybackSource(
  audio: HTMLAudioElement,
  options: AttachPlaybackSourceOptions,
  hlsHolder: HlsHolder,
): () => void {
  const { playbackUrl, playbackScope, generation, isGenerationCurrent, onReady, onError } =
    options;

  hlsHolder.destroy();
  audio.pause();

  const startPlayback = () => {
    if (!isGenerationCurrent(generation)) return;
    onReady();
  };

  if (shouldUseDirectAudioPlayback(playbackUrl, playbackScope)) {
    return loadDirectAudioPlayback(audio, playbackUrl, {
      onReady: startPlayback,
      onError: () => {
        if (!isGenerationCurrent(generation)) return;
        onError();
      },
    });
  }

  if (Hls.isSupported()) {
    const hls = new Hls({
      enableWorker: true,
      xhrSetup: (xhr) => {
        xhr.withCredentials = false;
      },
    });
    hlsHolder.set(hls);
    hls.loadSource(playbackUrl);
    hls.attachMedia(audio);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      if (!isGenerationCurrent(generation)) return;
      startPlayback();
    });
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!isGenerationCurrent(generation)) return;
      if (data.fatal) {
        hls.destroy();
        if (hlsHolder.get() === hls) hlsHolder.set(null);
        const detail = data.details ? `${data.type}: ${data.details}` : data.type;
        onError(detail);
      }
    });
    return () => {
      hls.destroy();
      if (hlsHolder.get() === hls) hlsHolder.set(null);
    };
  }

  if (audio.canPlayType('application/vnd.apple.mpegurl')) {
    audio.src = playbackUrl;
    const onLoaded = () => {
      if (!isGenerationCurrent(generation)) return;
      startPlayback();
    };
    const onErr = () => {
      if (!isGenerationCurrent(generation)) return;
      onError();
    };
    audio.addEventListener('loadedmetadata', onLoaded, { once: true });
    audio.addEventListener('error', onErr, { once: true });
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('error', onErr);
    };
  }

  if (isGenerationCurrent(generation)) {
    onError('HLS playback is not supported in this environment.');
  }
  return () => {};
}

/** Pause, detach src, and destroy any hls.js instance on the element. */
export function clearPlaybackSource(audio: HTMLAudioElement, hlsHolder: HlsHolder): void {
  hlsHolder.destroy();
  audio.pause();
  audio.removeAttribute('src');
}
