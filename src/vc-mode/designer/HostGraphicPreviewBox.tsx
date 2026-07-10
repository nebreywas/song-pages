/**
 * Thumbnail preview for a host content graphic — used in settings and grid design panels.
 */

import { findHostContentItem, type HostContentCatalog } from '@shared/hostContent';

import { useResolvedMediaUrl } from '../../vc-window/useResolvedMediaUrl';

type HostGraphicPreviewBoxProps = {
  itemId: string | null;
  catalog: HostContentCatalog;
  /** Optional opacity for fullscreen graphic preview (0–100). */
  opacityPct?: number;
  className?: string;
  imageClassName?: string;
};

export function HostGraphicPreviewBox({
  itemId,
  catalog,
  opacityPct,
  className = 'vc-host-graphic-preview',
  imageClassName = 'vc-host-graphic-preview-image',
}: HostGraphicPreviewBoxProps) {
  const item = itemId ? findHostContentItem(catalog, itemId) : null;
  const mediaPath = item?.type === 'graphic' ? item.mediaPath : null;
  const { url } = useResolvedMediaUrl(null, mediaPath);
  const graphicName = item?.type === 'graphic' ? item.name : null;

  return (
    <div className={className} aria-hidden={!itemId} title={graphicName ?? undefined}>
      {url ? (
        <img
          className={imageClassName}
          src={url}
          alt={graphicName ?? ''}
          style={opacityPct != null ? { opacity: opacityPct / 100 } : undefined}
        />
      ) : null}
    </div>
  );
}
