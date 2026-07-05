/**
 * Live preview for Host Content items in the manager right pane.
 */

import { useEffect, useMemo, useState } from 'react';

import {
  findHostContentItem,
  nonEmptyFallbackFields,
  resolveMultiFieldFallback,
  SYSTEM_FALLBACK_TEXT,
  type HostAreaTextItem,
  type HostContentCatalog,
  type HostContentItem,
  type HostFallbackItem,
  type HostGraphicItem,
  type HostTitleTextItem,
  type HostVideoItem,
} from '@shared/hostContent';

import { renderMarkdownPreview } from '../../lib/markdownPreview';
import { getApp } from '../../lib/bridge';
import { hostTextPreviewStyle } from './hostContentPreviewStyles';

type HostContentPreviewProps = {
  item: HostContentItem;
  catalog: HostContentCatalog;
};

function useMediaUrl(mediaPath: string | undefined): { url: string | null; status: 'idle' | 'loading' | 'ready' | 'missing' } {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'missing'>('idle');

  useEffect(() => {
    if (!mediaPath) {
      setUrl(null);
      setStatus('idle');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    setUrl(null);
    void getApp()?.hostContent?.resolveMediaUrl(mediaPath).then((resolved) => {
      if (cancelled) return;
      if (resolved) {
        setUrl(resolved);
        setStatus('ready');
        return;
      }
      setUrl(null);
      setStatus('missing');
    });
    return () => {
      cancelled = true;
    };
  }, [mediaPath]);

  return { url, status };
}

function MediaGraphicPreview({ item }: { item: HostGraphicItem }) {
  const { url, status } = useMediaUrl(item.mediaPath);
  if (!item.mediaPath) {
    return <p className="hc-pane-empty">Choose a file to preview this graphic.</p>;
  }
  if (status === 'loading') return <p className="hc-pane-empty">Loading preview…</p>;
  if (status === 'missing' || !url) {
    return <p className="hc-pane-empty">Stored file not found. Choose a file again.</p>;
  }
  return <img className="hc-preview-media" src={url} alt={item.name} />;
}

function MediaVideoPreview({ item }: { item: HostVideoItem }) {
  const { url, status } = useMediaUrl(item.mediaPath);
  if (!item.mediaPath) {
    return <p className="hc-pane-empty">Choose a file to preview this video.</p>;
  }
  if (status === 'loading') return <p className="hc-pane-empty">Loading preview…</p>;
  if (status === 'missing' || !url) {
    return <p className="hc-pane-empty">Stored file not found. Choose a file again.</p>;
  }
  return <video className="hc-preview-media" src={url} controls muted playsInline />;
}

function normalizePreviewText(source: string): string {
  // Textareas often keep a trailing newline; don't show that as an extra blank preview line.
  return source.replace(/[ \t]*(\n[ \t]*)+$/, '');
}

function TitleTextPreview({ item }: { item: HostTitleTextItem }) {
  const text = normalizePreviewText(item.text);
  if (!text.trim()) {
    return <p className="hc-pane-empty">Nothing to preview yet.</p>;
  }
  const display = item.allCaps ? text.toUpperCase() : text;
  return (
    <div className="hc-preview-text" style={hostTextPreviewStyle(item.fontStyle, item.fontSize, item.color)}>
      {display}
    </div>
  );
}

function AreaTextPreview({ item }: { item: HostAreaTextItem }) {
  const text = normalizePreviewText(item.text);
  const style = hostTextPreviewStyle(item.fontStyle, item.fontSize, item.color);

  if (!text.trim()) {
    return <p className="hc-pane-empty">Nothing to preview yet.</p>;
  }

  if (item.markdownSource) {
    const html = renderMarkdownPreview(text);
    if (!html) {
      return <p className="hc-pane-empty">Nothing to preview yet.</p>;
    }
    return (
      <div
        className="hc-preview-text hc-preview-markdown markdown-body"
        style={style}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div className="hc-preview-text" style={style}>
      {text}
    </div>
  );
}

function GroupMemberTile({
  graphic,
  missing,
}: {
  graphic: HostGraphicItem | null;
  missing: boolean;
}) {
  const { url, status } = useMediaUrl(graphic?.mediaPath);

  if (missing || !graphic) {
    return (
      <div className="hc-preview-group-tile is-missing">
        <span>Missing graphic</span>
      </div>
    );
  }

  if (!graphic.mediaPath || status === 'loading' || !url) {
    return (
      <div className="hc-preview-group-tile is-missing">
        <span>{graphic.name}</span>
      </div>
    );
  }

  return (
    <div className="hc-preview-group-tile" title={graphic.name}>
      <img className="hc-preview-group-image" src={url} alt={graphic.name} />
    </div>
  );
}

function GraphicsGroupPreview({
  item,
  catalog,
}: {
  item: Extract<HostContentItem, { type: 'graphics-group' }>;
  catalog: HostContentCatalog;
}) {
  if (item.memberIds.length === 0) {
    return <p className="hc-pane-empty">Add graphics to this group to preview them here.</p>;
  }

  return (
    <div className="hc-preview-group-grid">
      {item.memberIds.map((memberId) => {
        const member = findHostContentItem(catalog, memberId);
        const graphic = member?.type === 'graphic' ? member : null;
        return (
          <GroupMemberTile
            key={memberId}
            graphic={graphic}
            missing={!graphic}
          />
        );
      })}
    </div>
  );
}

function LinkedItemPreview({
  linkedId,
  catalog,
}: {
  linkedId: string;
  catalog: HostContentCatalog;
}) {
  const linked = findHostContentItem(catalog, linkedId);
  if (!linked) {
    return <p className="hc-pane-empty">Linked content is missing from the catalog.</p>;
  }
  return <HostContentPreview item={linked} catalog={catalog} />;
}

function FallbackPreview({
  item,
  catalog,
}: {
  item: HostFallbackItem;
  catalog: HostContentCatalog;
}) {
  const isTextSlot =
    item.slotId === 'artist-name' ||
    item.slotId === 'song-title' ||
    item.slotId === 'main-genre' ||
    item.slotId === 'additional-genres';

  const previewNote = useMemo(() => {
    if (item.resetToSystemDefault) return 'Showing system default.';
    if (isTextSlot) {
      const filled = nonEmptyFallbackFields(item.textFields);
      if (filled.length > 1) return 'Multiple options — VC picks one at random when song data is missing.';
      if (filled.length === 0) return 'No host options set — system default is used.';
    }
    if (!isTextSlot && !item.linkedContentId) return 'No linked content — system default is used.';
    return null;
  }, [isTextSlot, item]);

  let body: React.ReactNode;

  if (item.resetToSystemDefault) {
    body = isTextSlot ? (
      <div className="hc-preview-text">{SYSTEM_FALLBACK_TEXT[item.slotId]}</div>
    ) : (
      <p className="hc-pane-empty">System default asset (not bundled in this build).</p>
    );
  } else if (isTextSlot) {
    const resolved =
      resolveMultiFieldFallback(item.textFields, () => 0) ??
      SYSTEM_FALLBACK_TEXT[item.slotId];
    body = <div className="hc-preview-text">{resolved}</div>;
  } else if (item.linkedContentId) {
    body = <LinkedItemPreview linkedId={item.linkedContentId} catalog={catalog} />;
  } else {
    body = <p className="hc-pane-empty">System default asset (not bundled in this build).</p>;
  }

  return (
    <>
      {body}
      {previewNote ? <p className="hc-preview-fallback-note">{previewNote}</p> : null}
    </>
  );
}

export function HostContentPreview({ item, catalog }: HostContentPreviewProps) {
  let body: React.ReactNode;

  switch (item.type) {
    case 'graphic':
      body = <MediaGraphicPreview item={item} />;
      break;
    case 'video':
      body = <MediaVideoPreview item={item} />;
      break;
    case 'title-text':
      body = <TitleTextPreview item={item} />;
      break;
    case 'area-text':
      body = <AreaTextPreview item={item} />;
      break;
    case 'graphics-group':
      body = <GraphicsGroupPreview item={item} catalog={catalog} />;
      break;
    case 'fallback':
      body = <FallbackPreview item={item} catalog={catalog} />;
      break;
    default:
      body = <p className="hc-pane-empty">No preview available.</p>;
  }

  const textAligned =
    item.type === 'title-text' ||
    item.type === 'area-text' ||
    (item.type === 'fallback' &&
      (item.slotId === 'artist-name' ||
        item.slotId === 'song-title' ||
        item.slotId === 'main-genre' ||
        item.slotId === 'additional-genres' ||
        item.slotId === 'lyrics' ||
        item.slotId === 'about-song'));

  return <div className={`hc-preview-body${textAligned ? ' is-text' : ''}`}>{body}</div>;
}
