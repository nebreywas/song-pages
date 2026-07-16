import { useCallback, useEffect, useRef } from 'react';

import type { VcStatePayload } from '@shared/vcModeTypes';

import { YoutubePlayer, type YoutubePlayerHandle } from '../listener/youtube/YoutubePlayer';
import { sendVcTransport } from './useVcTransport';

const SEEK_DRIFT_SECONDS = 0.4;
const TIMING_REPORT_INTERVAL_MS = 250;

type VcYoutubePlayerProps = {
  videoId: string;
  songId: number;
  playback: VcStatePayload['playback'];
  mirrorSongId: number | null;
  /** Player volume (0–1) from audioMirror — applied to the VC YouTube iframe. */
  volume: number;
};

/**
 * YouTube embed for the VC visualizer slot — window capture hears the iframe while
 * the main listener stays the queue/timing authority via transport IPC.
 */
export function VcYoutubePlayer({
  videoId,
  songId,
  playback,
  mirrorSongId,
  volume,
}: VcYoutubePlayerProps) {
  const playerRef = useRef<YoutubePlayerHandle | null>(null);
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
  }, [isActiveTrack, playback.isPlaying, tryStartPlayback, videoId]);

  useEffect(() => {
    if (!isActiveTrack) return;

    const tick = () => {
      const player = playerRef.current;
      if (!player) return;
      const currentTime = player.getCurrentTime();
      const duration = player.getDuration();
      if (!Number.isFinite(currentTime)) return;
      sendVcTransport({
        type: 'youtubeTiming',
        currentTime,
        duration: Number.isFinite(duration) && duration > 0 ? duration : playback.duration,
      });
    };

    tick();
    const intervalId = window.setInterval(tick, TIMING_REPORT_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [isActiveTrack, playback.duration, videoId]);

  return (
    <div className="vc-youtube-player">
      <YoutubePlayer
        ref={playerRef}
        videoId={videoId}
        playbackGeneration={songId}
        shouldPlay={shouldPlay}
        volume={volume}
        onReady={tryStartPlayback}
        onEnded={() => sendVcTransport({ type: 'youtubeEnded' })}
        onDuration={(seconds) => {
          if (seconds > 0) sendVcTransport({ type: 'youtubeDuration', seconds });
        }}
      />
    </div>
  );
}
