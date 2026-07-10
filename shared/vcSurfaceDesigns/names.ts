import { VC_SURFACE_DESIGN_NAME_MAX_LEN } from './constants';

export function normalizeSurfaceDesignName(raw: string): string {
  return raw.trim().slice(0, VC_SURFACE_DESIGN_NAME_MAX_LEN);
}

export function validateSurfaceDesignName(raw: string): string | null {
  const name = normalizeSurfaceDesignName(raw);
  if (!name) return 'Name is required.';
  return null;
}

export function defaultSurfaceDesignName(existingNames: Set<string>): string {
  const base = 'New surface';
  if (!existingNames.has(base)) return base;
  let index = 2;
  while (existingNames.has(`${base} ${index}`)) index += 1;
  return `${base} ${index}`;
}
