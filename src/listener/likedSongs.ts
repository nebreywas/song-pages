/** Pseudo-artist id for the cross-artist Liked Songs playlist. Real artist ids start at 1. */
export const LIKED_SONGS_ARTIST_ID = 0;

export function isLikedSongsArtist(artistId: number | null | undefined): boolean {
  return artistId === LIKED_SONGS_ARTIST_ID;
}

export function buildLikedSongsArtistRow(songCount: number): import('../types/app').ArtistRow {
  return {
    id: LIKED_SONGS_ARTIST_ID,
    site_url: '',
    site_root_normalized: '',
    artist_slug: 'liked-songs',
    artist_name: 'Liked Songs',
    artist_photo_url: null,
    artist_bio: null,
    artist_social_json: null,
    build_version: null,
    last_fetched_at: null,
    created_at: '',
    song_count: songCount,
  };
}

/** Resolve the library song id used for like toggles (liked rows may use negative synthetic ids). */
export function likeToggleSongId(song: import('../types/app').SongRow): number | null {
  if (song.liked_id != null && song.id < 0) {
    // Snapshot-only row — cannot toggle without a library song id.
    return null;
  }
  return song.id > 0 ? song.id : null;
}

export function availabilityKey(song: import('../types/app').SongRow): number {
  return song.id;
}
