/**
 * Dynamic commands for switching saved VC surface designs (control surfaces).
 * Mirrors the Kudo preset command pattern: one catalog entry per defined design.
 */

import type { CommandDefinition } from './types';

export const SWITCH_SURFACE_COMMAND_PREFIX = 'switch-surface-';

export type SurfaceDesignCatalogRow = { id: string; name: string };

export function surfaceCommandIdForDesign(designId: string): string {
  return `${SWITCH_SURFACE_COMMAND_PREFIX}${designId}`;
}

export function parseSurfaceDesignIdFromCommandId(commandId: string): string | null {
  if (!commandId.startsWith(SWITCH_SURFACE_COMMAND_PREFIX)) return null;
  const designId = commandId.slice(SWITCH_SURFACE_COMMAND_PREFIX.length);
  return designId.length > 0 ? designId : null;
}

export function surfaceCommandDefinition(designId: string, name: string): CommandDefinition {
  return {
    id: surfaceCommandIdForDesign(designId),
    label: `Surface: ${name}`,
    description: 'Switch the active VC control surface to this saved design.',
    category: 'surfaces',
    availability: { vcMode: true },
  };
}

export function listSurfaceCommands(
  designs: SurfaceDesignCatalogRow[],
): CommandDefinition[] {
  return designs.map((design) => surfaceCommandDefinition(design.id, design.name));
}
