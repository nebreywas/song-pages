type SunoOnlyPanelProps = {
  playlistName: string;
  songCount: number;
  onAddSong: () => void;
};

/** Artist panel for a demo Suno playlist. */
export function SunoOnlyPanel({ playlistName, songCount, onAddSong }: SunoOnlyPanelProps) {
  return (
    <div className="suno-only-panel">
      <h2>{playlistName}</h2>
      <p className="suno-only-panel-copy">
        Demo playlist — import public Suno clips by URL. Tracks play from Suno&apos;s CDN and show cover, artist, and
        lyrics in the page pane above.
      </p>
      <p className="suno-only-panel-count">{songCount === 1 ? '1 track' : `${songCount} tracks`}</p>
      <button type="button" className="btn primary" onClick={onAddSong}>
        Add from Suno URL
      </button>
      <p className="suno-only-panel-secret-hint">
        Shortcut: <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd>
      </p>
    </div>
  );
}
