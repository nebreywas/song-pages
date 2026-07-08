import Hls from 'hls.js';
import type { SongRow } from '../types/app';
import { shouldUseDirectAudioPlayback } from './directAudioPlayback';

/**
 * Load HLS metadata in a throwaway audio element to learn track length
 * without interrupting the main player.
 */
export function probeSongDurationSeconds(playbackUrl: string): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';

    let hls: Hls | null = null;
    let settled = false;

    const finish = (seconds: number | null) => {
      if (settled) return;
      settled = true;
      if (hls) {
        hls.destroy();
        hls = null;
      }
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      resolve(seconds);
    };

    const readDuration = () => {
      const seconds = audio.duration;
      if (Number.isFinite(seconds) && seconds > 0) {
        finish(Math.round(seconds));
      }
    };

    const fail = () => finish(null);

    audio.addEventListener('loadedmetadata', readDuration, { once: true });
    audio.addEventListener('durationchange', readDuration);
    audio.addEventListener('error', fail, { once: true });

    window.setTimeout(fail, 15000);

    if (shouldUseDirectAudioPlayback(playbackUrl)) {
      audio.src = playbackUrl;
    } else if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(playbackUrl);
      hls.attachMedia(audio);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) fail();
      });
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = playbackUrl;
    } else {
      finish(null);
    }
  });
}

export function songNeedsDurationProbe(song: SongRow, runtimeSeconds: number | undefined): boolean {
  if (song.duration_seconds != null && song.duration_seconds > 0) return false;
  if (runtimeSeconds != null && runtimeSeconds > 0) return false;
  return true;
}
