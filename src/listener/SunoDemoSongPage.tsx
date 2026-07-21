import { useEffect, useMemo, useState } from 'react';
import {
  resolveSunoDemoManifestUrl,
  sunoCreatorProfileUrl,
} from '@shared/demo/sunoDemoFeature';
import {
  formatSunoCreatedDate,
  parseSunoProviderMetadata,
  type SunoClipProviderMetadata,
} from '@shared/providers/suno/clipMetadata';
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

type SunoDemoSongPageProps = {
  song: SongRow;
  lyricsSettings: ListenerLyricsDisplaySettings;
  onRemoveBracketsChange: (value: boolean) => void;
  onViewModeChange: (value: ListenerLyricsViewMode) => void;
  /** Style tags + Style prompt — off by default via Player settings. */
  showPromptInformation?: boolean;
  /** Player setting — Chromium zoom on the page root. */
  fontIncreaseLevel?: SongPageFontIncreaseLevel;
};

type SunoSongManifestPayload = {
  lyrics?: string;
  coverUrl?: string | null;
  year?: string;
  caption?: string;
  about?: string;
  providerMetadata?: unknown;
};

function formatCount(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value) || value < 0) return null;
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

/** Prefer richer Studio metadata — never let a thin cache stub wipe creator / model / counts. */
function preferRicherProviderMeta(
  current: SunoClipProviderMetadata | null,
  incoming: SunoClipProviderMetadata | null,
): SunoClipProviderMetadata | null {
  if (!incoming) return current;
  if (!current) return incoming;

  const score = (meta: SunoClipProviderMetadata) =>
    (meta.creatorHandle ? 4 : 0) +
    (meta.modelBadge ? 2 : 0) +
    (meta.createdAt ? 2 : 0) +
    (meta.sunoPlayCount != null ? 1 : 0) +
    (meta.tagList?.length ? 1 : 0) +
    (meta.stylePrompt ? 1 : 0);

  return score(incoming) >= score(current) ? incoming : current;
}

/**
 * In-app song page for Suno demo tracks — cover, artist, Studio metadata, and lyrics
 * without loading suno.com in the guest webview.
 */
export function SunoDemoSongPage({
  song,
  lyricsSettings,
  onRemoveBracketsChange,
  onViewModeChange,
  showPromptInformation = false,
  fontIncreaseLevel = 0,
}: SunoDemoSongPageProps) {
  const manifestUrl = useMemo(() => resolveSunoDemoManifestUrl(song), [song]);
  const [lyrics, setLyrics] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(song.cover_url);
  const [year, setYear] = useState(song.year?.trim() ?? '');
  const [styleTags, setStyleTags] = useState(song.caption?.trim() ?? '');
  const [stylePrompt, setStylePrompt] = useState('');
  const [providerMeta, setProviderMeta] = useState<SunoClipProviderMetadata | null>(() =>
    parseSunoProviderMetadata(song.provider_metadata_json),
  );
  const [coverPopoverOpen, setCoverPopoverOpen] = useState(false);
  const [loading, setLoading] = useState(() => Boolean(resolveSunoDemoManifestUrl(song)));

  useEffect(() => {
    setCoverPopoverOpen(false);
  }, [song.id, song.cover_url]);

  // Seed from the playlist row when the song identity changes — do not wipe richer fields
  // on every caption/cover tick (that used to flash the "older" sparse look).
  useEffect(() => {
    setCoverUrl(song.cover_url);
    setYear(song.year?.trim() ?? '');
    setStyleTags(song.caption?.trim() ?? '');
    setProviderMeta(parseSunoProviderMetadata(song.provider_metadata_json));
    setLyrics('');
    setStylePrompt('');
  }, [song.id]);

  useEffect(() => {
    if (!manifestUrl) {
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
      const manifest = result.data as SunoSongManifestPayload;
      if (typeof manifest.lyrics === 'string') setLyrics(manifest.lyrics);
      if (manifest.coverUrl) setCoverUrl(manifest.coverUrl);
      if (typeof manifest.year === 'string' && manifest.year.trim()) {
        setYear(manifest.year.trim());
      }
      if (typeof manifest.caption === 'string' && manifest.caption.trim()) {
        setStyleTags(manifest.caption.trim());
      }
      if (typeof manifest.about === 'string' && manifest.about.trim()) {
        setStylePrompt(manifest.about.trim());
      }
      const fromManifest = parseSunoProviderMetadata(manifest.providerMetadata);
      setProviderMeta((current) => preferRicherProviderMeta(current, fromManifest));
    });

    return () => {
      cancelled = true;
    };
  }, [song.id, manifestUrl]);

  const createdLabel = formatSunoCreatedDate(providerMeta?.createdAt) ?? (year || null);
  const tagList =
    providerMeta?.tagList?.length
      ? providerMeta.tagList
      : styleTags
          .split(/[,|]/)
          .map((t) => t.trim())
          .filter(Boolean);
  const playLabel = formatCount(providerMeta?.sunoPlayCount);
  const likeLabel = formatCount(providerMeta?.sunoLikeCount);
  const bpmLabel =
    providerMeta?.bpm != null && Number.isFinite(providerMeta.bpm)
      ? `${Math.round(providerMeta.bpm)} BPM`
      : null;

  const creatorHandle = providerMeta?.creatorHandle?.trim() || null;
  const creatorProfileUrl = sunoCreatorProfileUrl(creatorHandle);

  const openCreatorProfile = () => {
    if (!creatorProfileUrl) return;
    void getApp()?.openExternal(creatorProfileUrl);
  };

  return (
    <article
      className="suno-demo-song-page"
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
          <div className="suno-demo-song-title-row">
            <h1 className="suno-demo-song-title">{song.title}</h1>
            {providerMeta?.modelBadge ? (
              <span className="suno-demo-song-model-badge" title={providerMeta.modelName ?? undefined}>
                {providerMeta.modelBadge}
              </span>
            ) : null}
            {providerMeta?.explicit ? (
              <span className="suno-demo-song-explicit" title="Explicit">
                E
              </span>
            ) : null}
          </div>
          <p className="suno-demo-song-artist">{song.artist_name ?? 'Suno'}</p>
          {creatorHandle ? (
            <p className="suno-demo-song-creator">
              {providerMeta?.creatorAvatarUrl ? (
                <img
                  className="suno-demo-song-creator-avatar"
                  src={providerMeta.creatorAvatarUrl}
                  alt=""
                />
              ) : null}
              <button
                type="button"
                className="suno-demo-song-creator-handle-btn"
                onClick={openCreatorProfile}
                title={`Open @${creatorHandle} on Suno`}
              >
                @{creatorHandle}
              </button>
            </p>
          ) : null}
          <p className="suno-demo-song-facts">
            {createdLabel ? <span>{createdLabel}</span> : null}
            {bpmLabel ? <span>{bpmLabel}</span> : null}
            {providerMeta?.isInstrumental ? <span>Instrumental</span> : null}
            {playLabel ? <span title="Plays reported by Suno (not Song Pages listening stats)">{playLabel} Suno plays</span> : null}
            {likeLabel ? <span title="Likes reported by Suno">{likeLabel} Suno likes</span> : null}
          </p>
          <SongPageSourcePill song={song} sourceId="suno" />
        </div>
      </header>

      {showPromptInformation && tagList.length > 0 ? (
        <section className="suno-demo-song-tags" aria-label="Style tags">
          <ul className="suno-demo-song-tag-list">
            {tagList.map((tag) => (
              <li key={tag} className="suno-demo-song-tag">
                {tag}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {showPromptInformation && stylePrompt ? (
        <section className="suno-demo-song-style">
          <h2 className="suno-demo-song-section-title">Style</h2>
          <p className="suno-demo-song-style-body">{stylePrompt}</p>
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
