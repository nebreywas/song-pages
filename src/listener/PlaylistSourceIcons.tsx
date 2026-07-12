import { useMemo } from 'react';

import {
  PLAYLIST_SONG_SOURCE_DISPLAY_ORDER,
  PLAYLIST_SONG_SOURCES,
  countPlaylistSongsBySource,
  type PlaylistSongSourceId,
} from '@shared/listener/playlistSongSource';

import type { SongRow } from '../types/app';

import { PLAYLIST_SOURCE_LOGOS } from './playlistSourceLogos';

/** Compact home-view labels for source pills. */
const SOURCE_HOME_LABELS: Record<PlaylistSongSourceId, string> = {
  'song-pages': 'Song Pages',
  suno: 'Suno',
  youtube: 'YouTube',
  flow: 'Flow Music',
  soundcloud: 'SoundCloud',
};

function formatSourceBadgeCount(count: number): string {
  return count > 999 ? '999+' : String(count);
}

type PlaylistSourceIconsProps = {
  songs: SongRow[];
};

/** Source pills with logo, label, and count for the playlist home view. */
export function PlaylistSourceIcons({ songs }: PlaylistSourceIconsProps) {
  const sources = useMemo(() => {
    const counts = countPlaylistSongsBySource(songs);
    return PLAYLIST_SONG_SOURCE_DISPLAY_ORDER.filter((id) => (counts[id] ?? 0) > 0).map((id) => ({
      id,
      label: SOURCE_HOME_LABELS[id] ?? PLAYLIST_SONG_SOURCES[id].label,
      count: counts[id] ?? 0,
      logo: PLAYLIST_SOURCE_LOGOS[id],
    }));
  }, [songs]);

  if (sources.length === 0) return null;

  return (
    <section className="custom-playlist-panel-sources" aria-label="Playlist music sources">
      <h3 className="custom-playlist-panel-sources-heading">Sources</h3>
      <ul className="custom-playlist-panel-sources-list">
        {sources.map((source) => (
          <li key={source.id} className="custom-playlist-panel-source-pill">
            <img
              src={source.logo}
              alt=""
              className="custom-playlist-panel-source-pill-icon"
              width={22}
              height={22}
            />
            <span className="custom-playlist-panel-source-pill-label">{source.label}</span>
            <span
              className="custom-playlist-panel-source-pill-count"
              aria-label={`${source.count} ${source.count === 1 ? 'track' : 'tracks'} from ${source.label}`}
            >
              {formatSourceBadgeCount(source.count)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
