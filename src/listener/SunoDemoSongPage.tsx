import { useEffect, useMemo, useState } from 'react';
import { resolveSunoDemoManifestUrl } from '@shared/demo/sunoDemoFeature';
import { getApp } from '../lib/bridge';
import { renderLyricsMarkdownPreview } from '../lib/markdownPreview';
import type { SongRow } from '../types/app';
import type { ListenerLyricsDisplaySettings } from '@shared/listener/lyricsDisplaySettings';
import { LyricsHeadingButton } from './LyricsHeadingButton';
import { SongCoverPopover } from './SongCoverPopover';

type SunoDemoSongPageProps = {
  song: SongRow;
  lyricsSettings: ListenerLyricsDisplaySettings;
  onRemoveBracketsChange: (value: boolean) => void;
};

/**
 * In-app song page for Suno demo tracks — cover, artist, and lyrics without
 * loading suno.com in the guest webview.
 */
export function SunoDemoSongPage({
  song,
  lyricsSettings,
  onRemoveBracketsChange,
}: SunoDemoSongPageProps) {
  const manifestUrl = useMemo(() => resolveSunoDemoManifestUrl(song), [song]);
  const [lyrics, setLyrics] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(song.cover_url);
  const [coverPopoverOpen, setCoverPopoverOpen] = useState(false);
  const [loading, setLoading] = useState(() => Boolean(resolveSunoDemoManifestUrl(song)));

  useEffect(() => {
    setCoverPopoverOpen(false);
  }, [song.id, song.cover_url]);

  useEffect(() => {
    setCoverUrl(song.cover_url);
    if (!manifestUrl) {
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
    void app.listener.fetchSongManifest(manifestUrl).then((result) => {
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
  }, [song.id, song.cover_url, manifestUrl]);

  const lyricsHtml = useMemo(() => {
    if (!lyrics.trim()) return '';
    return renderLyricsMarkdownPreview(lyrics, lyricsSettings.removeBrackets);
  }, [lyrics, lyricsSettings.removeBrackets]);

  return (
    <article className="suno-demo-song-page">
      <header className="suno-demo-song-header">
        {coverUrl ? (
          <button
            type="button"
            className="suno-demo-song-cover-btn"
            aria-label={`View ${song.title} cover art`}
            aria-pressed={coverPopoverOpen}
            onClick={() => setCoverPopoverOpen((open) => !open)}
          >
            <img className="suno-demo-song-cover" src={coverUrl} alt="" />
          </button>
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
        <LyricsHeadingButton
          className="lyrics-heading-btn suno-demo-song-lyrics-heading"
          settings={lyricsSettings}
          onRemoveBracketsChange={onRemoveBracketsChange}
        />
        {loading ? (
          <p className="suno-demo-song-muted">Loading lyrics…</p>
        ) : lyricsHtml ? (
          <div className="suno-demo-song-lyrics-body" dangerouslySetInnerHTML={{ __html: lyricsHtml }} />
        ) : (
          <p className="suno-demo-song-muted">No lyrics available for this clip.</p>
        )}
      </section>
      {coverPopoverOpen && coverUrl ? (
        <SongCoverPopover
          src={coverUrl}
          alt={`${song.title} cover art`}
          onClose={() => setCoverPopoverOpen(false)}
        />
      ) : null}
    </article>
  );
}
