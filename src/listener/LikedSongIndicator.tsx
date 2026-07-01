/** Small green + badge shown beside liked songs in artist playlists (not on Liked Songs itself). */
export function LikedSongIndicator() {
  return (
    <span className="liked-song-indicator" aria-label="In Liked Songs" title="In Liked Songs">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />
      </svg>
    </span>
  );
}
