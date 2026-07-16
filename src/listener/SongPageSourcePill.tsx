/**
 * Compact source pill for native song pages — same visual language as playlist home
 * source pills, without the track-count badge.
 */

import {
  PLAYLIST_SONG_SOURCES,
  resolvePlaylistSongSource,
  type PlaylistSongSourceId,
} from '@shared/listener/playlistSongSource';

import type { SongRow } from '../types/app';

import { PLAYLIST_SOURCE_LOGOS } from './playlistSourceLogos';

/** Home-style labels (slightly shorter than table source names). */
const SOURCE_PAGE_LABELS: Record<PlaylistSongSourceId, string> = {
  'song-pages': 'Song Pages',
  suno: 'Suno',
  youtube: 'YouTube',
  flow: 'Flow Music',
  soundcloud: 'SoundCloud',
};

type SongPageSourcePillProps = {
  song: SongRow;
  /** Override when the page already resolved a source id. */
  sourceId?: PlaylistSongSourceId;
};

export function SongPageSourcePill({ song, sourceId }: SongPageSourcePillProps) {
  const resolved = sourceId
    ? PLAYLIST_SONG_SOURCES[sourceId]
    : resolvePlaylistSongSource(song);
  const label = SOURCE_PAGE_LABELS[resolved.id] ?? resolved.label;
  const logo = PLAYLIST_SOURCE_LOGOS[resolved.id];

  return (
    <p className="song-page-source-pill custom-playlist-panel-source-pill" title={label}>
      <img
        src={logo}
        alt=""
        className="custom-playlist-panel-source-pill-icon"
        width={22}
        height={22}
      />
      <span className="custom-playlist-panel-source-pill-label">{label}</span>
    </p>
  );
}
