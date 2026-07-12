import { useMemo } from 'react';

import { youtubeVideoIdFromSong } from '@shared/youtube/youtubeFeature';
import type { SongRow } from '../types/app';

import { YoutubePlayer, type YoutubePlayerHandle } from './youtube/YoutubePlayer';

type YoutubeSongPageProps = {
  song: SongRow;
  playerRef: React.RefObject<YoutubePlayerHandle | null>;
  playbackGeneration: number;
  shouldPlay: boolean;
  /** VC visualizer slot owns the embed — main shows metadata only to avoid dual players. */
  captureInVc?: boolean;
  onReady: () => void;
  onPlayingChange: (playing: boolean) => void;
  onEnded: () => void;
  onDuration: (seconds: number) => void;
  onError: (message: string) => void;
};

/** In-app song page for YouTube tracks on custom playlists — shows the embedded video player. */
export function YoutubeSongPage({
  song,
  playerRef,
  playbackGeneration,
  shouldPlay,
  captureInVc = false,
  onReady,
  onPlayingChange,
  onEnded,
  onDuration,
  onError,
}: YoutubeSongPageProps) {
  const videoId = useMemo(() => youtubeVideoIdFromSong(song), [song]);

  if (!videoId) {
    return (
      <article className="youtube-song-page">
        <p className="error">This YouTube track is missing a valid video id.</p>
      </article>
    );
  }

  return (
    <article className="youtube-song-page">
      <header className="youtube-song-header">
        <h2 className="youtube-song-title">{song.title}</h2>
        {song.artist_name ? <p className="youtube-song-artist">{song.artist_name}</p> : null}
      </header>
      <div className="youtube-song-player-wrap">
        {captureInVc ? (
          <p className="youtube-vc-capture-note">Video plays in the VC window visualizer slot.</p>
        ) : (
          <YoutubePlayer
            ref={playerRef}
            videoId={videoId}
            playbackGeneration={playbackGeneration}
            shouldPlay={shouldPlay}
            onReady={onReady}
            onPlayingChange={onPlayingChange}
            onEnded={onEnded}
            onDuration={onDuration}
            onError={onError}
          />
        )}
      </div>
    </article>
  );
}
