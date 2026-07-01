import { formatArtistSongCount } from './artistDisplay';

type LikedSongsPanelProps = {
  songCount: number;
};

/** Header shown in the web area when the Liked Songs pseudo-artist is selected. */
export function LikedSongsPanel({ songCount }: LikedSongsPanelProps) {
  return (
    <div className="liked-songs-panel">
      <div className="liked-songs-panel-header">
        <span className="liked-songs-panel-icon" aria-hidden="true">
          ♥
        </span>
        <div>
          <h2>Liked Songs</h2>
          <p className="liked-songs-panel-meta">{formatArtistSongCount(songCount)}</p>
        </div>
      </div>
      <p className="liked-songs-panel-lead">
        Your cross-artist bookmarks. Songs are checked for availability when you open or play them — not
        when the list loads.
      </p>
    </div>
  );
}
