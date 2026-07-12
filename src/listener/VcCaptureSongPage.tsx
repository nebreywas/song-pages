import { resolvePlaylistSongSource } from '@shared/listener/playlistSongSource';
import type { SongRow } from '../types/app';
import { PLAYLIST_SOURCE_LOGOS } from './playlistSourceLogos';

type VcCaptureSongPageProps = {
  song: SongRow;
  /** Footer hint — e.g. where the embed plays during VC Mode. */
  vcNote: string;
};

/** Main-window placeholder while VC Mode owns the widget/visualizer slot. */
export function VcCaptureSongPage({ song, vcNote }: VcCaptureSongPageProps) {
  const source = resolvePlaylistSongSource(song);
  const sourceLogo = PLAYLIST_SOURCE_LOGOS[source.id];
  const coverUrl = song.cover_url?.trim() || null;

  return (
    <article className="vc-capture-song-page">
      <header className="vc-capture-song-page-header">
        <h2 className="vc-capture-song-page-title">{song.title}</h2>
        {song.artist_name ? <p className="vc-capture-song-page-artist">{song.artist_name}</p> : null}
      </header>

      <div className="vc-capture-song-page-body">
        <div className="vc-capture-song-page-cover-wrap">
          {coverUrl ? (
            <img className="vc-capture-song-page-cover" src={coverUrl} alt="" />
          ) : (
            <div className="vc-capture-song-page-cover vc-capture-song-page-cover-fallback" aria-hidden="true" />
          )}
        </div>
      </div>

      <footer className="vc-capture-song-page-footer">
        <p className="vc-capture-song-page-source">
          <img className="vc-capture-song-page-source-logo" src={sourceLogo} alt="" />
          <span>Source: {source.label}</span>
        </p>
        <p className="vc-capture-song-page-vc-note">{vcNote}</p>
      </footer>
    </article>
  );
}
