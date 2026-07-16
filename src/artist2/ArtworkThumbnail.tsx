/**
 * Resolve a local absolute image path to a file:// URL for thumbnail preview.
 */

import { useEffect, useState } from 'react';

import { getApp } from '../lib/bridge';

type ArtworkThumbnailProps = {
  /** Absolute disk path, or null when missing. */
  filePath: string | null | undefined;
  alt?: string;
  className?: string;
};

/**
 * Shows a small local-image preview. Paths come from catalog pointers /
 * managed copies under userData — resolved via main-process file URL.
 */
export function ArtworkThumbnail({ filePath, alt = 'Artwork', className }: ArtworkThumbnailProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const path = filePath?.trim() || '';
    if (!path) {
      setSrc(null);
      return;
    }

    void (async () => {
      const result = await getApp()?.artist2?.resolveLocalFileUrl?.(path);
      if (cancelled) return;
      if (result && result.ok && typeof result.data === 'string') {
        setSrc(result.data);
      } else {
        setSrc(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filePath]);

  if (!src) {
    return (
      <div className={`a2-artwork-thumb a2-artwork-thumb--empty${className ? ` ${className}` : ''}`} aria-hidden>
        <span>No art</span>
      </div>
    );
  }

  return (
    <div className={`a2-artwork-thumb${className ? ` ${className}` : ''}`}>
      <img src={src} alt={alt} />
    </div>
  );
}

/** Resolve inline artwork path or Content image file path for thumbnail display. */
export function resolveArtworkFilePath(
  artwork: { mode: string; path?: string | null; contentId?: string } | undefined,
  contentById: Map<string, { kind: string; contentType: string | null; payload: { filePath?: string | null } }>,
): string | null {
  if (!artwork) return null;
  if (artwork.mode === 'inline') return artwork.path?.trim() || null;
  if (artwork.mode === 'contentRef' && artwork.contentId) {
    const content = contentById.get(artwork.contentId);
    if (content?.kind === 'content' && content.contentType === 'image') {
      return content.payload.filePath?.trim() || null;
    }
  }
  return null;
}
