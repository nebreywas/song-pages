/**
 * Default Host Content catalog — pre-listed fallback rows plus empty user inventory.
 */

import { HOST_FALLBACK_SLOT_IDS } from './constants';
import { FALLBACK_SLOT_LABELS } from './systemDefaults';
import type { HostContentCatalog, HostFallbackItem } from './types';

function nowIso(): string {
  return new Date().toISOString();
}

export function createFallbackItem(slotId: (typeof HOST_FALLBACK_SLOT_IDS)[number]): HostFallbackItem {
  const ts = nowIso();
  return {
    id: `fallback-${slotId}`,
    name: slotId.replace(/-/g, '_'),
    type: 'fallback',
    slotId,
    enabled: true,
    resetToSystemDefault: false,
    linkedContentId: null,
    textFields: ['', '', '', ''],
    createdAt: ts,
    updatedAt: ts,
  };
}

export function createDefaultHostContentCatalog(): HostContentCatalog {
  const ts = nowIso();
  return {
    version: 1,
    items: HOST_FALLBACK_SLOT_IDS.map(createFallbackItem),
  };
}

export function fallbackDisplayName(item: HostFallbackItem): string {
  return FALLBACK_SLOT_LABELS[item.slotId] ?? item.slotId;
}
