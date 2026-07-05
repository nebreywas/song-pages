import { useMemo, type CSSProperties } from 'react';

import { hostTextCssStyle } from '@shared/hostContent';
import type { ResolvedVcContent } from '@shared/vcMode/contentResolution';
import type { VcPlaybackState } from '@shared/vcModeTypes';

import { renderMarkdownPreview } from '../lib/markdownPreview';
import { systemFallbackUrl } from './systemFallbackUrls';
import { useResolvedMediaUrl } from './useResolvedMediaUrl';
import { VcGraphicsGroupView } from './VcGraphicsGroupView';
import { VcMediaPresentation } from './VcMediaPresentation';

type VcResolvedContentViewProps = {
  resolved: Exclude<ResolvedVcContent, { kind: 'empty' } | { kind: 'visualizer' }>;
  playback: VcPlaybackState;
  animateGroup?: boolean;
};

function hostTextStyle(
  fontStyle: Parameters<typeof hostTextCssStyle>[0],
  fontSize: Parameters<typeof hostTextCssStyle>[1],
  color: string,
): CSSProperties {
  const style = hostTextCssStyle(fontStyle, fontSize, color);
  return {
    color: style.color,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontStretch: style.fontStretch,
    lineHeight: style.lineHeight,
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
  systemAsset?: 'video-cover';
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
}: {
  text: string;
  fontStyle: Parameters<typeof hostTextCssStyle>[0];
  fontSize: Parameters<typeof hostTextCssStyle>[1];
  color: string;
  allCaps?: boolean;
  markdownSource?: boolean;
}) {
  const display = allCaps ? text.toUpperCase() : text;
  const style = hostTextStyle(fontStyle, fontSize, color);

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
}: {
  text: string;
  playback: VcPlaybackState;
  fontStyle?: Parameters<typeof hostTextCssStyle>[0];
  fontSize?: Parameters<typeof hostTextCssStyle>[1];
  color?: string;
  markdownSource?: boolean;
}) {
  const progress = playback.duration > 0 ? playback.currentTime / playback.duration : 0;
  const textStyle =
    fontStyle && fontSize && color ? hostTextStyle(fontStyle, fontSize, color) : undefined;

  if (markdownSource) {
    const html = renderMarkdownPreview(text);
    if (!html) return <div className="vc-cell-empty" />;
    return (
      <div className="vc-lyrics-scroll">
        <div
          className="vc-lyrics-inner vc-host-text-markdown markdown-body"
          style={{ ...textStyle, transform: `translateY(-${progress * 55}%)` }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    );
  }

  return (
    <div className="vc-lyrics-scroll">
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
}: {
  coverUrl: string | null;
  caption: string | null;
  about: string;
  markdownSource?: boolean;
  fontStyle?: Parameters<typeof hostTextCssStyle>[0];
  fontSize?: Parameters<typeof hostTextCssStyle>[1];
  color?: string;
  allCaps?: boolean;
}) {
  const aboutHtml = useMemo(() => {
    if (!markdownSource || !about.trim()) return null;
    return renderMarkdownPreview(about);
  }, [about, markdownSource]);

  const textStyle =
    fontStyle && fontSize && color ? hostTextStyle(fontStyle, fontSize, color) : undefined;
  const displayAbout = allCaps ? about.toUpperCase() : about;
  const displayCaption = caption ? (allCaps ? caption.toUpperCase() : caption) : null;

  return (
    <div className="vc-about-stack">
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

/** Render output from {@link resolveVcCellContent}. */
export function VcResolvedContentView({
  resolved,
  playback,
  animateGroup = true,
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
        />
      );
    case 'graphics-group':
      return (
        <VcGraphicsGroupView presentation={resolved.presentation} animate={animateGroup} />
      );
    default:
      return <div className="vc-cell-empty" />;
  }
}
