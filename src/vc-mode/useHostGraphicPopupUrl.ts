/**
 * Resolve the configured host graphic popup to a display URL for VC state payloads.
 */

import { useMemo } from 'react';

import { findHostContentItem, type HostContentCatalog } from '@shared/hostContent';

import { useResolvedMediaUrl } from '../vc-window/useResolvedMediaUrl';

/** Look up the popup graphic's media path from VC config + host catalog. */
export function hostGraphicPopupMediaPath(
  catalog: HostContentCatalog,
  graphicId: string | null | undefined,
): string | null {
  if (!graphicId) return null;
  const item = findHostContentItem(catalog, graphicId);
  return item?.type === 'graphic' && item.mediaPath ? item.mediaPath : null;
}

/**
 * Async-resolve the popup graphic URL for live VC state and designer previews.
 * Pass a pre-resolved URL from main-process enrichment to avoid a catalog round-trip.
 */
export function useHostGraphicPopupUrl(
  catalog: HostContentCatalog,
  graphicId: string | null | undefined,
  preResolvedUrl?: string | null,
): string | null {
  const mediaPath = useMemo(
    () => hostGraphicPopupMediaPath(catalog, graphicId),
    [catalog, graphicId],
  );
  const { url } = useResolvedMediaUrl(preResolvedUrl, mediaPath);
  return url;
}
