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

/** Plain-language explanations for the Host Content settings pane (?) help. */
export const HOST_CONTENT_TYPE_HELP: Record<HostContentType, string> = {
  graphic:
    'A still image for VC Mode (background, banner, logo, image, slideshow, or gallery). Up to 5MB; max 2560px on either axis.',
  'title-text':
    'A short headline string (max 36 characters) for titles and headlines in VC Mode. Set font, color, caps, and overflow defaults here.',
  'area-text':
    'Longer text (max 1000 characters) for information, lists, or narratives. Can display as markdown or plain text.',
  video:
    'A short MP4 for animation or video in VC Mode (up to 12MB; max 2560px on either axis).',
  'graphics-group':
    'A package of graphic items used together. Gallery/slideshow presentation is chosen when you assign the group on a surface.',
  fallback:
    'Stand-in content used when a song is missing cover art, lyrics, artist name, or similar fields. Host values override system defaults when enabled.',
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

export function hostContentTypeHelp(type: HostContentType): string {
  return HOST_CONTENT_TYPE_HELP[type];
}
