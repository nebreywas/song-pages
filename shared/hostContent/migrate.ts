/**
 * Normalize persisted Host Content catalog.
 */

import { createDefaultHostContentCatalog, createFallbackItem } from './catalogDefaults';
import { HOST_FALLBACK_SLOT_IDS } from './constants';
import { normalizeHostContentName } from './names';
import { normalizeFontSizeId, normalizeFontStyleId } from './typography';
import type { HostContentCatalog, HostContentItem, HostFallbackItem } from './types';

function isFallbackItem(item: HostContentItem): item is HostFallbackItem {
  return item.type === 'fallback';
}

function sanitizeTextFields(raw: unknown): HostFallbackItem['textFields'] {
  if (!Array.isArray(raw)) return ['', '', '', ''];
  return [0, 1, 2, 3].map((i) => {
    const value = raw[i];
    return typeof value === 'string' ? value.slice(0, 64) : '';
  }) as HostFallbackItem['textFields'];
}

function sanitizeItem(raw: unknown): HostContentItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const type = value.type;
  const id = typeof value.id === 'string' ? value.id : '';
  const name = normalizeHostContentName(typeof value.name === 'string' ? value.name : '');
  const createdAt = typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString();
  const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : createdAt;

  if (!id || !name) return null;

  if (type === 'fallback') {
    const slotId = value.slotId;
    if (typeof slotId !== 'string' || !HOST_FALLBACK_SLOT_IDS.includes(slotId as never)) return null;
    return {
      id,
      name,
      type: 'fallback',
      slotId: slotId as HostFallbackItem['slotId'],
      enabled: value.enabled !== false,
      resetToSystemDefault: value.resetToSystemDefault === true,
      linkedContentId: typeof value.linkedContentId === 'string' ? value.linkedContentId : null,
      textFields: sanitizeTextFields(value.textFields),
      createdAt,
      updatedAt,
    };
  }

  if (type === 'graphic' || type === 'video') {
    return {
      id,
      name,
      type,
      role: (value.role as HostContentItem & { role: string }).role ?? (type === 'graphic' ? 'image' : 'video'),
      mediaPath: typeof value.mediaPath === 'string' ? value.mediaPath : '',
      widthPx: typeof value.widthPx === 'number' ? value.widthPx : 0,
      heightPx: typeof value.heightPx === 'number' ? value.heightPx : 0,
      fileSizeBytes: typeof value.fileSizeBytes === 'number' ? value.fileSizeBytes : undefined,
      createdAt,
      updatedAt,
    } as HostContentItem;
  }

  if (type === 'title-text') {
    return {
      id,
      name,
      type: 'title-text',
      role: (value.role as 'headline' | 'title') ?? 'title',
      text: typeof value.text === 'string' ? value.text.slice(0, 36) : '',
      fontStyle: normalizeFontStyleId(value.fontStyle),
      fontSize: normalizeFontSizeId(value.fontSize),
      color: typeof value.color === 'string' ? value.color : '#ffffff',
      allCaps: value.allCaps === true,
      overflow: (value.overflow as HostContentItem & { overflow: string }).overflow ?? 'restart',
      createdAt,
      updatedAt,
    } as HostContentItem;
  }

  if (type === 'area-text') {
    return {
      id,
      name,
      type: 'area-text',
      role: (value.role as 'information' | 'list' | 'narrative') ?? 'information',
      text: typeof value.text === 'string' ? value.text.slice(0, 1000) : '',
      fontStyle: normalizeFontStyleId(value.fontStyle),
      fontSize: normalizeFontSizeId(value.fontSize),
      color: typeof value.color === 'string' ? value.color : '#ffffff',
      markdownSource: value.markdownSource === true,
      overflow: (value.overflow as HostContentItem & { overflow: string }).overflow ?? 'restart',
      createdAt,
      updatedAt,
    } as HostContentItem;
  }

  if (type === 'graphics-group') {
    return {
      id,
      name,
      type: 'graphics-group',
      memberIds: Array.isArray(value.memberIds)
        ? value.memberIds.filter((id): id is string => typeof id === 'string')
        : [],
      createdAt,
      updatedAt,
    };
  }

  return null;
}

/** Merge user items with required fallback rows. */
export function migrateHostContentCatalog(raw: unknown): HostContentCatalog {
  const defaults = createDefaultHostContentCatalog();
  if (!raw || typeof raw !== 'object') return defaults;

  const value = raw as Partial<HostContentCatalog>;
  const userItems = Array.isArray(value.items)
    ? value.items.map(sanitizeItem).filter((item): item is HostContentItem => item !== null)
    : [];

  const byId = new Map<string, HostContentItem>();
  for (const item of userItems) {
    if (item.type !== 'fallback') byId.set(item.id, item);
  }

  const fallbacks: HostFallbackItem[] = HOST_FALLBACK_SLOT_IDS.map((slotId) => {
    const existing = userItems.find(
      (item): item is HostFallbackItem => isFallbackItem(item) && item.slotId === slotId,
    );
    return existing ?? createFallbackItem(slotId);
  });

  return {
    version: 1,
    items: [...fallbacks, ...byId.values()],
  };
}

export function userHostContentItems(catalog: HostContentCatalog): HostContentItem[] {
  return catalog.items.filter((item) => item.type !== 'fallback');
}

export function listItemsByType<T extends HostContentItem['type']>(
  catalog: HostContentCatalog,
  type: T,
): Extract<HostContentItem, { type: T }>[] {
  return catalog.items.filter((item): item is Extract<HostContentItem, { type: T }> => item.type === type);
}

export function findHostContentItem(
  catalog: HostContentCatalog,
  id: string | null | undefined,
): HostContentItem | undefined {
  if (!id) return undefined;
  return catalog.items.find((item) => item.id === id);
}
