import { resolvePlaylistSongSource } from '@shared/listener/playlistSongSource';
import type { SongRow } from '../types/app';

/** Source column cell content — short/long labels toggled via playlist container queries in CSS. */
export function PlaylistSongSourceCell({ song }: { song: SongRow }) {
  const source = resolvePlaylistSongSource(song);

  return (
    <>
      <span className="sr-only">{source.label}</span>
      <span className="playlist-source playlist-source--short" title={source.label} aria-hidden="true">
        {source.abbrev}
      </span>
      <span className="playlist-source playlist-source--long" aria-hidden="true">
        {source.label}
      </span>
    </>
  );
}
