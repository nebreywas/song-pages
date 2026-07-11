type CustomPlaylistPanelProps = {
  playlistName: string;
  songCount: number;
  onSharePlaylist: () => void;
};

/** Artist panel for a custom user playlist. */
export function CustomPlaylistPanel({ playlistName, songCount, onSharePlaylist }: CustomPlaylistPanelProps) {
  return (
    <div className="custom-playlist-panel">
      <h2>{playlistName}</h2>
      <p className="custom-playlist-panel-copy">
        Your personal playlist — add tracks from any artist, Liked Songs, or Suno playlist via right-click.
      </p>
      <p className="custom-playlist-panel-count">
        {songCount === 1 ? '1 track' : `${songCount} tracks`}
      </p>
      <button type="button" className="btn" onClick={onSharePlaylist}>
        Share Playlist
      </button>
    </div>
  );
}
