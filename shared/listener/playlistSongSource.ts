import { isSunoDemoSong } from '../demo/sunoDemoFeature';
import { isFlowSong } from '../flow/flowFeature';
import { isSoundcloudSong } from '../soundcloud/soundcloudFeature';
import { isYoutubeSong } from '../youtube/youtubeFeature';

/** Where a custom-playlist snapshot row came from. */
export type PlaylistSongSourceId = 'suno' | 'song-pages' | 'youtube' | 'flow' | 'soundcloud';

export type PlaylistSongSourceMeta = {
  id: PlaylistSongSourceId;
  /** Full label for wide playlist panels. */
  label: string;
  /** Two-letter code for narrow source column. */
  abbrev: string;
};

export const PLAYLIST_SONG_SOURCES: Record<PlaylistSongSourceId, PlaylistSongSourceMeta> = {
  suno: { id: 'suno', label: 'Suno', abbrev: 'SU' },
  'song-pages': { id: 'song-pages', label: 'Song Pages', abbrev: 'SP' },
  youtube: { id: 'youtube', label: 'YouTube', abbrev: 'YT' },
  flow: { id: 'flow', label: 'Flow Music', abbrev: 'FM' },
  soundcloud: { id: 'soundcloud', label: 'SoundCloud', abbrev: 'SC' },
};

type PlaylistSongSourceInput = {
  id: number;
  playback_scope?: string | null;
  page_url?: string | null;
};

/** Classify a user-playlist snapshot row by its stored playback metadata. */
export function resolvePlaylistSongSource(song: PlaylistSongSourceInput): PlaylistSongSourceMeta {
  if (isSunoDemoSong(song)) return PLAYLIST_SONG_SOURCES.suno;
  if (isYoutubeSong(song)) return PLAYLIST_SONG_SOURCES.youtube;
  if (isFlowSong(song)) return PLAYLIST_SONG_SOURCES.flow;
  if (isSoundcloudSong(song)) return PLAYLIST_SONG_SOURCES.soundcloud;
  return PLAYLIST_SONG_SOURCES['song-pages'];
}
