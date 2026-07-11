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
  const active = hasActiveFullscreenGraphic(gridDesign);
  const item = active ? findHostContentItem(catalog, settings.itemId) : null;
  const mediaPath = item?.type === 'graphic' ? item.mediaPath : null;
  // Hooks must run unconditionally — pass null mediaPath when the layer is inactive.
  const { url, status } = useResolvedMediaUrl(null, active ? mediaPath : null);

  if (!active) {
    return null;
  }

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
