/**
 * Projector: Song Page — native SoundCloud layout (cover, artist, embed).
 * Display-only embed — main Listener owns audible widget transport.
 */

import {
  songPageFontIncreaseStyle,
  type SongPageFontIncreaseLevel,
} from '@shared/listener/playerSettings';
import { PLAYLIST_SOURCE_LOGOS } from '../listener/playlistSourceLogos';
import { SoundcloudPlayer } from '../listener/soundcloud/SoundcloudPlayer';

export type ProjectorSoundcloudPagePayload = {
  kind: 'soundcloud';
  songId: number;
  title: string;
  artist: string | null;
  coverUrl: string | null;
  permalink: string;
};

type ProjectorSoundcloudSongPageProps = {
  page: ProjectorSoundcloudPagePayload;
  fontIncreaseLevel?: SongPageFontIncreaseLevel;
};

export function ProjectorSoundcloudSongPage({
  page,
  fontIncreaseLevel = 0,
}: ProjectorSoundcloudSongPageProps) {
  const coverUrl = page.coverUrl?.trim() || null;
  const sourceLogo = PLAYLIST_SOURCE_LOGOS.soundcloud;

  return (
    <div className="visualizer-window-shell visualizer-window-page visualizer-window-native-page">
      <article
        className="soundcloud-song-page soundcloud-song-page--rich soundcloud-song-page--projector"
        style={songPageFontIncreaseStyle(fontIncreaseLevel)}
      >
        <header className="suno-demo-song-header soundcloud-song-page-header">
          {coverUrl ? (
            <img className="suno-demo-song-cover" src={coverUrl} alt="" />
          ) : (
            <div className="suno-demo-song-cover suno-demo-song-cover-fallback" aria-hidden="true">
              ♪
            </div>
          )}
          <div className="suno-demo-song-meta">
            <h1 className="suno-demo-song-title">{page.title}</h1>
            <p className="suno-demo-song-artist">{page.artist?.trim() || 'SoundCloud'}</p>
            <p className="soundcloud-song-source">
              <img className="soundcloud-song-source-logo" src={sourceLogo} alt="" />
              <span>SoundCloud</span>
            </p>
          </div>
        </header>

        <div className="soundcloud-song-player-wrap">
          {/* Paused visual widget — avoids fighting the main-window transport embed. */}
          <SoundcloudPlayer
            key={page.songId}
            permalink={page.permalink}
            playbackGeneration={page.songId}
            shouldPlay={false}
          />
        </div>
      </article>
    </div>
  );
}
