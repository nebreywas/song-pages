/**
 * VC Source + Song URL region views — circle logos and formatted share URLs.
 */

import type { CSSProperties } from 'react';

import { hostTextCssStyle } from '@shared/hostContent';
import type { ResolvedSongUrl, ResolvedSource } from '@shared/vcMode/contentResolution';
import type { PlaylistSongSourceId } from '@shared/listener/playlistSongSource';

import { getApp } from '../lib/bridge';
import { PLAYLIST_SOURCE_LOGOS } from '../listener/playlistSourceLogos';

function openShareUrl(url: string | null | undefined): void {
  const trimmed = url?.trim();
  if (!trimmed) return;
  void getApp()?.openExternal(trimmed);
}

export function VcSourceContentView({ resolved }: { resolved: ResolvedSource }) {
  const { presentation, sourceId, title, shareUrl } = resolved;
  const showIcon = presentation.displayMode === 'icon' || presentation.displayMode === 'both';
  const showTitle = presentation.displayMode === 'title' || presentation.displayMode === 'both';
  const logoSrc = PLAYLIST_SOURCE_LOGOS[sourceId as PlaylistSongSourceId];
  const clickable = presentation.openInBrowser && Boolean(shareUrl);

  const className = [
    'vc-source-content',
    `vc-source-content--${presentation.displayMode}`,
    clickable ? 'is-clickable' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const body = (
    <>
      {showIcon && logoSrc ? (
        <img className="vc-source-logo" src={logoSrc} alt="" draggable={false} />
      ) : null}
      {showTitle ? <span className="vc-source-title">{title}</span> : null}
    </>
  );

  if (clickable) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => openShareUrl(shareUrl)}
        title={`Open ${title} in browser`}
      >
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}

export function VcSongUrlContentView({ resolved }: { resolved: ResolvedSongUrl }) {
  const { presentation, displayText, href } = resolved;
  const textStyle = hostTextCssStyle(
    presentation.fontStyle,
    presentation.fontSize,
    presentation.color,
  );

  const style: CSSProperties = {
    color: textStyle.color,
    fontFamily: textStyle.fontFamily,
    fontSize: textStyle.fontSize,
    fontWeight: textStyle.fontWeight,
    fontStretch: textStyle.fontStretch,
    lineHeight: textStyle.lineHeight,
    textAlign: presentation.textAlign,
    textDecoration: presentation.underline ? 'underline' : 'none',
    textTransform: presentation.allCaps ? 'uppercase' : undefined,
  };

  const className = [
    'vc-song-url-content',
    presentation.hoverEffect ? 'has-hover' : '',
    presentation.underline ? 'has-underline' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Decorative text by default — never looks like a link unless underline/hover enabled.
  return (
    <div className={className} style={style} title={href}>
      {displayText}
    </div>
  );
}
