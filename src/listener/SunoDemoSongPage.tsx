import { useEffect, useState } from 'react';
import { getApp } from '../lib/bridge';
import { renderMarkdownPreview } from '../lib/markdownPreview';
import type { SongRow } from '../types/app';

type SunoDemoSongPageProps = {
  song: SongRow;
};

/**
 * In-app song page for Suno demo tracks — cover, artist, and lyrics without
 * loading suno.com in the guest webview.
 */
export function SunoDemoSongPage({ song }: SunoDemoSongPageProps) {
  const [lyrics, setLyrics] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(song.cover_url);
  const [loading, setLoading] = useState(Boolean(song.song_manifest_url));

  useEffect(() => {
    setCoverUrl(song.cover_url);
    if (!song.song_manifest_url) {
      setLyrics('');
      setLoading(false);
      return;
    }

    const app = getApp();
    if (!app?.listener.fetchSongManifest) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void app.listener.fetchSongManifest(song.song_manifest_url).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok || !result.data || typeof result.data !== 'object') return;
      const manifest = result.data as { lyrics?: string; coverUrl?: string | null };
      setLyrics(typeof manifest.lyrics === 'string' ? manifest.lyrics : '');
      if (manifest.coverUrl) setCoverUrl(manifest.coverUrl);
    });

    return () => {
      cancelled = true;
    };
  }, [song.id, song.cover_url, song.song_manifest_url]);

  const lyricsHtml = lyrics.trim() ? renderMarkdownPreview(lyrics) : '';

  return (
    <article className="suno-demo-song-page">
      <header className="suno-demo-song-header">
        {coverUrl ? (
          <img className="suno-demo-song-cover" src={coverUrl} alt="" />
        ) : (
          <div className="suno-demo-song-cover suno-demo-song-cover-fallback" aria-hidden="true">
            ♪
          </div>
        )}
        <div className="suno-demo-song-meta">
          <h1 className="suno-demo-song-title">{song.title}</h1>
          <p className="suno-demo-song-artist">{song.artist_name ?? 'Suno'}</p>
        </div>
      </header>

      <section className="suno-demo-song-lyrics" aria-busy={loading}>
        <h2>Lyrics</h2>
        {loading ? (
          <p className="suno-demo-song-muted">Loading lyrics…</p>
        ) : lyricsHtml ? (
          <div className="suno-demo-song-lyrics-body" dangerouslySetInnerHTML={{ __html: lyricsHtml }} />
        ) : (
          <p className="suno-demo-song-muted">No lyrics available for this clip.</p>
        )}
      </section>
    </article>
  );
}
