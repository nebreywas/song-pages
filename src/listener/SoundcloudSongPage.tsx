import { useMemo, useState } from 'react';

import { soundcloudPermalinkFromSong } from '@shared/soundcloud/soundcloudFeature';
import {
  songPageFontIncreaseStyle,
  type SongPageFontIncreaseLevel,
} from '@shared/listener/playerSettings';
import type { SongRow } from '../types/app';
import { SongCoverPopover } from './SongCoverPopover';
import { SongPageSourcePill } from './SongPageSourcePill';
import { SoundcloudPlayer, type SoundcloudPlayerHandle } from './soundcloud/SoundcloudPlayer';
import { VcCaptureSongPage } from './VcCaptureSongPage';

type SoundcloudSongPageProps = {
  song: SongRow;
  playerRef: React.RefObject<SoundcloudPlayerHandle | null>;
  playbackGeneration: number;
  shouldPlay: boolean;
  /** VC visualizer slot owns the widget — main shows metadata only to avoid dual players. */
  captureInVc?: boolean;
  fontIncreaseLevel?: SongPageFontIncreaseLevel;
  onReady: () => void;
  onPlayingChange: (playing: boolean) => void;
  onEnded: () => void;
  onDuration: (seconds: number) => void;
  onError: (message: string) => void;
};

/**
 * In-app song page for SoundCloud tracks — cover + artist meta, then the widget embed.
 * Same layout is mirrored in Projector: Song Page via a native projection payload.
 */
export function SoundcloudSongPage({
  song,
  playerRef,
  playbackGeneration,
  shouldPlay,
  captureInVc = false,
  fontIncreaseLevel = 0,
  onReady,
  onPlayingChange,
  onEnded,
  onDuration,
  onError,
}: SoundcloudSongPageProps) {
  const permalink = useMemo(() => soundcloudPermalinkFromSong(song), [song]);
  const coverUrl = song.cover_url?.trim() || null;
  const [coverPopoverOpen, setCoverPopoverOpen] = useState(false);

  if (!permalink) {
    return (
      <article
        className="soundcloud-song-page"
        style={songPageFontIncreaseStyle(fontIncreaseLevel)}
      >
        <p className="error">This SoundCloud track is missing a valid permalink.</p>
      </article>
    );
  }

  if (captureInVc) {
    return (
      <VcCaptureSongPage
        song={song}
        vcNote="SoundCloud visual plays in the VC window visualizer slot."
      />
    );
  }

  return (
    <article
      className="soundcloud-song-page soundcloud-song-page--rich"
      style={songPageFontIncreaseStyle(fontIncreaseLevel)}
    >
      <header className="suno-demo-song-header soundcloud-song-page-header">
        {coverUrl ? (
          <button
            type="button"
            className="suno-demo-song-cover-btn"
            aria-label={`View ${song.title} cover art`}
            aria-pressed={coverPopoverOpen}
            onClick={() => setCoverPopoverOpen((open) => !open)}
          >
            <img className="suno-demo-song-cover" src={coverUrl} alt="" />
          </button>
        ) : (
          <div className="suno-demo-song-cover suno-demo-song-cover-fallback" aria-hidden="true">
            ♪
          </div>
        )}
        <div className="suno-demo-song-meta">
          <h1 className="suno-demo-song-title">{song.title}</h1>
          <p className="suno-demo-song-artist">{song.artist_name?.trim() || 'SoundCloud'}</p>
          <SongPageSourcePill song={song} sourceId="soundcloud" />
        </div>
      </header>

      <div className="soundcloud-song-player-wrap">
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
      </div>

      {coverPopoverOpen && coverUrl ? (
        <SongCoverPopover
          src={coverUrl}
          alt={`${song.title} cover art`}
          onClose={() => setCoverPopoverOpen(false)}
        />
      ) : null}
    </article>
  );
}
