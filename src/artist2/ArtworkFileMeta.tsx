/**
 * Small filesize + dimension line under an artwork filename.
 * Probes the local file via main process (stat + nativeImage).
 */

import { useEffect, useState } from 'react';

import { getApp } from '../lib/bridge';

export type LocalImageProbe = {
  fileSizeBytes: number;
  widthPx: number;
  heightPx: number;
};

/** Compact size label — prefer kB when under 1 MB to match editor “XXXk” style. */
export function formatArtworkFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb >= 100 ? Math.round(kb) : kb.toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatArtworkFileMetaLine(meta: LocalImageProbe): string {
  const size = `filesize: ${formatArtworkFileSize(meta.fileSizeBytes)}`;
  if (meta.widthPx > 0 && meta.heightPx > 0) {
    return `${size} · dimensions: ${meta.widthPx} × ${meta.heightPx}`;
  }
  return size;
}

/**
 * Loads and displays basic local-image facts under the filename.
 * Renders nothing while loading / when the path is missing or unreadable.
 */
export function ArtworkFileMeta({ filePath }: { filePath: string | null | undefined }) {
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const path = filePath?.trim() || '';
    if (!path) {
      setLine(null);
      return;
    }

    void (async () => {
      const result = await getApp()?.artist2?.probeLocalImage?.(path);
      if (cancelled) return;
      if (result?.ok && result.data) {
        setLine(formatArtworkFileMetaLine(result.data));
      } else {
        setLine(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filePath]);

  if (!line) return null;

  return <p className="a2-artwork-file-meta">{line}</p>;
}
