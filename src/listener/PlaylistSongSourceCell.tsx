import { memo } from 'react';

import {
  PLAYLIST_SONG_SOURCES,
  resolvePlaylistSongSource,
  type PlaylistSongSourceId,
} from '@shared/listener/playlistSongSource';

import type { SongRow } from '../types/app';

import { PLAYLIST_SOURCE_LOGOS } from './playlistSourceLogos';

/** Stable per-source icon — memoized so playback ticks do not reload row images. */
const PlaylistSongSourceIcon = memo(function PlaylistSongSourceIcon({
  sourceId,
}: {
  sourceId: PlaylistSongSourceId;
}) {
  const { label } = PLAYLIST_SONG_SOURCES[sourceId];

  return (
    <span className="playlist-source-icon-wrap" title={label}>
      <img
        src={PLAYLIST_SOURCE_LOGOS[sourceId]}
        alt=""
        className="playlist-source-icon"
        width={18}
        height={18}
        decoding="sync"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
});

/** Source column — tiny round service logo per row. */
export function PlaylistSongSourceCell({ song }: { song: SongRow }) {
  return <PlaylistSongSourceIcon sourceId={resolvePlaylistSongSource(song).id} />;
}
