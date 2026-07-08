/** Red dot shown in the # column when a subscribed catalog song is skipped. */
export function SkippedSongMarker() {
  return (
    <span className="skipped-song-marker" aria-label="Skipped" title="Skipped — restore from the row menu">
      <span className="skipped-song-marker-dot" aria-hidden="true" />
    </span>
  );
}
