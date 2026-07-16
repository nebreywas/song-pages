/**
 * Projector: Video — theater YouTube embed (full window width, aspect-ratio height).
 * Timing reports back over VC transport IPC (same bridge; accepted while projector video is active).
 *
 * Autoplay: when a track is pushed into the theater we always start the embed.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { YoutubePlayer, type YoutubePlayerHandle } from '../listener/youtube/YoutubePlayer';
import { sendVcTransport } from '../vc-window/useVcTransport';

const SEEK_DRIFT_SECONDS = 0.4;
const TIMING_REPORT_INTERVAL_MS = 250;

type ProjectorYoutubeTheaterProps = {
  videoId: string;
  songId: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
};

export function ProjectorYoutubeTheater({
  videoId,
  songId,
  isPlaying,
  currentTime,
  duration,
  volume,
}: ProjectorYoutubeTheaterProps) {
  const playerRef = useRef<YoutubePlayerHandle | null>(null);
  // State (not a ref) so the first paint after push re-renders with shouldPlay=true.
  const [autoplayNudge, setAutoplayNudge] = useState(true);
  const shouldPlay = isPlaying || autoplayNudge;
  const shouldPlayRef = useRef(shouldPlay);
  shouldPlayRef.current = shouldPlay;

  const tryStartPlayback = useCallback(() => {
    if (!shouldPlayRef.current) return;
    playerRef.current?.play();
    window.setTimeout(() => {
      if (shouldPlayRef.current) playerRef.current?.play();
    }, 0);
    setAutoplayNudge(false);
  }, []);

  // New / re-pushed video → autoplay again.
  useEffect(() => {
    setAutoplayNudge(true);
  }, [videoId, songId]);

  useEffect(() => {
    if (!shouldPlay) {
      playerRef.current?.pause();
      return;
    }
    const player = playerRef.current;
    if (!player) return;
    const current = player.getCurrentTime();
    if (Number.isFinite(current) && Math.abs(current - currentTime) > SEEK_DRIFT_SECONDS) {
      player.seek(currentTime);
    }
    tryStartPlayback();
  }, [currentTime, shouldPlay, tryStartPlayback, videoId]);

  useEffect(() => {
    const tick = () => {
      const player = playerRef.current;
      if (!player) return;
      const nextTime = player.getCurrentTime();
      const nextDuration = player.getDuration();
      if (!Number.isFinite(nextTime)) return;
      sendVcTransport({
        type: 'youtubeTiming',
        currentTime: nextTime,
        duration: Number.isFinite(nextDuration) && nextDuration > 0 ? nextDuration : duration,
      });
    };

    tick();
    const intervalId = window.setInterval(tick, TIMING_REPORT_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [duration, videoId]);

  return (
    <div className="projector-video-theater">
      <div className="projector-video-theater-stage">
        <YoutubePlayer
          key={`${songId}:${videoId}`}
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
    </div>
  );
}
