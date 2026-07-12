import { useMemo } from 'react';

import { soundcloudPermalinkFromSong } from '@shared/soundcloud/soundcloudFeature';
import type { SongRow } from '../types/app';

import { SoundcloudPlayer, type SoundcloudPlayerHandle } from './soundcloud/SoundcloudPlayer';

type SoundcloudSongPageProps = {
  song: SongRow;
  playerRef: React.RefObject<SoundcloudPlayerHandle | null>;
  playbackGeneration: number;
  shouldPlay: boolean;
  /** VC visualizer slot owns the widget — main shows metadata only to avoid dual players. */
  captureInVc?: boolean;
  onReady: () => void;
  onPlayingChange: (playing: boolean) => void;
  onEnded: () => void;
  onDuration: (seconds: number) => void;
  onError: (message: string) => void;
};

/** In-app song page for SoundCloud tracks on custom playlists. */
export function SoundcloudSongPage({
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
}: SoundcloudSongPageProps) {
  const permalink = useMemo(() => soundcloudPermalinkFromSong(song), [song]);

  if (!permalink) {
    return (
      <article className="soundcloud-song-page">
        <p className="error">This SoundCloud track is missing a valid permalink.</p>
      </article>
    );
  }

  return (
    <article className="soundcloud-song-page">
      <header className="soundcloud-song-header">
        <h2 className="soundcloud-song-title">{song.title}</h2>
        {song.artist_name ? <p className="soundcloud-song-artist">{song.artist_name}</p> : null}
      </header>
      <div className="soundcloud-song-player-wrap">
        {captureInVc ? (
          <p className="soundcloud-vc-capture-note">SoundCloud visual plays in the VC window visualizer slot.</p>
        ) : (
          <SoundcloudPlayer
            ref={playerRef}
            permalink={permalink}
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
