import type { VcModeConfig } from '../vcModeTypes';

import { defaultSurfaceDesignName } from './names';
import type { VcSurfaceDesign } from './types';

export function createSurfaceDesignId(): string {
  return `surface-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createSurfaceDesign(
  config: VcModeConfig,
  existingNames: Set<string>,
  name?: string,
  now = Date.now(),
): VcSurfaceDesign {
  const resolvedName = normalizeName(name, existingNames);
  const id = createSurfaceDesignId();
  return {
    id,
    name: resolvedName,
    createdAt: now,
    updatedAt: now,
    config,
  };
}

function normalizeName(name: string | undefined, existingNames: Set<string>): string {
  const trimmed = name?.trim();
  if (trimmed && !existingNames.has(trimmed)) return trimmed;
  return defaultSurfaceDesignName(existingNames);
}
