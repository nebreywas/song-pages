/**
 * Host Content catalog types.
 * Reusable assets + defaults live here; VC surface designs reference items by id.
 */

import type { HOST_FALLBACK_SLOT_IDS } from './constants';

export type HostFallbackSlotId = (typeof HOST_FALLBACK_SLOT_IDS)[number];

export type HostContentType =
  | 'graphic'
  | 'title-text'
  | 'area-text'
  | 'video'
  | 'graphics-group'
  | 'fallback';

export type HostGraphicRole = 'background' | 'banner' | 'logo' | 'image' | 'slideshow' | 'gallery';

export type HostTitleRole = 'headline' | 'title';

export type HostAreaTextRole = 'information' | 'list' | 'narrative';

export type HostVideoRole = 'animation' | 'video';

export type HostFontStyleId =
  | 'clean'
  | 'bold'
  | 'condensed'
  | 'elegant'
  | 'classic'
  | 'playful'
  | 'retro'
  | 'digital'
  | 'handwritten'
  | 'mono'
  | 'impact'
  | 'editorial';

export type HostFontSizeId =
  | 'tiny'
  | 'very-small'
  | 'small'
  | 'medium'
  | 'large'
  | 'x-large'
  | 'display'
  | 'hero';

export type HostTextOverflow = 'scroll-fast' | 'scroll-medium' | 'scroll-slow' | 'bounce' | 'restart';

/** Four optional strings for text fallbacks (artist, song title, genres). */
export type HostFallbackTextFields = [string, string, string, string];

export type HostContentBase = {
  id: string;
  /** Normalized lowercase name, <= 24 chars, [a-z0-9_-]. */
  name: string;
  type: HostContentType;
  createdAt: string;
  updatedAt: string;
  /** Byte size of copied media in userData, when applicable. */
  fileSizeBytes?: number;
};

export type HostGraphicItem = HostContentBase & {
  type: 'graphic';
  role: HostGraphicRole;
  /** Relative path under host-content media dir in userData. */
  mediaPath: string;
  widthPx: number;
  heightPx: number;
};

export type HostVideoItem = HostContentBase & {
  type: 'video';
  role: HostVideoRole;
  mediaPath: string;
  widthPx: number;
  heightPx: number;
};

export type HostTitleTextItem = HostContentBase & {
  type: 'title-text';
  role: HostTitleRole;
  text: string;
  fontStyle: HostFontStyleId;
  fontSize: HostFontSizeId;
  color: string;
  allCaps: boolean;
  overflow: HostTextOverflow;
};

export type HostAreaTextItem = HostContentBase & {
  type: 'area-text';
  role: HostAreaTextRole;
  text: string;
  fontStyle: HostFontStyleId;
  fontSize: HostFontSizeId;
  color: string;
  /** When true, render text as markdown; when false, show raw/plain text. */
  markdownSource: boolean;
  overflow: HostTextOverflow;
};

export type HostGraphicsGroupItem = HostContentBase & {
  type: 'graphics-group';
  /** Graphic item ids; missing ids remain as ghost references. */
  memberIds: string[];
};

export type HostFallbackItem = HostContentBase & {
  type: 'fallback';
  slotId: HostFallbackSlotId;
  /** Per-slot: use host fallback when song data is missing. */
  enabled: boolean;
  resetToSystemDefault: boolean;
  /** Graphic/video/text reference ids for asset-backed fallbacks. */
  linkedContentId?: string | null;
  /** Text slots with up to four alternatives. */
  textFields?: HostFallbackTextFields;
};

export type HostContentItem =
  | HostGraphicItem
  | HostVideoItem
  | HostTitleTextItem
  | HostAreaTextItem
  | HostGraphicsGroupItem
  | HostFallbackItem;

export type HostContentCatalog = {
  version: 1;
  items: HostContentItem[];
};
