/**
 * Lightweight content preview for the Surface designer.
 * Song slots use designer layout classes; host slots use the live VC renderer.
 */

import { useMemo } from 'react';

import { hostTextCssStyle } from '@shared/hostContent';
import type { HostContentCatalog } from '@shared/hostContent';
import type { ResolvedVcContent } from '@shared/vcMode/contentResolution';
import { resolveVcCellContent } from '@shared/vcMode/contentResolution';
import {
  isHostContentKind,
  songSlotSettingsForContent,
  VC_CONTENT_LABELS,
  type VcCellAssignment,
  type VcCellContent,
  type VcHostSlotBinding,
  type VcPlaybackState,
  type VcSongSlotSettings,
  type VcStatePayload,
} from '@shared/vcModeTypes';

import { renderMarkdownPreview } from '../../lib/markdownPreview';
import { systemFallbackUrl } from '../../vc-window/systemFallbackUrls';
import { useResolvedMediaUrl } from '../../vc-window/useResolvedMediaUrl';
import { VcMediaPresentation } from '../../vc-window/VcMediaPresentation';
import { VcResolvedContentView } from '../../vc-window/VcResolvedContentView';

type DesignerContentPreviewProps = {
  content: VcCellContent;
  hostBinding: VcHostSlotBinding | null;
  songBinding: VcSongSlotSettings | null;
  hostCatalog: HostContentCatalog;
  state: VcStatePayload | null;
};

function DesignerGraphicPreview({
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
  const { url: mediaUrl } = useResolvedMediaUrl(
    remoteUrl ?? systemUrl,
    remoteUrl || systemUrl ? null : mediaPath,
  );
  const src = remoteUrl ?? systemUrl ?? mediaUrl;
  if (!src) return <div className="vc-designer-preview-empty" />;
  if (presentation) {
    return (
      <div className="vc-designer-preview-live">
        <VcMediaPresentation kind="graphic" src={src} presentation={presentation} />
      </div>
    );
  }
  return <img className="vc-designer-preview-media" src={src} alt="" />;
}

function designerTextStyle(
  fontStyle: Parameters<typeof hostTextCssStyle>[0] | undefined,
  fontSize: Parameters<typeof hostTextCssStyle>[1] | undefined,
  color: string | undefined,
): React.CSSProperties | undefined {
  if (!fontStyle || !fontSize || !color) return undefined;
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

function DesignerSongResolvedPreview({
  resolved,
  playback,
}: {
  resolved: Exclude<ResolvedVcContent, { kind: 'empty' } | { kind: 'visualizer' }>;
  playback: VcPlaybackState;
}) {
  switch (resolved.kind) {
    case 'graphic':
      return (
        <DesignerGraphicPreview
          remoteUrl={resolved.remoteUrl}
          mediaPath={resolved.mediaPath}
          systemAsset={resolved.systemAsset}
          presentation={resolved.presentation}
        />
      );
    case 'text': {
      const display = resolved.allCaps ? resolved.text.toUpperCase() : resolved.text;
      return (
        <div className="vc-designer-preview-text" style={designerTextStyle(resolved.fontStyle, resolved.fontSize, resolved.color)}>
          {display}
        </div>
      );
    }
    case 'lyrics': {
      const progress = playback.duration > 0 ? playback.currentTime / playback.duration : 0;
      const textStyle = designerTextStyle(resolved.fontStyle, resolved.fontSize, resolved.color);
      if (resolved.markdownSource) {
        const html = renderMarkdownPreview(resolved.text);
        return (
          <div
            className="vc-designer-preview-text vc-designer-preview-lyrics markdown-body"
            style={{ ...textStyle, transform: `translateY(-${progress * 35}%)` }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
      return (
        <div
          className="vc-designer-preview-text vc-designer-preview-lyrics"
          style={{ ...textStyle, transform: `translateY(-${progress * 35}%)` }}
        >
          {resolved.text}
        </div>
      );
    }
    case 'about': {
      const aboutHtml =
        resolved.markdownSource && resolved.about.trim()
          ? renderMarkdownPreview(resolved.about)
          : null;
      const displayAbout = resolved.allCaps ? resolved.about.toUpperCase() : resolved.about;
      const displayCaption = resolved.caption
        ? resolved.allCaps
          ? resolved.caption.toUpperCase()
          : resolved.caption
        : null;
      return (
        <div className="vc-designer-preview-about">
          {resolved.coverUrl ? (
            <img className="vc-designer-preview-media vc-designer-preview-about-cover" src={resolved.coverUrl} alt="" />
          ) : null}
          {displayCaption ? (
            <strong className="vc-designer-preview-about-caption">{displayCaption}</strong>
          ) : null}
          {aboutHtml ? (
            <div
              className="vc-designer-preview-text markdown-body"
              style={designerTextStyle(resolved.fontStyle, resolved.fontSize, resolved.color)}
              dangerouslySetInnerHTML={{ __html: aboutHtml }}
            />
          ) : (
            <div
              className="vc-designer-preview-text"
              style={designerTextStyle(resolved.fontStyle, resolved.fontSize, resolved.color)}
            >
              {displayAbout}
            </div>
          )}
        </div>
      );
    }
    case 'video':
    case 'graphics-group':
      return (
        <VcResolvedContentView resolved={resolved} playback={playback} animateGroup={false} />
      );
    default:
      return <div className="vc-designer-preview-empty" />;
  }
}

export function DesignerContentPreview({
  content,
  hostBinding,
  songBinding,
  hostCatalog,
  state,
}: DesignerContentPreviewProps) {
  const playback = state?.playback ?? { currentTime: 0, duration: 0, isPlaying: false };

  const resolved = useMemo(
    () =>
      resolveVcCellContent(
        content,
        hostBinding,
        {
          song: state?.currentSong ?? null,
          artistName: state?.artistName ?? null,
          artistPhotoUrl: state?.artistPhotoUrl ?? null,
          catalog: hostCatalog,
          useFallbacks: state?.currentSong ? false : state?.config?.useFallbacks !== false,
          gridDesign: state?.config?.gridDesign,
        },
        songBinding?.overrides,
      ),
    [
      content,
      hostBinding,
      songBinding,
      hostCatalog,
      state?.currentSong,
      state?.artistName,
      state?.artistPhotoUrl,
      state?.config?.useFallbacks,
      state?.config?.gridDesign,
    ],
  );

  if (!content) {
    return <div className="vc-designer-preview-empty" />;
  }

  if (content === 'visualizer') {
    return (
      <div className="vc-designer-preview-placeholder vc-designer-preview-visualizer">
        <span>Visualizer</span>
      </div>
    );
  }

  if (isHostContentKind(content) && !hostBinding?.itemId) {
    return (
      <div className="vc-designer-preview-placeholder">
        {VC_CONTENT_LABELS[content]}
      </div>
    );
  }

  if (resolved.kind === 'empty') {
    if (state?.currentSong && !isHostContentKind(content)) {
      return <div className="vc-designer-preview-empty" />;
    }
    return <div className="vc-designer-preview-placeholder">{VC_CONTENT_LABELS[content]}</div>;
  }

  if (resolved.kind === 'visualizer') {
    return (
      <div className="vc-designer-preview-placeholder vc-designer-preview-visualizer">
        <span>Visualizer</span>
      </div>
    );
  }

  if (isHostContentKind(content)) {
    return (
      <div className="vc-designer-preview-live">
        <VcResolvedContentView resolved={resolved} playback={playback} animateGroup={false} />
      </div>
    );
  }

  return (
    <div className="vc-designer-preview-live">
      <DesignerSongResolvedPreview resolved={resolved} playback={playback} />
    </div>
  );
}

export function hostBindingForPreview(
  cell: VcCellAssignment,
  content: VcCellContent,
): VcHostSlotBinding | null {
  if (content === cell.slotA) return cell.hostSlotA;
  if (content === cell.slotB) return cell.hostSlotB;
  return null;
}

export function songBindingForPreview(
  cell: VcCellAssignment,
  content: VcCellContent,
): VcSongSlotSettings | null {
  return songSlotSettingsForContent(cell, content);
}
