import { useCallback, useEffect, useRef } from 'react';

import type { VcStatePayload } from '@shared/vcModeTypes';

import { SoundcloudPlayer, type SoundcloudPlayerHandle } from '../listener/soundcloud/SoundcloudPlayer';
import { sendVcTransport } from './useVcTransport';

const SEEK_DRIFT_SECONDS = 0.4;
const TIMING_REPORT_INTERVAL_MS = 250;

type VcSoundcloudPlayerProps = {
  permalink: string;
  songId: number;
  playback: VcStatePayload['playback'];
  mirrorSongId: number | null;
};

/**
 * SoundCloud widget for the VC visualizer slot — uses SoundCloud's built-in waveform
 * visual because iframe audio cannot feed the Web Audio analyser graph.
 */
export function VcSoundcloudPlayer({
  permalink,
  songId,
  playback,
  mirrorSongId,
}: VcSoundcloudPlayerProps) {
  const playerRef = useRef<SoundcloudPlayerHandle | null>(null);
  const shouldPlayRef = useRef(false);
  const isActiveTrack = mirrorSongId === songId;
  const shouldPlay = isActiveTrack && playback.isPlaying;

  shouldPlayRef.current = shouldPlay;

  const tryStartPlayback = useCallback(() => {
    if (!shouldPlayRef.current) return;
    playerRef.current?.play();
    window.setTimeout(() => {
      if (shouldPlayRef.current) playerRef.current?.play();
    }, 0);
  }, []);

  useEffect(() => {
    if (!isActiveTrack || !playback.isPlaying) return;
    const player = playerRef.current;
    if (!player) return;
    const current = player.getCurrentTime();
    if (!Number.isFinite(current)) return;
    const drift = Math.abs(current - playback.currentTime);
    if (drift > SEEK_DRIFT_SECONDS) {
      player.seek(playback.currentTime);
    }
  }, [isActiveTrack, playback.currentTime, playback.isPlaying]);

  useEffect(() => {
    if (!isActiveTrack || !playback.isPlaying) return;
    tryStartPlayback();
  }, [isActiveTrack, playback.isPlaying, tryStartPlayback, permalink]);

  useEffect(() => {
    if (!isActiveTrack) return;

    const tick = () => {
      const player = playerRef.current;
      if (!player) return;
      const currentTime = player.getCurrentTime();
      const duration = player.getDuration();
      if (!Number.isFinite(currentTime)) return;
      sendVcTransport({
        type: 'soundcloudTiming',
        currentTime,
        duration: Number.isFinite(duration) && duration > 0 ? duration : playback.duration,
      });
    };

    tick();
    const intervalId = window.setInterval(tick, TIMING_REPORT_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [isActiveTrack, playback.duration, permalink]);

  return (
    <div className="vc-soundcloud-player">
      <SoundcloudPlayer
        ref={playerRef}
        permalink={permalink}
        playbackGeneration={songId}
        shouldPlay={shouldPlay}
        visual
        onReady={tryStartPlayback}
        onEnded={() => sendVcTransport({ type: 'soundcloudEnded' })}
        onDuration={(seconds) => {
          if (seconds > 0) sendVcTransport({ type: 'soundcloudDuration', seconds });
        }}
      />
    </div>
  );
}
