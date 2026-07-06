/**
 * Surface assignment override types, defaults, and sparse merge helpers.
 *
 * Resolution order: assignment override → Host Content item default → system assignment default.
 */

import {
  findHostContentItem,
  normalizeFontSizeId,
  normalizeFontStyleId,
  type HostContentCatalog,
  type HostContentItem,
  type HostFontSizeId,
  type HostFontStyleId,
  type HostGraphicsGroupItem,
} from '../hostContent';
import { DEFAULT_VC_GRID_DESIGN, type VcGridDefaultTypography } from './gridDesign';
import type { VcCellContent } from '../vcModeTypes';

export type VcMediaFitMode = 'stretch' | 'max-x' | 'max-y' | 'original';
export type VcGraphicOverflow = 'static' | 'scroll' | 'auto-scroll' | 'bounce';
export type VcTitleOverflow = VcGraphicOverflow;
export type VcVideoPlayback = 'once' | 'loop' | 'bounce';
export type VcGroupPresentationMode = 'slideshow' | 'gallery';
export type VcSlideshowTransition = 'none' | 'fade' | 'flip';
export type VcGalleryLayout = 'static' | 'scroll' | 'coverflow';
export type VcSlideshowPlayback = 'once' | 'loop';
export type VcUpcomingLayout = 'gallery' | 'overflow';
export type VcTextAlign = 'left' | 'center' | 'right' | 'justify';

export const VC_TEXT_ALIGN_IDS = ['left', 'center', 'right', 'justify'] as const satisfies readonly VcTextAlign[];

export const VC_TEXT_ALIGN_LABELS: Record<VcTextAlign, string> = {
  left: 'Left justified',
  center: 'Centered',
  right: 'Right justified',
  justify: 'Justified',
};

export const DEFAULT_VC_TEXT_ALIGN: VcTextAlign = 'left';

/** Long title overflow — host title + song title slots in VC Mode. */
export const VC_TITLE_OVERFLOW_OPTIONS: Array<{ value: VcTitleOverflow; label: string }> = [
  { value: 'static', label: 'Static (doesn\u2019t move)' },
  { value: 'scroll', label: 'Continuous wrap' },
  { value: 'auto-scroll', label: 'Restart scroll' },
  { value: 'bounce', label: 'Bounce' },
];

export const DEFAULT_VC_TITLE_OVERFLOW: VcTitleOverflow = 'static';

/** Sparse overrides stored on hostSlotA / hostSlotB — only explicit diffs from inherited defaults. */
export type VcAssignmentOverrides = {
  insetPct?: number;
  fitMode?: VcMediaFitMode;
  overflow?: VcGraphicOverflow;
  playback?: VcVideoPlayback;
  fontStyle?: HostFontStyleId;
  fontSize?: HostFontSizeId;
  color?: string;
  allCaps?: boolean;
  markdownSource?: boolean;
  /** Horizontal alignment for text assignments in areas and floats. */
  textAlign?: VcTextAlign;
  presentationMode?: VcGroupPresentationMode;
  frameTimeSec?: number;
  slideshowTransition?: VcSlideshowTransition;
  slideshowPlayback?: VcSlideshowPlayback;
  maxVisible?: number;
  galleryLayout?: VcGalleryLayout;
  /** Player controls float scale — 100–200% of the designed palette. */
  controlScalePct?: number;
  /** Seek bar: show prev/next transport buttons alongside the bar. */
  seekIncludeTransport?: boolean;
  /** Seek bar: allow click/drag to seek. */
  seekClickable?: boolean;
  /** Upcoming covers: multi-row gallery vs single horizontal row. */
  upcomingLayout?: VcUpcomingLayout;
  /** Lyrics scroll container: feather top/bottom edges into the region background. */
  lyricsEdgeFade?: boolean;
};

export type EffectiveMediaPresentation = {
  insetPct: number;
  fitMode: VcMediaFitMode;
};

export type EffectiveGraphicPresentation = EffectiveMediaPresentation & {
  overflow: VcGraphicOverflow;
  widthPx?: number;
  heightPx?: number;
};

export type EffectiveVideoPresentation = EffectiveMediaPresentation & {
  playback: VcVideoPlayback;
};

export type EffectiveTextPresentation = {
  fontStyle: HostFontStyleId;
  fontSize: HostFontSizeId;
  color: string;
  allCaps: boolean;
  markdownSource: boolean;
  textAlign: VcTextAlign;
  /** Single-line title overflow (song title, host title). */
  lineOverflow?: VcTitleOverflow;
};

export type GroupMemberMedia = {
  id: string;
  mediaPath: string;
  widthPx: number;
  heightPx: number;
};

export type EffectiveGroupPresentation = {
  presentationMode: VcGroupPresentationMode;
  frameTimeSec: number;
  slideshowTransition: VcSlideshowTransition;
  slideshowPlayback: VcSlideshowPlayback;
  maxVisible: number;
  galleryLayout: VcGalleryLayout;
  members: GroupMemberMedia[];
};

const FIT_MODES = new Set<VcMediaFitMode>(['stretch', 'max-x', 'max-y', 'original']);
const OVERFLOW_MODES = new Set<VcGraphicOverflow>(['static', 'scroll', 'auto-scroll', 'bounce']);
const VIDEO_PLAYBACK = new Set<VcVideoPlayback>(['once', 'loop', 'bounce']);
const GROUP_MODES = new Set<VcGroupPresentationMode>(['slideshow', 'gallery']);
const SLIDE_TRANSITIONS = new Set<VcSlideshowTransition>(['none', 'fade', 'flip']);
const SLIDE_PLAYBACK = new Set<VcSlideshowPlayback>(['once', 'loop']);
const GALLERY_LAYOUTS = new Set<VcGalleryLayout>(['static', 'scroll', 'coverflow']);
const UPCOMING_LAYOUTS = new Set<VcUpcomingLayout>(['gallery', 'overflow']);
const TEXT_ALIGNS = new Set<VcTextAlign>(VC_TEXT_ALIGN_IDS);

export const SYSTEM_ASSIGNMENT_DEFAULTS = {
  insetPct: 0,
  fitMode: 'stretch' as VcMediaFitMode,
  overflow: 'static' as VcGraphicOverflow,
  playback: 'loop' as VcVideoPlayback,
  frameTimeSec: 5,
  slideshowTransition: 'fade' as VcSlideshowTransition,
  slideshowPlayback: 'loop' as VcSlideshowPlayback,
  maxVisible: 3,
  galleryLayout: 'coverflow' as VcGalleryLayout,
  presentationMode: 'slideshow' as VcGroupPresentationMode,
};

const OVERRIDE_KEYS_BY_CONTENT: Partial<Record<VcCellContent, Array<keyof VcAssignmentOverrides>>> = {
  cover: ['insetPct', 'fitMode', 'overflow'],
  'video-cover': ['insetPct', 'fitMode', 'playback'],
  'artist-image': ['insetPct', 'fitMode', 'overflow'],
  lyrics: ['fontStyle', 'fontSize', 'color', 'markdownSource', 'textAlign', 'lyricsEdgeFade'],
  about: ['fontStyle', 'fontSize', 'color', 'allCaps', 'textAlign'],
  'artist-name': ['fontStyle', 'fontSize', 'color', 'allCaps', 'textAlign'],
  'song-title': ['fontStyle', 'fontSize', 'color', 'allCaps', 'textAlign', 'overflow'],
  'main-genre': ['fontStyle', 'fontSize', 'color', 'allCaps', 'textAlign'],
  'additional-genres': ['fontStyle', 'fontSize', 'color', 'allCaps', 'textAlign'],
  'artist-bio': ['fontStyle', 'fontSize', 'color', 'markdownSource', 'textAlign'],
  'artist-bio-name': ['fontStyle', 'fontSize', 'color', 'markdownSource', 'textAlign'],
  'song-year': ['fontStyle', 'fontSize', 'color', 'allCaps', 'textAlign'],
  'song-length': ['fontStyle', 'fontSize', 'color', 'allCaps', 'textAlign'],
  'elapsed-remaining': ['fontStyle', 'fontSize', 'color', 'allCaps', 'textAlign'],
  'seek-bar': ['seekIncludeTransport', 'seekClickable', 'fontStyle', 'fontSize', 'color'],
  'player-controls': ['controlScalePct'],
  'upcoming-covers': ['upcomingLayout'],
  'host-graphic': ['insetPct', 'fitMode', 'overflow'],
  'host-video': ['insetPct', 'fitMode', 'playback'],
  'host-title-text': ['fontStyle', 'fontSize', 'color', 'allCaps', 'textAlign', 'overflow'],
  'host-area-text': ['fontStyle', 'fontSize', 'color', 'markdownSource', 'textAlign'],
  'host-graphics-group': [
    'presentationMode',
    'frameTimeSec',
    'slideshowTransition',
    'slideshowPlayback',
    'maxVisible',
    'galleryLayout',
  ],
};

function clampInset(value: number): number {
  return Math.min(70, Math.max(0, Math.round(value)));
}

function clampFrameTime(value: number): number {
  return Math.min(120, Math.max(1, Math.round(value)));
}

function clampMaxVisible(value: number): number {
  return Math.min(12, Math.max(1, Math.round(value)));
}

function clampControlScale(value: number): number {
  return Math.min(200, Math.max(100, Math.round(value)));
}

function pickEnum<T extends string>(raw: unknown, allowed: Set<T>): T | undefined {
  return typeof raw === 'string' && allowed.has(raw as T) ? (raw as T) : undefined;
}

function pickColor(raw: unknown): string | undefined {
  return typeof raw === 'string' && /^#[0-9a-f]{6}$/i.test(raw) ? raw : undefined;
}

/** Normalize persisted sparse overrides. */
export function sanitizeAssignmentOverrides(raw: unknown): VcAssignmentOverrides {
  if (!raw || typeof raw !== 'object') return {};
  const value = raw as Record<string, unknown>;
  const next: VcAssignmentOverrides = {};

  if (typeof value.insetPct === 'number' && Number.isFinite(value.insetPct)) {
    next.insetPct = clampInset(value.insetPct);
  }
  const fitMode = pickEnum(value.fitMode, FIT_MODES);
  if (fitMode) next.fitMode = fitMode;
  const overflow = pickEnum(value.overflow, OVERFLOW_MODES);
  if (overflow) next.overflow = overflow;
  const playback = pickEnum(value.playback, VIDEO_PLAYBACK);
  if (playback) next.playback = playback;
  if (typeof value.fontStyle === 'string') next.fontStyle = normalizeFontStyleId(value.fontStyle);
  if (typeof value.fontSize === 'string') next.fontSize = normalizeFontSizeId(value.fontSize);
  const color = pickColor(value.color);
  if (color) next.color = color;
  if (typeof value.allCaps === 'boolean') next.allCaps = value.allCaps;
  if (typeof value.markdownSource === 'boolean') next.markdownSource = value.markdownSource;
  const textAlign = pickEnum(value.textAlign, TEXT_ALIGNS);
  if (textAlign) next.textAlign = textAlign;
  const presentationMode = pickEnum(value.presentationMode, GROUP_MODES);
  if (presentationMode) next.presentationMode = presentationMode;
  if (typeof value.frameTimeSec === 'number' && Number.isFinite(value.frameTimeSec)) {
    next.frameTimeSec = clampFrameTime(value.frameTimeSec);
  }
  const slideshowTransition = pickEnum(value.slideshowTransition, SLIDE_TRANSITIONS);
  if (slideshowTransition) next.slideshowTransition = slideshowTransition;
  const slideshowPlayback = pickEnum(value.slideshowPlayback, SLIDE_PLAYBACK);
  if (slideshowPlayback) next.slideshowPlayback = slideshowPlayback;
  if (typeof value.maxVisible === 'number' && Number.isFinite(value.maxVisible)) {
    next.maxVisible = clampMaxVisible(value.maxVisible);
  }
  const galleryLayout = pickEnum(value.galleryLayout, GALLERY_LAYOUTS);
  if (galleryLayout) next.galleryLayout = galleryLayout;
  if (typeof value.controlScalePct === 'number' && Number.isFinite(value.controlScalePct)) {
    next.controlScalePct = clampControlScale(value.controlScalePct);
  }
  if (typeof value.seekIncludeTransport === 'boolean') next.seekIncludeTransport = value.seekIncludeTransport;
  if (typeof value.seekClickable === 'boolean') next.seekClickable = value.seekClickable;
  const upcomingLayout = pickEnum(value.upcomingLayout, UPCOMING_LAYOUTS);
  if (upcomingLayout) next.upcomingLayout = upcomingLayout;
  if (typeof value.lyricsEdgeFade === 'boolean') next.lyricsEdgeFade = value.lyricsEdgeFade;

  return next;
}

/** Infer slideshow vs gallery from member graphic roles when assignment has no override. */
export function inferGroupPresentationDefault(
  item: HostGraphicsGroupItem,
  catalog: HostContentCatalog,
): VcGroupPresentationMode {
  for (const memberId of item.memberIds) {
    const member = findHostContentItem(catalog, memberId);
    if (member?.type === 'graphic' && member.role === 'gallery') return 'gallery';
  }
  for (const memberId of item.memberIds) {
    const member = findHostContentItem(catalog, memberId);
    if (member?.type === 'graphic' && member.role === 'slideshow') return 'slideshow';
  }
  return SYSTEM_ASSIGNMENT_DEFAULTS.presentationMode;
}

/** Full inherited defaults for a host slot (before sparse overrides). */
export function getAssignmentDefaults(
  content: VcCellContent,
  item: HostContentItem | null,
  catalog: HostContentCatalog,
  gridTypography: VcGridDefaultTypography = DEFAULT_VC_GRID_DESIGN.defaultTypography,
): VcAssignmentOverrides {
  const base = { ...SYSTEM_ASSIGNMENT_DEFAULTS };

  if (content === 'host-title-text' && item?.type === 'title-text') {
    return {
      fontStyle: item.fontStyle,
      fontSize: item.fontSize,
      color: item.color,
      allCaps: item.allCaps,
      textAlign: DEFAULT_VC_TEXT_ALIGN,
      overflow: base.overflow,
    };
  }

  if (content === 'host-area-text' && item?.type === 'area-text') {
    return {
      fontStyle: item.fontStyle,
      fontSize: item.fontSize,
      color: item.color,
      markdownSource: item.markdownSource,
      textAlign: DEFAULT_VC_TEXT_ALIGN,
    };
  }

  if (content === 'host-graphics-group' && item?.type === 'graphics-group') {
    return {
      presentationMode: inferGroupPresentationDefault(item, catalog),
      frameTimeSec: base.frameTimeSec,
      slideshowTransition: base.slideshowTransition,
      slideshowPlayback: base.slideshowPlayback,
      maxVisible: base.maxVisible,
      galleryLayout: base.galleryLayout,
    };
  }

  if (content === 'host-graphic' || content === 'host-video') {
    return {
      insetPct: base.insetPct,
      fitMode: base.fitMode,
      ...(content === 'host-graphic' ? { overflow: base.overflow } : { playback: base.playback }),
    };
  }

  if (content === 'cover' || content === 'artist-image') {
    return {
      insetPct: base.insetPct,
      fitMode: base.fitMode,
      overflow: base.overflow,
    };
  }

  if (content === 'video-cover') {
    return {
      insetPct: base.insetPct,
      fitMode: base.fitMode,
      playback: base.playback,
    };
  }

  if (
    content === 'about' ||
    content === 'artist-name' ||
    content === 'main-genre' ||
    content === 'additional-genres'
  ) {
    return {
      fontStyle: gridTypography.fontStyle,
      fontSize: gridTypography.fontSize,
      color: gridTypography.color,
      allCaps: false,
      textAlign: DEFAULT_VC_TEXT_ALIGN,
    };
  }

  if (content === 'song-title') {
    return {
      fontStyle: gridTypography.fontStyle,
      fontSize: gridTypography.fontSize,
      color: gridTypography.color,
      allCaps: false,
      textAlign: DEFAULT_VC_TEXT_ALIGN,
      overflow: base.overflow,
    };
  }

  if (content === 'lyrics') {
    return {
      fontStyle: gridTypography.fontStyle,
      fontSize: gridTypography.fontSize,
      color: gridTypography.color,
      markdownSource: false,
      textAlign: DEFAULT_VC_TEXT_ALIGN,
      lyricsEdgeFade: true,
    };
  }

  if (content === 'artist-bio' || content === 'artist-bio-name') {
    return {
      fontStyle: gridTypography.fontStyle,
      fontSize: gridTypography.fontSize,
      color: gridTypography.color,
      markdownSource: false,
      textAlign: DEFAULT_VC_TEXT_ALIGN,
    };
  }

  if (
    content === 'song-year' ||
    content === 'song-length' ||
    content === 'elapsed-remaining'
  ) {
    return {
      fontStyle: gridTypography.fontStyle,
      fontSize: gridTypography.fontSize,
      color: gridTypography.color,
      allCaps: false,
      textAlign: DEFAULT_VC_TEXT_ALIGN,
    };
  }

  return {};
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return a === b;
}

/** Keys applicable to the current host content slot type. */
export function overrideKeysForContent(content: VcCellContent): Array<keyof VcAssignmentOverrides> {
  return OVERRIDE_KEYS_BY_CONTENT[content] ?? [];
}

/** Merge sparse overrides with a single field change; drop key when it matches inherited default. */
export function patchAssignmentOverride(
  content: VcCellContent,
  item: HostContentItem | null,
  catalog: HostContentCatalog,
  current: VcAssignmentOverrides,
  key: keyof VcAssignmentOverrides,
  value: unknown,
  gridTypography?: VcGridDefaultTypography,
): VcAssignmentOverrides {
  const defaults = getAssignmentDefaults(content, item, catalog, gridTypography);
  const next: VcAssignmentOverrides = { ...current };

  let normalized: unknown = value;
  if (key === 'insetPct' && typeof value === 'number') normalized = clampInset(value);
  if (key === 'frameTimeSec' && typeof value === 'number') normalized = clampFrameTime(value);
  if (key === 'maxVisible' && typeof value === 'number') normalized = clampMaxVisible(value);
  if (key === 'fontStyle' && typeof value === 'string') normalized = normalizeFontStyleId(value);
  if (key === 'fontSize' && typeof value === 'string') normalized = normalizeFontSizeId(value);
  if (key === 'textAlign' && typeof value === 'string') normalized = pickEnum(value, TEXT_ALIGNS) ?? DEFAULT_VC_TEXT_ALIGN;
  if (key === 'color' && typeof value === 'string') normalized = pickColor(value) ?? defaults.color;

  next[key] = normalized as never;

  if (valuesEqual(next[key], defaults[key])) {
    delete next[key];
  }

  return next;
}

/** Remove all override keys for the current host content type. */
export function clearAllAssignmentOverrides(
  content: VcCellContent,
  current: VcAssignmentOverrides,
): VcAssignmentOverrides {
  const next = { ...current };
  for (const key of overrideKeysForContent(content)) {
    delete next[key];
  }
  return next;
}

function pickOverride<T>(
  overrides: VcAssignmentOverrides,
  key: keyof VcAssignmentOverrides,
  inherited: T,
  system: T,
): T {
  if (key in overrides && overrides[key] !== undefined) {
    return overrides[key] as T;
  }
  if (inherited !== undefined) return inherited;
  return system;
}

export function resolveEffectiveGraphicPresentation(
  item: Extract<HostContentItem, { type: 'graphic' }> | null,
  overrides: VcAssignmentOverrides,
): EffectiveGraphicPresentation {
  const defaults = getAssignmentDefaults('host-graphic', item, { version: 1, items: [] });
  return {
    insetPct: pickOverride(overrides, 'insetPct', defaults.insetPct, SYSTEM_ASSIGNMENT_DEFAULTS.insetPct),
    fitMode: pickOverride(overrides, 'fitMode', defaults.fitMode, SYSTEM_ASSIGNMENT_DEFAULTS.fitMode),
    overflow: pickOverride(overrides, 'overflow', defaults.overflow, SYSTEM_ASSIGNMENT_DEFAULTS.overflow),
    widthPx: item?.widthPx,
    heightPx: item?.heightPx,
  };
}

/** Resolve song graphic presentation (cover, artist image) from assignment overrides. */
export function resolveSongGraphicPresentation(overrides: VcAssignmentOverrides): EffectiveGraphicPresentation {
  const defaults = getAssignmentDefaults('cover', null, { version: 1, items: [] });
  return {
    insetPct: pickOverride(overrides, 'insetPct', defaults.insetPct, SYSTEM_ASSIGNMENT_DEFAULTS.insetPct),
    fitMode: pickOverride(overrides, 'fitMode', defaults.fitMode, SYSTEM_ASSIGNMENT_DEFAULTS.fitMode),
    overflow: pickOverride(overrides, 'overflow', defaults.overflow, SYSTEM_ASSIGNMENT_DEFAULTS.overflow),
  };
}

/** Resolve song video presentation (video cover) from assignment overrides. */
export function resolveSongVideoPresentation(overrides: VcAssignmentOverrides): EffectiveVideoPresentation {
  const defaults = getAssignmentDefaults('video-cover', null, { version: 1, items: [] });
  return {
    insetPct: pickOverride(overrides, 'insetPct', defaults.insetPct, SYSTEM_ASSIGNMENT_DEFAULTS.insetPct),
    fitMode: pickOverride(overrides, 'fitMode', defaults.fitMode, SYSTEM_ASSIGNMENT_DEFAULTS.fitMode),
    playback: pickOverride(overrides, 'playback', defaults.playback, SYSTEM_ASSIGNMENT_DEFAULTS.playback),
  };
}

/** Resolve song title-style text presentation from assignment overrides. */
export function resolveSongTitleTextPresentation(
  overrides: VcAssignmentOverrides,
  gridTypography: VcGridDefaultTypography = DEFAULT_VC_GRID_DESIGN.defaultTypography,
  options?: { titleLine?: boolean },
): EffectiveTextPresentation {
  const defaults = getAssignmentDefaults('song-title', null, { version: 1, items: [] }, gridTypography);
  return {
    fontStyle: pickOverride(overrides, 'fontStyle', gridTypography.fontStyle, gridTypography.fontStyle),
    fontSize: pickOverride(overrides, 'fontSize', gridTypography.fontSize, gridTypography.fontSize),
    color: pickOverride(overrides, 'color', gridTypography.color, gridTypography.color),
    allCaps: pickOverride(overrides, 'allCaps', false, false),
    markdownSource: false,
    textAlign: pickOverride(overrides, 'textAlign', DEFAULT_VC_TEXT_ALIGN, DEFAULT_VC_TEXT_ALIGN),
    ...(options?.titleLine
      ? {
          lineOverflow: pickOverride(
            overrides,
            'overflow',
            defaults.overflow,
            DEFAULT_VC_TITLE_OVERFLOW,
          ),
        }
      : {}),
  };
}

/** Whether lyrics use top/bottom edge fade (default on). */
export function resolveLyricsEdgeFade(overrides: VcAssignmentOverrides): boolean {
  return overrides.lyricsEdgeFade ?? true;
}

/** Resolve song area-style text presentation from assignment overrides. */
export function resolveSongAreaTextPresentation(
  overrides: VcAssignmentOverrides,
  gridTypography: VcGridDefaultTypography = DEFAULT_VC_GRID_DESIGN.defaultTypography,
): EffectiveTextPresentation {
  return {
    fontStyle: pickOverride(overrides, 'fontStyle', gridTypography.fontStyle, gridTypography.fontStyle),
    fontSize: pickOverride(overrides, 'fontSize', gridTypography.fontSize, gridTypography.fontSize),
    color: pickOverride(overrides, 'color', gridTypography.color, gridTypography.color),
    allCaps: false,
    markdownSource: pickOverride(overrides, 'markdownSource', false, false),
    textAlign: pickOverride(overrides, 'textAlign', DEFAULT_VC_TEXT_ALIGN, DEFAULT_VC_TEXT_ALIGN),
  };
}

export function resolveEffectiveVideoPresentation(
  item: Extract<HostContentItem, { type: 'video' }> | null,
  overrides: VcAssignmentOverrides,
): EffectiveVideoPresentation {
  const defaults = getAssignmentDefaults('host-video', item, { version: 1, items: [] });
  return {
    insetPct: pickOverride(overrides, 'insetPct', defaults.insetPct, SYSTEM_ASSIGNMENT_DEFAULTS.insetPct),
    fitMode: pickOverride(overrides, 'fitMode', defaults.fitMode, SYSTEM_ASSIGNMENT_DEFAULTS.fitMode),
    playback: pickOverride(overrides, 'playback', defaults.playback, SYSTEM_ASSIGNMENT_DEFAULTS.playback),
  };
}

export function resolveEffectiveTitleTextPresentation(
  item: Extract<HostContentItem, { type: 'title-text' }> | null,
  overrides: VcAssignmentOverrides,
): EffectiveTextPresentation {
  const defaults = getAssignmentDefaults('host-title-text', item, { version: 1, items: [] });
  return {
    fontStyle: pickOverride(overrides, 'fontStyle', defaults.fontStyle, 'clean'),
    fontSize: pickOverride(overrides, 'fontSize', defaults.fontSize, 'medium'),
    color: pickOverride(overrides, 'color', defaults.color, '#ffffff'),
    allCaps: pickOverride(overrides, 'allCaps', defaults.allCaps, false),
    markdownSource: false,
    textAlign: pickOverride(overrides, 'textAlign', defaults.textAlign, DEFAULT_VC_TEXT_ALIGN),
    lineOverflow: pickOverride(overrides, 'overflow', defaults.overflow, DEFAULT_VC_TITLE_OVERFLOW),
  };
}

export function resolveEffectiveAreaTextPresentation(
  item: Extract<HostContentItem, { type: 'area-text' }> | null,
  overrides: VcAssignmentOverrides,
): EffectiveTextPresentation {
  const defaults = getAssignmentDefaults('host-area-text', item, { version: 1, items: [] });
  return {
    fontStyle: pickOverride(overrides, 'fontStyle', defaults.fontStyle, 'clean'),
    fontSize: pickOverride(overrides, 'fontSize', defaults.fontSize, 'medium'),
    color: pickOverride(overrides, 'color', defaults.color, '#ffffff'),
    allCaps: false,
    markdownSource: pickOverride(overrides, 'markdownSource', defaults.markdownSource, false),
    textAlign: pickOverride(overrides, 'textAlign', defaults.textAlign, DEFAULT_VC_TEXT_ALIGN),
  };
}

export function resolveGroupMembers(
  item: HostGraphicsGroupItem,
  catalog: HostContentCatalog,
): GroupMemberMedia[] {
  const members: GroupMemberMedia[] = [];
  for (const memberId of item.memberIds) {
    const member = findHostContentItem(catalog, memberId);
    if (member?.type === 'graphic' && member.mediaPath) {
      members.push({
        id: member.id,
        mediaPath: member.mediaPath,
        widthPx: member.widthPx,
        heightPx: member.heightPx,
      });
    }
  }
  return members;
}

export function resolveEffectiveGroupPresentation(
  item: HostGraphicsGroupItem | null,
  catalog: HostContentCatalog,
  overrides: VcAssignmentOverrides,
): EffectiveGroupPresentation {
  const defaults = getAssignmentDefaults('host-graphics-group', item, catalog);
  return {
    presentationMode: pickOverride(
      overrides,
      'presentationMode',
      defaults.presentationMode,
      SYSTEM_ASSIGNMENT_DEFAULTS.presentationMode,
    ),
    frameTimeSec: pickOverride(
      overrides,
      'frameTimeSec',
      defaults.frameTimeSec,
      SYSTEM_ASSIGNMENT_DEFAULTS.frameTimeSec,
    ),
    slideshowTransition: pickOverride(
      overrides,
      'slideshowTransition',
      defaults.slideshowTransition,
      SYSTEM_ASSIGNMENT_DEFAULTS.slideshowTransition,
    ),
    slideshowPlayback: pickOverride(
      overrides,
      'slideshowPlayback',
      defaults.slideshowPlayback,
      SYSTEM_ASSIGNMENT_DEFAULTS.slideshowPlayback,
    ),
    maxVisible: pickOverride(overrides, 'maxVisible', defaults.maxVisible, SYSTEM_ASSIGNMENT_DEFAULTS.maxVisible),
    galleryLayout: pickOverride(
      overrides,
      'galleryLayout',
      defaults.galleryLayout,
      SYSTEM_ASSIGNMENT_DEFAULTS.galleryLayout,
    ),
    members: item ? resolveGroupMembers(item, catalog) : [],
  };
}

export function isOverrideActive(
  content: VcCellContent,
  item: HostContentItem | null,
  catalog: HostContentCatalog,
  overrides: VcAssignmentOverrides,
  key: keyof VcAssignmentOverrides,
): boolean {
  return key in overrides && overrides[key] !== undefined;
}

export type EffectiveSeekBarPresentation = EffectiveTextPresentation & {
  includeTransport: boolean;
  clickable: boolean;
};

export type EffectivePlayerControlsPresentation = {
  scalePct: number;
};

export type EffectiveUpcomingCoversPresentation = {
  layout: VcUpcomingLayout;
};

export function resolveSeekBarPresentation(
  overrides: VcAssignmentOverrides,
  gridTypography: VcGridDefaultTypography = DEFAULT_VC_GRID_DESIGN.defaultTypography,
): EffectiveSeekBarPresentation {
  const text = resolveSongTitleTextPresentation(overrides, gridTypography);
  return {
    ...text,
    includeTransport: pickOverride(overrides, 'seekIncludeTransport', false, false),
    clickable: pickOverride(overrides, 'seekClickable', true, true),
  };
}

export function resolvePlayerControlsPresentation(
  overrides: VcAssignmentOverrides,
): EffectivePlayerControlsPresentation {
  return {
    scalePct: pickOverride(overrides, 'controlScalePct', 100, 100),
  };
}

export function resolveUpcomingCoversPresentation(
  overrides: VcAssignmentOverrides,
): EffectiveUpcomingCoversPresentation {
  return {
    layout: pickOverride(overrides, 'upcomingLayout', 'overflow', 'overflow'),
  };
}
