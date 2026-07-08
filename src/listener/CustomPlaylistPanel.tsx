type CustomPlaylistPanelProps = {
  playlistName: string;
  songCount: number;
};

/** Artist panel for a custom user playlist. */
export function CustomPlaylistPanel({ playlistName, songCount }: CustomPlaylistPanelProps) {
  return (
    <div className="custom-playlist-panel">
      <h2>{playlistName}</h2>
      <p className="custom-playlist-panel-copy">
        Your personal playlist — add tracks from any artist, Liked Songs, or Suno playlist via right-click.
      </p>
      <p className="custom-playlist-panel-count">
        {songCount === 1 ? '1 track' : `${songCount} tracks`}
      </p>
    </div>
  );
}
