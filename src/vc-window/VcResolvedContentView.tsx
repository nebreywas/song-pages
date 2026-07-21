import { useMemo, type CSSProperties } from 'react';

import { hostTextCssStyle } from '@shared/hostContent';
import type { LyricEffectId } from '@shared/lyricEffects';
import type { ResolvedVcContent } from '@shared/vcMode/contentResolution';
import type { VcPlaybackState } from '@shared/vcModeTypes';
import type { VcLyricTypographyMode, VcTitleOverflow, VcTextAlign } from '@shared/vcMode/assignmentSettings';

import { renderMarkdownPreview } from '../lib/markdownPreview';
import { systemFallbackUrl } from './systemFallbackUrls';
import { useResolvedMediaUrl } from './useResolvedMediaUrl';
import { VcGraphicsGroupView } from './VcGraphicsGroupView';
import { VcMediaPresentation } from './VcMediaPresentation';
import { VcTitleLineText } from './VcTitleLineText';
import { VcTransportBar } from './VcTransportBar';
import { VcUpcomingCoversView } from './VcUpcomingCoversView';
import { VcAlareLyricsView } from './VcAlareLyricsView';
import { VcHostDirectScrollLyricsView } from './VcHostDirectScrollLyricsView';
import { VcMarqueeLyricsView } from './VcMarqueeLyricsView';
import { lyricsScrollClassName } from './lyricsScrollClassName';
import { VcSongUrlContentView, VcSourceContentView } from './VcSourceContentViews';
import { DESIGNER_WAVESURFER_PEAKS, VcWavesurferView } from './VcWavesurferView';

type VcResolvedContentViewProps = {
  resolved: Exclude<ResolvedVcContent, { kind: 'empty' } | { kind: 'visualizer' }>;
  playback: VcPlaybackState;
  animateGroup?: boolean;
  /** FFT bins from main analyser — for agnostic lyric effects. */
  frequencyData?: Uint8Array | null;
  /** Direct playback URL for WaveSurfer peaks (not HLS embeds). */
  playbackUrl?: string | null;
  /** Designer canvas — synthetic peaks when no playable URL is on hand. */
  designerPreview?: boolean;
};

function hostTextStyle(
  fontStyle: Parameters<typeof hostTextCssStyle>[0],
  fontSize: Parameters<typeof hostTextCssStyle>[1],
  color: string,
  textAlign?: VcTextAlign,
): CSSProperties {
  const style = hostTextCssStyle(fontStyle, fontSize, color);
  return {
    color: style.color,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontStretch: style.fontStretch,
    lineHeight: style.lineHeight,
    ...(textAlign ? { textAlign } : {}),
  };
}

function ResolvedGraphicView({
  remoteUrl,
  mediaPath,
  systemAsset,
  presentation,
}: {
  remoteUrl?: string | null;
  mediaPath?: string | null;
  systemAsset?: 'cover' | 'artist-image';
  presentation?: ResolvedVcContent extends { kind: 'graphic' } ? ResolvedVcContent['presentation'] : never;
}) {
  const systemUrl = systemAsset ? systemFallbackUrl(systemAsset) : null;
  const { url: mediaUrl, status } = useResolvedMediaUrl(
    remoteUrl ?? systemUrl,
    remoteUrl || systemUrl ? null : mediaPath,
  );

  const src = remoteUrl ?? systemUrl ?? mediaUrl;
  if (!src) {
    if (status === 'loading') return <div className="vc-cell-empty" />;
    return <div className="vc-cell-empty" />;
  }

  if (presentation) {
    return <VcMediaPresentation kind="graphic" src={src} presentation={presentation} />;
  }

  return <img className="vc-cover-fit vc-host-fit" src={src} alt="" />;
}

function ResolvedVideoView({
  remoteUrl,
  mediaPath,
  systemAsset,
  presentation,
}: {
  remoteUrl?: string | null;
  mediaPath?: string | null;
  systemAsset?: 'video-cover' | 'lyrics-video';
  presentation?: ResolvedVcContent extends { kind: 'video' } ? ResolvedVcContent['presentation'] : never;
}) {
  const systemUrl = systemAsset ? systemFallbackUrl(systemAsset) : null;
  const { url: mediaUrl, status } = useResolvedMediaUrl(
    remoteUrl ?? systemUrl,
    remoteUrl || systemUrl ? null : mediaPath,
  );
  const src = remoteUrl ?? systemUrl ?? mediaUrl;

  if (!src) {
    if (status === 'loading') return <div className="vc-cell-empty" />;
    return <div className="vc-cell-empty" />;
  }

  if (presentation) {
    return <VcMediaPresentation kind="video" src={src} presentation={presentation} />;
  }

  return <video className="vc-host-video" src={src} autoPlay loop muted playsInline />;
}

function ResolvedTextView({
  text,
  fontStyle,
  fontSize,
  color,
  allCaps,
  markdownSource,
  textAlign,
  titleLine,
  lineOverflow,
}: {
  text: string;
  fontStyle: Parameters<typeof hostTextCssStyle>[0];
  fontSize: Parameters<typeof hostTextCssStyle>[1];
  color: string;
  allCaps?: boolean;
  markdownSource?: boolean;
  textAlign?: VcTextAlign;
  titleLine?: boolean;
  lineOverflow?: VcTitleOverflow;
}) {
  const display = allCaps ? text.toUpperCase() : text;
  const style = hostTextStyle(fontStyle, fontSize, color, titleLine ? undefined : textAlign);

  if (titleLine) {
    return (
      <VcTitleLineText
        text={display}
        style={style}
        overflow={lineOverflow ?? 'static'}
        textAlign={textAlign}
      />
    );
  }

  if (markdownSource) {
    const html = renderMarkdownPreview(display);
    if (!html) return <div className="vc-cell-empty" />;
    return (
      <div
        className="vc-host-text vc-host-text-markdown markdown-body"
        style={style}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div className="vc-host-text" style={style}>
      {display}
    </div>
  );
}

function ResolvedLyricsView({
  text,
  playback,
  fontStyle,
  fontSize,
  color,
  markdownSource,
  textAlign,
  lyricsEdgeFade,
  lyricTracking,
  lyricPresentationEffect,
  lyricTypographyMode,
  prettySoftBreakLongLines,
  alareFadeEnabled,
  alareTargetVisibleLines,
  manifestDurationSeconds,
  songId,
  frequencyData,
}: {
  text: string;
  playback: VcPlaybackState;
  fontStyle?: Parameters<typeof hostTextCssStyle>[0];
  fontSize?: Parameters<typeof hostTextCssStyle>[1];
  color?: string;
  markdownSource?: boolean;
  textAlign?: VcTextAlign;
  lyricsEdgeFade?: boolean;
  lyricTracking?: 'simple-scroll' | 'alare' | 'host-direct-scroll';
  lyricPresentationEffect?: LyricEffectId;
  lyricTypographyMode?: VcLyricTypographyMode;
  prettySoftBreakLongLines?: boolean;
  alareFadeEnabled?: boolean;
  alareTargetVisibleLines?: number;
  manifestDurationSeconds?: number | null;
  songId?: string | null;
  frequencyData?: Uint8Array | null;
}) {
  if (lyricTracking === 'alare' && fontStyle && fontSize && color) {
    return (
      <VcAlareLyricsView
        text={text}
        songId={songId ?? null}
        manifestDurationSeconds={manifestDurationSeconds}
        playback={playback}
        fontStyle={fontStyle}
        fontSize={fontSize}
        color={color}
        textAlign={textAlign}
        fadeEnabled={alareFadeEnabled}
        targetVisibleLines={alareTargetVisibleLines}
        lyricPresentationEffect={lyricPresentationEffect}
        lyricTypographyMode={lyricTypographyMode}
        prettySoftBreakLongLines={prettySoftBreakLongLines}
        frequencyData={frequencyData}
      />
    );
  }

  const progress = playback.duration > 0 ? playback.currentTime / playback.duration : 0;
  const textStyle =
    fontStyle && fontSize && color ? hostTextStyle(fontStyle, fontSize, color, textAlign) : textAlign ? { textAlign } : undefined;
  const scrollClass = lyricsScrollClassName(lyricsEdgeFade);

  // Host Direct Scroll: no playback-driven transform — the host scrolls manually.
  if (lyricTracking === 'host-direct-scroll') {
    return (
      <VcHostDirectScrollLyricsView
        text={text}
        markdownSource={markdownSource}
        textStyle={textStyle}
        edgeFade={lyricsEdgeFade !== false}
        songId={songId}
      />
    );
  }

  if (markdownSource) {
    const html = renderMarkdownPreview(text);
    if (!html) return <div className="vc-cell-empty" />;
    return (
      <div className={scrollClass}>
        <div
          className="vc-lyrics-inner vc-host-text-markdown markdown-body"
          style={{ ...textStyle, transform: `translateY(-${progress * 55}%)` }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    );
  }

  return (
    <div className={scrollClass}>
      <div className="vc-lyrics-inner" style={{ ...textStyle, transform: `translateY(-${progress * 55}%)` }}>
        {text}
      </div>
    </div>
  );
}

function ResolvedAboutView({
  coverUrl,
  caption,
  about,
  markdownSource,
  fontStyle,
  fontSize,
  color,
  allCaps,
  textAlign,
}: {
  coverUrl: string | null;
  caption: string | null;
  about: string;
  markdownSource?: boolean;
  fontStyle?: Parameters<typeof hostTextCssStyle>[0];
  fontSize?: Parameters<typeof hostTextCssStyle>[1];
  color?: string;
  allCaps?: boolean;
  textAlign?: VcTextAlign;
}) {
  const aboutHtml = useMemo(() => {
    if (!markdownSource || !about.trim()) return null;
    return renderMarkdownPreview(about);
  }, [about, markdownSource]);

  const textStyle =
    fontStyle && fontSize && color
      ? hostTextStyle(fontStyle, fontSize, color, textAlign)
      : textAlign
        ? { textAlign }
        : undefined;
  const displayAbout = allCaps ? about.toUpperCase() : about;
  const displayCaption = caption ? (allCaps ? caption.toUpperCase() : caption) : null;

  return (
    <div className="vc-about-stack" style={textAlign ? { textAlign } : undefined}>
      {coverUrl ? <img className="vc-about-cover" src={coverUrl} alt="" /> : null}
      {displayCaption ? <p className="vc-about-caption">{displayCaption}</p> : null}
      {aboutHtml ? (
        <div
          className="vc-about-text vc-host-text-markdown markdown-body"
          style={textStyle}
          dangerouslySetInnerHTML={{ __html: aboutHtml }}
        />
      ) : about ? (
        <div className="vc-about-text" style={textStyle}>
          {displayAbout}
        </div>
      ) : null}
    </div>
  );
}

function ResolvedArtistBioNameView({
  artistName,
  bio,
  fontStyle,
  fontSize,
  color,
  markdownSource,
  textAlign,
}: {
  artistName: string;
  bio: string;
  fontStyle: Parameters<typeof hostTextCssStyle>[0];
  fontSize: Parameters<typeof hostTextCssStyle>[1];
  color: string;
  markdownSource?: boolean;
  textAlign?: VcTextAlign;
}) {
  const style = hostTextStyle(fontStyle, fontSize, color, textAlign);
  const combined = [artistName, bio].filter(Boolean).join(artistName && bio ? '\n\n' : '');

  if (markdownSource) {
    const html = renderMarkdownPreview(combined);
    if (!html) return <div className="vc-cell-empty" />;
    return (
      <div
        className="vc-host-text vc-host-text-markdown vc-artist-bio-name markdown-body"
        style={style}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div className="vc-host-text vc-artist-bio-name" style={style}>
      {artistName ? <strong className="vc-artist-bio-name-heading">{artistName}</strong> : null}
      {bio ? <div className="vc-artist-bio-name-body">{bio}</div> : null}
    </div>
  );
}

/** Render output from {@link resolveVcCellContent}. */
export function VcResolvedContentView({
  resolved,
  playback,
  animateGroup = true,
  frequencyData = null,
  playbackUrl = null,
  designerPreview = false,
}: VcResolvedContentViewProps) {
  switch (resolved.kind) {
    case 'graphic':
      return (
        <ResolvedGraphicView
          remoteUrl={resolved.remoteUrl}
          mediaPath={resolved.mediaPath}
          systemAsset={resolved.systemAsset}
          presentation={resolved.presentation}
        />
      );
    case 'video':
      return (
        <ResolvedVideoView
          remoteUrl={resolved.remoteUrl}
          mediaPath={resolved.mediaPath}
          systemAsset={resolved.systemAsset}
          presentation={resolved.presentation}
        />
      );
    case 'text':
      return (
        <ResolvedTextView
          text={resolved.text}
          fontStyle={resolved.fontStyle}
          fontSize={resolved.fontSize}
          color={resolved.color}
          allCaps={resolved.allCaps}
          markdownSource={resolved.markdownSource}
          textAlign={resolved.textAlign}
          titleLine={resolved.titleLine}
          lineOverflow={resolved.lineOverflow}
        />
      );
    case 'marquee-lyrics':
      return (
        <VcMarqueeLyricsView
          text={resolved.text}
          playback={playback}
          fontStyle={resolved.fontStyle}
          fontSize={resolved.fontSize}
          color={resolved.color}
          lyricTracking={resolved.lyricTracking}
          manifestDurationSeconds={resolved.manifestDurationSeconds}
          songId={resolved.songId}
        />
      );
    case 'lyrics':
      return (
        <ResolvedLyricsView
          text={resolved.text}
          playback={playback}
          fontStyle={resolved.fontStyle}
          fontSize={resolved.fontSize}
          color={resolved.color}
          markdownSource={resolved.markdownSource}
          textAlign={resolved.textAlign}
          lyricsEdgeFade={resolved.lyricsEdgeFade}
          lyricTracking={resolved.lyricTracking}
          lyricPresentationEffect={resolved.lyricPresentationEffect}
          lyricTypographyMode={resolved.lyricTypographyMode}
          prettySoftBreakLongLines={resolved.prettySoftBreakLongLines}
          alareFadeEnabled={resolved.alareFadeEnabled}
          alareTargetVisibleLines={resolved.alareTargetVisibleLines}
          manifestDurationSeconds={resolved.manifestDurationSeconds}
          songId={resolved.songId}
          frequencyData={frequencyData}
        />
      );
    case 'about':
      return (
        <ResolvedAboutView
          coverUrl={resolved.coverUrl}
          caption={resolved.caption}
          about={resolved.about}
          markdownSource={resolved.markdownSource}
          fontStyle={resolved.fontStyle}
          fontSize={resolved.fontSize}
          color={resolved.color}
          allCaps={resolved.allCaps}
          textAlign={resolved.textAlign}
        />
      );
    case 'graphics-group':
      return (
        <VcGraphicsGroupView presentation={resolved.presentation} animate={animateGroup} />
      );
    case 'artist-bio-name':
      return (
        <ResolvedArtistBioNameView
          artistName={resolved.artistName}
          bio={resolved.bio}
          fontStyle={resolved.fontStyle}
          fontSize={resolved.fontSize}
          color={resolved.color}
          markdownSource={resolved.markdownSource}
          textAlign={resolved.textAlign}
        />
      );
    case 'seek-bar':
      return (
        <VcTransportBar
          playback={playback}
          presentation={resolved.presentation}
          showTransport={resolved.presentation.includeTransport}
        />
      );
    case 'player-controls':
      return (
        <div className="vc-player-controls-shell">
          <VcTransportBar
            playback={playback}
            presentation={{
              fontStyle: 'clean',
              fontSize: 'medium',
              color: '#ffffff',
              allCaps: false,
              markdownSource: false,
              includeTransport: true,
              clickable: true,
            }}
            showTransport
            scalePct={resolved.presentation.scalePct}
          />
        </div>
      );
    case 'upcoming-covers':
      return (
        <VcUpcomingCoversView songs={resolved.songs} presentation={resolved.presentation} />
      );
    case 'source':
      return <VcSourceContentView resolved={resolved} />;
    case 'song-url':
      return <VcSongUrlContentView resolved={resolved} />;
    case 'wavesurfer':
      return (
        <VcWavesurferView
          presentation={resolved.presentation}
          playback={playback}
          playbackUrl={playbackUrl}
          previewPeaks={designerPreview && !playbackUrl ? DESIGNER_WAVESURFER_PEAKS : undefined}
          previewDuration={Math.max(playback.duration, 30)}
        />
      );
    default:
      return <div className="vc-cell-empty" />;
  }
}
