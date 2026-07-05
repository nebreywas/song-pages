/**
 * Create new Host Content items with defaults.
 */

import { defaultNameForType } from './names';
import type {
  HostAreaTextItem,
  HostContentItem,
  HostContentType,
  HostGraphicItem,
  HostGraphicsGroupItem,
  HostTitleTextItem,
  HostVideoItem,
} from './types';

function nowIso(): string {
  return new Date().toISOString();
}

export const HOST_CONTENT_TYPE_LABELS: Record<Exclude<HostContentType, 'fallback'>, string> = {
  graphic: 'Graphic',
  'title-text': 'Title',
  'area-text': 'Text',
  video: 'Video',
  'graphics-group': 'Graphics Group',
};

function newItemId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `hc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createHostContentItem(
  type: Exclude<HostContentType, 'fallback'>,
  existingNames: Set<string>,
): HostContentItem {
  const ts = nowIso();
  const id = newItemId();
  const name = defaultNameForType(type, existingNames);

  if (type === 'graphic') {
    return {
      id,
      name,
      type,
      role: 'image',
      mediaPath: '',
      widthPx: 0,
      heightPx: 0,
      createdAt: ts,
      updatedAt: ts,
    } satisfies HostGraphicItem;
  }

  if (type === 'video') {
    return {
      id,
      name,
      type,
      role: 'video',
      mediaPath: '',
      widthPx: 0,
      heightPx: 0,
      createdAt: ts,
      updatedAt: ts,
    } satisfies HostVideoItem;
  }

  if (type === 'title-text') {
    return {
      id,
      name,
      type,
      role: 'title',
      text: '',
      fontStyle: 'clean',
      fontSize: 'medium',
      color: '#ffffff',
      allCaps: false,
      overflow: 'restart',
      createdAt: ts,
      updatedAt: ts,
    } satisfies HostTitleTextItem;
  }

  if (type === 'area-text') {
    return {
      id,
      name,
      type,
      role: 'information',
      text: '',
      fontStyle: 'clean',
      fontSize: 'medium',
      color: '#ffffff',
      markdownSource: false,
      overflow: 'restart',
      createdAt: ts,
      updatedAt: ts,
    } satisfies HostAreaTextItem;
  }

  return {
    id,
    name,
    type: 'graphics-group',
    memberIds: [],
    createdAt: ts,
    updatedAt: ts,
  } satisfies HostGraphicsGroupItem;
}

export function hostContentTypeForSlot(content: string): Exclude<HostContentType, 'fallback'> | null {
  switch (content) {
    case 'host-graphic':
      return 'graphic';
    case 'host-video':
      return 'video';
    case 'host-title-text':
      return 'title-text';
    case 'host-area-text':
      return 'area-text';
    case 'host-graphics-group':
      return 'graphics-group';
    default:
      return null;
  }
}

export function contentTypeLabel(item: HostContentItem): string {
  if (item.type === 'fallback') return 'Fallback';
  return HOST_CONTENT_TYPE_LABELS[item.type];
}
