/**
 * Grid-design fullscreen host graphic — stretched beneath areas and floats.
 */

import { findHostContentItem, type HostContentCatalog } from '@shared/hostContent';
import {
  getFullscreenGraphic,
  hasActiveFullscreenGraphic,
  type VcGridDesignSettings,
} from '@shared/vcMode/gridDesign';

import { useResolvedMediaUrl } from './useResolvedMediaUrl';

type VcFullscreenGraphicLayerProps = {
  gridDesign: VcGridDesignSettings;
  catalog: HostContentCatalog;
};

export function VcFullscreenGraphicLayer({ gridDesign, catalog }: VcFullscreenGraphicLayerProps) {
  const settings = getFullscreenGraphic(gridDesign);

  if (!hasActiveFullscreenGraphic(gridDesign)) {
    return null;
  }

  const item = findHostContentItem(catalog, settings.itemId);
  const mediaPath = item?.type === 'graphic' ? item.mediaPath : null;
  const { url, status } = useResolvedMediaUrl(null, mediaPath);

  if (!url) {
    if (status === 'loading' && mediaPath) {
      return <div className="vc-fullscreen-graphic-layer" aria-hidden="true" />;
    }
    return null;
  }

  return (
    <div
      className="vc-fullscreen-graphic-layer"
      style={{ opacity: settings.opacityPct / 100 }}
      aria-hidden="true"
    >
      <img className="vc-fullscreen-graphic-image" src={url} alt="" />
    </div>
  );
}
