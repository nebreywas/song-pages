/** Red dot shown in the # column when a song is deliberately skipped. */
export function SkippedSongMarker() {
  return (
    <span
      className="skipped-song-marker"
      aria-label="Skipped"
      title="Skipped — excluded from playback until restored"
    >
      <span className="skipped-song-marker-dot" aria-hidden="true" />
    </span>
  );
}
