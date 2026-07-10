import type { VcModeConfig } from '../vcModeTypes';

import { VC_SURFACE_DESIGNS_VERSION } from './constants';

export type VcSurfaceDesign = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  config: VcModeConfig;
};

export type VcSurfaceDesignCatalog = {
  version: typeof VC_SURFACE_DESIGNS_VERSION;
  designs: VcSurfaceDesign[];
  activeDesignId: string;
};
