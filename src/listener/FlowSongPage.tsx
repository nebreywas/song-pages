import { useEffect, useState } from 'react';
import { getApp } from '../lib/bridge';
import type { SongRow } from '../types/app';
import type {
  ListenerLyricsDisplaySettings,
  ListenerLyricsViewMode,
} from '@shared/listener/lyricsDisplaySettings';
import {
  songPageFontIncreaseStyle,
  type SongPageFontIncreaseLevel,
} from '@shared/listener/playerSettings';
import { ListenerLyricsBody } from './ListenerLyricsBody';
import { LyricsHeadingButton } from './LyricsHeadingButton';
import { SongCoverPopover } from './SongCoverPopover';
import { SongPageSourcePill } from './SongPageSourcePill';

type FlowSongPageProps = {
  song: SongRow;
  lyricsSettings: ListenerLyricsDisplaySettings;
  onRemoveBracketsChange: (value: boolean) => void;
  onViewModeChange: (value: ListenerLyricsViewMode) => void;
  fontIncreaseLevel?: SongPageFontIncreaseLevel;
};

/**
 * In-app song page for Google Flow tracks on custom playlists — cover, sound prompt,
 * and lyrics without loading flowmusic.app in the guest webview.
 */
export function FlowSongPage({
  song,
  lyricsSettings,
  onRemoveBracketsChange,
  onViewModeChange,
  fontIncreaseLevel = 0,
}: FlowSongPageProps) {
  const [lyrics, setLyrics] = useState('');
  const [about, setAbout] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(song.cover_url);
  const [coverPopoverOpen, setCoverPopoverOpen] = useState(false);
  const [loading, setLoading] = useState(Boolean(song.song_manifest_url));

  useEffect(() => {
    setCoverPopoverOpen(false);
  }, [song.id, song.cover_url]);

  useEffect(() => {
    setCoverUrl(song.cover_url);
    setAbout(song.caption?.trim() ?? '');
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
      const manifest = result.data as {
        lyrics?: string;
        about?: string;
        coverUrl?: string | null;
      };
      setLyrics(typeof manifest.lyrics === 'string' ? manifest.lyrics : '');
      if (typeof manifest.about === 'string' && manifest.about.trim()) {
        setAbout(manifest.about.trim());
      }
      if (manifest.coverUrl) setCoverUrl(manifest.coverUrl);
    });

    return () => {
      cancelled = true;
    };
  }, [song.id, song.caption, song.cover_url, song.song_manifest_url]);

  return (
    <article
      className="suno-demo-song-page flow-song-page"
      style={songPageFontIncreaseStyle(fontIncreaseLevel)}
    >
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
          <p className="suno-demo-song-artist">{song.artist_name ?? 'Google Flow'}</p>
          <SongPageSourcePill song={song} sourceId="flow" />
        </div>
      </header>

      {about ? (
        <section className="flow-song-sound" aria-busy={loading}>
          <h2 className="flow-song-section-title">Sound</h2>
          <p className="flow-song-sound-body">{about}</p>
        </section>
      ) : null}

      <section className="suno-demo-song-lyrics" aria-busy={loading}>
        <LyricsHeadingButton
          className="lyrics-heading-btn suno-demo-song-lyrics-heading"
          settings={lyricsSettings}
          onRemoveBracketsChange={onRemoveBracketsChange}
          onViewModeChange={onViewModeChange}
        />
        {loading ? (
          <p className="suno-demo-song-muted">Loading lyrics…</p>
        ) : (
          <ListenerLyricsBody lyrics={lyrics} settings={lyricsSettings} />
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
