/** VC Mode — listening party visual mixer types (shared main ↔ VC window). */

import type { KudoPreset } from './kudos';
import { VC_MAX_BASE_AREAS, VC_SAFE_TEMPLATE_ID } from './vcSurface/constants';
import { sanitizeFloats, type VcFloatGeometry } from './vcSurface/floats';
import { resolveDividers } from './vcSurface/geometry';
import {
  defaultDividersForTemplate,
  getTemplate,
  isVcTemplateId,
  type VcTemplateId,
} from './vcSurface/templates';

export type { VcTemplateId } from './vcSurface/templates';
export type { VcFloatGeometry } from './vcSurface/floats';
export type { VcAreaRect, VcDividerHandle, VcRect, VcSurfaceLayout } from './vcSurface/geometry';

export type VcCellContent =
  | ''
  | 'visualizer'
  | 'cover'
  | 'video-cover'
  | 'lyrics'
  | 'about'
  | 'artist-name'
  | 'artist-image'
  | 'artist-bio'
  | 'artist-bio-name'
  | 'song-title'
  | 'song-year'
  | 'song-length'
  | 'elapsed-remaining'
  | 'seek-bar'
  | 'player-controls'
  | 'upcoming-covers'
  | 'main-genre'
  | 'additional-genres'
  | 'host-graphic'
  | 'host-video'
  | 'host-title-text'
  | 'host-area-text'
  | 'host-graphics-group';

export type { VcAssignmentOverrides } from './vcMode/assignmentSettings';
import type { VcAssignmentOverrides } from './vcMode/assignmentSettings';
import { sanitizeAssignmentOverrides } from './vcMode/assignmentSettings';
export type {
  VcGridDesignSettings,
  VcGridDefaultTypography,
  VcGridLineSettings,
  VcGridLineStyle,
} from './vcMode/gridDesign';
export { DEFAULT_VC_GRID_DESIGN, sanitizeGridDesign } from './vcMode/gridDesign';
import { sanitizeGridDesign, type VcGridDesignSettings } from './vcMode/gridDesign';
import {
  DEFAULT_VC_VISUALIZER_CHANGE_RULE,
  DEFAULT_VC_VISUALIZER_SEQUENCE,
  sanitizeVisualizerChangeRule,
  sanitizeVisualizerSequence,
  type VcVisualizerChangeRule,
  type VcVisualizerSequence,
} from './vcMode/visualizerSettings';
export type { VcVisualizerChangeRule, VcVisualizerSequence } from './vcMode/visualizerSettings';
export {
  VC_VISUALIZER_CHANGE_RULE_OPTIONS,
  VC_VISUALIZER_SEQUENCE_OPTIONS,
} from './vcMode/visualizerSettings';
import {
  pickOptionalBorderStyle,
  pickOptionalBorderThickness,
  sanitizeSavedRegionAppearance,
  type VcRegionAppearanceSnapshot,
} from './vcMode/gridDesign';

export type VcHostSlotBinding = {
  itemId: string;
  overrides: VcAssignmentOverrides;
};

/** Per-slot presentation overrides for song content slots (cover, lyrics, etc.). */
export type VcSongSlotSettings = {
  overrides: VcAssignmentOverrides;
};

/** Which host assignment rule set applies to each song content kind. */
export type SongContentSettingsRule = 'graphic' | 'video' | 'title-text' | 'area-text';

export const SONG_CONTENT_SETTINGS_RULE: Partial<Record<VcCellContent, SongContentSettingsRule>> = {
  cover: 'graphic',
  'video-cover': 'video',
  'artist-image': 'graphic',
  lyrics: 'area-text',
  about: 'title-text',
  'artist-name': 'title-text',
  'artist-bio': 'area-text',
  'artist-bio-name': 'area-text',
  'song-title': 'title-text',
  'song-year': 'title-text',
  'song-length': 'title-text',
  'elapsed-remaining': 'title-text',
  'main-genre': 'title-text',
  'additional-genres': 'title-text',
};

/** Interactive song slots — assignment settings use dedicated controls, not typography rules alone. */
export const VC_INTERACTIVE_SONG_CONTENT = new Set<VcCellContent>([
  'seek-bar',
  'player-controls',
  'upcoming-covers',
]);

/** May only be assigned to floats (fixed control palette design). */
export const VC_FLOAT_ONLY_CONTENT = new Set<VcCellContent>(['player-controls']);

export function isFloatOnlyContent(content: VcCellContent): boolean {
  return VC_FLOAT_ONLY_CONTENT.has(content);
}

export type VcCycleTime = 'click' | 10 | 15 | 20 | 30 | 45 | 60;

/** How primary/secondary content swap when cycling. */
export type VcTransitionStyle = 'replace' | 'fade';

/** Crossfade duration when transitionStyle is fade (milliseconds). */
export const VC_TRANSITION_FADE_MS = 500;

export type VcCellAssignment = {
  slotA: VcCellContent;
  slotB: VcCellContent;
  hostSlotA: VcHostSlotBinding | null;
  hostSlotB: VcHostSlotBinding | null;
  songSlotA: VcSongSlotSettings | null;
  songSlotB: VcSongSlotSettings | null;
  /** Required when both slots are set; null when blank or single slot only. */
  cycleTime: VcCycleTime | null;
  /** Per-region transition when cycling between primary and secondary. */
  transitionStyle: VcTransitionStyle;
  /** Optional per-area background (#rrggbb); falls back to grid design background. */
  backgroundColor?: string;
  /** Optional per-area border color (#rrggbb); falls back to grid float line color. */
  borderColor?: string;
  /** Optional per-area border style; falls back to grid float line style. */
  borderStyle?: VcGridLineStyle;
  /** Optional per-area border thickness (0–20 px); falls back to grid float line thickness. */
  borderThicknessPx?: number;
  /** When true, live rendering uses grid defaults; savedRegionAppearance holds the prior values. */
  lockAppearanceToGrid?: boolean;
  savedRegionAppearance?: VcRegionAppearanceSnapshot;
};

/** Base template geometry + floats. Content is stored separately. */
export type VcSurfaceConfig = {
  templateId: VcTemplateId;
  /** Divider positions as normalized 0–1 values, keyed by template divider name. */
  dividers: Record<string, number>;
  floats: VcFloatGeometry[];
};

/**
 * Full VC design: surface geometry, content assignments, and shared assets.
 * Base area content is indexed 0 = Area 1 … always length VC_MAX_BASE_AREAS so
 * dormant assignments survive template switches to fewer areas.
 */
export type VcModeConfig = {
  surface: VcSurfaceConfig;
  /** Content for Areas 1–4 (index 0 = Area 1). Inactive slots are dormant, not deleted. */
  cells: VcCellAssignment[];
  /** Content for floats, keyed by float id. */
  floatContent: Record<string, VcCellAssignment>;
  visualizerId: string;
  /** When and how the live visualizer advances while VC Mode is active. */
  visualizerChangeRule: VcVisualizerChangeRule;
  /** Pool used when a rotation rule picks the next visualizer. */
  visualizerSequence: VcVisualizerSequence;
  /** When false, missing song content renders blank instead of host/system fallbacks. */
  useFallbacks: boolean;
  /** Surface background, divider lines, and default text typography. */
  gridDesign: VcGridDesignSettings;
};

export type VcPlaybackState = {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
};

/** Stream URL + volume mirrored into the VC window so screen-share captures audio from that window. */
export type VcAudioMirror = {
  songId: number | null;
  playbackUrl: string | null;
  volume: number;
};

export type VcSongPayload = {
  id: number;
  title: string;
  artist: string;
  year: string | null;
  caption: string | null;
  coverUrl: string | null;
  /** Song extra asset (often video) — maps to Video Cover content. */
  videoCoverUrl?: string | null;
  about: string;
  lyrics: string;
  artistId: number;
  /** Total track length in seconds — from library metadata. */
  durationSeconds?: number | null;
  /** Added soon in song JSON — optional until editor ships. */
  mainGenre?: string | null;
  additionalGenres?: string | null;
};

export type VcUpcomingSong = {
  id: number;
  title: string;
  artist: string;
  durationSeconds: number | null;
  coverUrl: string | null;
};

export type VcOverlayId = 'cover' | 'host' | 'next' | 'songInfo' | 'upcoming' | 'remaining';

export type VcStatePayload = {
  config: VcModeConfig;
  playback: VcPlaybackState;
  /** Audible playback in the VC Electron window (main window speakers are muted while VC is open). */
  audioMirror: VcAudioMirror;
  currentSong: VcSongPayload | null;
  nextSong: { title: string; artist: string } | null;
  upcoming: VcUpcomingSong[];
  hostGraphicUrl: string | null;
  artistName: string | null;
  artistBio: string | null;
  artistPhotoUrl: string | null;
  /** Active visualizer while VC is live — may differ from config.visualizerId when rotating. */
  effectiveVisualizerId?: string;
  /** Host Kudo presets in list order (cycle trigger follows this order). */
  kudoPresets?: KudoPreset[];
};

export const VC_SONG_CONTENT_OPTIONS: Array<{ value: VcCellContent; label: string }> = [
  { value: 'artist-name', label: 'Artist Name' },
  { value: 'artist-image', label: 'Artist Image' },
  { value: 'artist-bio', label: 'Artist Bio' },
  { value: 'artist-bio-name', label: 'Artist Bio and Name' },
  { value: 'song-title', label: 'Song Title' },
  { value: 'song-year', label: 'Song Year' },
  { value: 'song-length', label: 'Song Length' },
  { value: 'elapsed-remaining', label: 'Elapsed / Remaining' },
  { value: 'seek-bar', label: 'Seek Bar' },
  { value: 'player-controls', label: 'Player Controls (float only)' },
  { value: 'upcoming-covers', label: 'Upcoming Covers / Titles' },
  { value: 'about', label: 'About Song' },
  { value: 'main-genre', label: 'Main Genre' },
  { value: 'additional-genres', label: 'Additional Genres' },
  { value: 'lyrics', label: 'Lyrics' },
  { value: 'cover', label: 'Cover' },
  { value: 'video-cover', label: 'Video Cover' },
  { value: 'visualizer', label: 'Visualizer' },
];

export const VC_HOST_CONTENT_OPTIONS: Array<{ value: VcCellContent; label: string }> = [
  { value: 'host-graphic', label: 'Host graphic' },
  { value: 'host-video', label: 'Host video' },
  { value: 'host-title-text', label: 'Host title text' },
  { value: 'host-area-text', label: 'Host area text' },
  { value: 'host-graphics-group', label: 'Host graphics group' },
];

export const VC_CONTENT_LABELS: Record<VcCellContent, string> = {
  '': '(blank)',
  visualizer: 'Visualizer',
  cover: 'Cover',
  'video-cover': 'Video Cover',
  lyrics: 'Lyrics',
  about: 'About song',
  'artist-name': 'Artist Name',
  'artist-image': 'Artist Image',
  'artist-bio': 'Artist Bio',
  'artist-bio-name': 'Artist Bio and Name',
  'song-title': 'Song Title',
  'song-year': 'Song Year',
  'song-length': 'Song Length',
  'elapsed-remaining': 'Elapsed / Remaining',
  'seek-bar': 'Seek Bar',
  'player-controls': 'Player Controls',
  'upcoming-covers': 'Upcoming Covers',
  'main-genre': 'Main Genre',
  'additional-genres': 'Additional Genres',
  'host-graphic': 'Host graphic',
  'host-video': 'Host video',
  'host-title-text': 'Host title text',
  'host-area-text': 'Host area text',
  'host-graphics-group': 'Host graphics group',
};

const VC_CELL_CONTENT_SET = new Set<string>(Object.keys(VC_CONTENT_LABELS));

export function isHostContentKind(content: VcCellContent): boolean {
  return content.startsWith('host-');
}

export function migrateCellContent(raw: unknown): VcCellContent {
  if (typeof raw !== 'string') return '';
  if (raw === 'artist') return 'artist-name';
  if (raw === 'host') return '';
  return VC_CELL_CONTENT_SET.has(raw) ? (raw as VcCellContent) : '';
}

export type VcHotkeyAction =
  | 'cover'
  | 'host'
  | 'next'
  | 'praise'
  | 'remaining'
  | 'songInfo'
  | 'upcoming'
  | 'debugOutlines'
  /** Toggle fullscreen layout editing on the VC projection surface (⌘⌥L). */
  | 'layoutMode'
  /** Nudge ALARE lyric scroll slightly faster (⌘⌥=). Resets each song. */
  | 'alareSpeedUp'
  /** Nudge ALARE lyric scroll slightly slower (⌘⌥-). Resets each song. */
  | 'alareSpeedDown'
  /** Reset ALARE lyric scroll trim to default (⌘⌥0). */
  | 'alareSpeedReset';

export const VC_SETTINGS_KEY = 'vc.lastConfig';

export const VC_CYCLE_OPTIONS: Array<{ value: VcCycleTime; label: string }> = [
  { value: 'click', label: 'Click' },
  { value: 10, label: '10 seconds' },
  { value: 15, label: '15 seconds' },
  { value: 20, label: '20 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 45, label: '45 seconds' },
  { value: 60, label: '60 seconds' },
];

export const VC_TRANSITION_OPTIONS: Array<{ value: VcTransitionStyle; label: string }> = [
  { value: 'replace', label: 'Replace' },
  { value: 'fade', label: 'Fade' },
];

export function emptyCell(): VcCellAssignment {
  return {
    slotA: '',
    slotB: '',
    hostSlotA: null,
    hostSlotB: null,
    songSlotA: null,
    songSlotB: null,
    cycleTime: null,
    transitionStyle: 'replace',
  };
}

/** Song content kinds with per-assignment presentation settings. */
export function isSongConfigurableContent(content: VcCellContent): boolean {
  return content in SONG_CONTENT_SETTINGS_RULE || VC_INTERACTIVE_SONG_CONTENT.has(content);
}

export function songSlotSettingsForContent(
  cell: VcCellAssignment,
  content: VcCellContent,
): VcSongSlotSettings | null {
  if (content === cell.slotA) return cell.songSlotA;
  if (content === cell.slotB) return cell.songSlotB;
  return null;
}

export function defaultCells(): VcCellAssignment[] {
  return Array.from({ length: VC_MAX_BASE_AREAS }, () => emptyCell());
}

export function createDefaultSurface(templateId: VcTemplateId = 'quad'): VcSurfaceConfig {
  return {
    templateId,
    dividers: defaultDividersForTemplate(templateId),
    floats: [],
  };
}

export function activeAreaCount(config: VcModeConfig): number {
  return getTemplate(config.surface.templateId).areaCount;
}

/** Active base-area assignments only (for rendering). */
export function activeCells(config: VcModeConfig): VcCellAssignment[] {
  const count = activeAreaCount(config);
  return config.cells.slice(0, count);
}

/** All content-bearing regions: active base areas + floats (for validation / visualizer). */
export function allContentAssignments(config: VcModeConfig): VcCellAssignment[] {
  const floats = config.surface.floats.map(
    (f) => config.floatContent[f.id] ?? emptyCell(),
  );
  return [...activeCells(config), ...floats];
}

export function configUsesVisualizer(config: VcModeConfig): boolean {
  return allContentAssignments(config).some(
    (cell) => cell.slotA === 'visualizer' || cell.slotB === 'visualizer',
  );
}

export function configUsesHost(_config: VcModeConfig): boolean {
  return false;
}

function sanitizeHostBinding(raw: unknown): VcHostSlotBinding | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<VcHostSlotBinding>;
  if (typeof value.itemId !== 'string') return null;
  return {
    itemId: value.itemId,
    overrides: sanitizeAssignmentOverrides(value.overrides),
  };
}

function sanitizeSongSlot(raw: unknown): VcSongSlotSettings {
  if (!raw || typeof raw !== 'object') return { overrides: {} };
  const value = raw as Partial<VcSongSlotSettings>;
  return { overrides: sanitizeAssignmentOverrides(value.overrides) };
}

function pickOptionalHex(raw: unknown): string | undefined {
  return typeof raw === 'string' && /^#[0-9a-f]{6}$/i.test(raw) ? raw : undefined;
}

function sanitizeCell(raw: unknown): VcCellAssignment {
  if (!raw || typeof raw !== 'object') return emptyCell();
  const cell = raw as Partial<VcCellAssignment>;
  const slotA = migrateCellContent(cell.slotA);
  const slotB = migrateCellContent(cell.slotB);
  const hostSlotA = isHostContentKind(slotA) ? sanitizeHostBinding(cell.hostSlotA) : null;
  const hostSlotB = isHostContentKind(slotB) ? sanitizeHostBinding(cell.hostSlotB) : null;
  const songSlotA = isSongConfigurableContent(slotA) ? sanitizeSongSlot(cell.songSlotA) : null;
  const songSlotB = isSongConfigurableContent(slotB) ? sanitizeSongSlot(cell.songSlotB) : null;
  const cycleTime = cell.cycleTime ?? null;
  const transitionStyle = cell.transitionStyle === 'fade' ? 'fade' : 'replace';
  const backgroundColor = pickOptionalHex(cell.backgroundColor);
  const borderColor = pickOptionalHex(cell.borderColor);
  const borderStyle = pickOptionalBorderStyle(cell.borderStyle);
  const borderThicknessPx = pickOptionalBorderThickness(cell.borderThicknessPx);
  const lockAppearanceToGrid = cell.lockAppearanceToGrid === true ? true : undefined;
  const savedRegionAppearance = sanitizeSavedRegionAppearance(cell.savedRegionAppearance, 'area');
  return {
    slotA,
    slotB,
    hostSlotA,
    hostSlotB,
    songSlotA,
    songSlotB,
    cycleTime,
    transitionStyle,
    ...(backgroundColor !== undefined ? { backgroundColor } : {}),
    ...(borderColor !== undefined ? { borderColor } : {}),
    ...(borderStyle !== undefined ? { borderStyle } : {}),
    ...(borderThicknessPx !== undefined ? { borderThicknessPx } : {}),
    ...(lockAppearanceToGrid ? { lockAppearanceToGrid: true } : {}),
    ...(savedRegionAppearance ? { savedRegionAppearance } : {}),
  };
}

function sanitizeCells(raw: unknown): VcCellAssignment[] {
  const cells = Array.isArray(raw) ? raw.map(sanitizeCell) : defaultCells();
  while (cells.length < VC_MAX_BASE_AREAS) cells.push(emptyCell());
  return cells.slice(0, VC_MAX_BASE_AREAS);
}

function sanitizeFloatContent(
  raw: unknown,
  floats: VcFloatGeometry[],
): Record<string, VcCellAssignment> {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const result: Record<string, VcCellAssignment> = {};
  for (const float of floats) {
    result[float.id] = sanitizeCell(source[float.id]);
  }
  // Preserve dormant float content for ids not currently present (cheap restore if re-added).
  for (const [id, value] of Object.entries(source)) {
    if (!result[id]) result[id] = sanitizeCell(value);
  }
  return result;
}

export function normalizeVcConfig(config: VcModeConfig): VcModeConfig {
  const templateId = isVcTemplateId(config.surface?.templateId)
    ? config.surface.templateId
    : VC_SAFE_TEMPLATE_ID;
  const floats = sanitizeFloats(config.surface?.floats);
  const dividers = resolveDividers(templateId, config.surface?.dividers);
  const cells = sanitizeCells(config.cells);
  const floatContent = sanitizeFloatContent(config.floatContent, floats);

  return {
    surface: { templateId, dividers, floats },
    cells,
    floatContent,
    visualizerId: config.visualizerId,
    visualizerChangeRule: sanitizeVisualizerChangeRule(config.visualizerChangeRule),
    visualizerSequence: sanitizeVisualizerSequence(config.visualizerSequence),
    useFallbacks: config.useFallbacks !== false,
    gridDesign: sanitizeGridDesign(config.gridDesign),
  };
}

/** Only one region (base or float) may use the visualizer content type. */
export function assignVisualizerToRegion(
  config: VcModeConfig,
  target: { kind: 'area'; index: number } | { kind: 'float'; id: string },
  slot: 'slotA' | 'slotB',
): VcModeConfig {
  const cells = config.cells.map((cell, index) => {
    const next = { ...cell };
    const isTarget = target.kind === 'area' && target.index === index;
    if (!isTarget) {
      if (next.slotA === 'visualizer') next.slotA = '';
      if (next.slotB === 'visualizer') next.slotB = '';
    }
    return next;
  });

  const floatContent: Record<string, VcCellAssignment> = {};
  for (const [id, cell] of Object.entries(config.floatContent)) {
    const next = { ...cell };
    const isTarget = target.kind === 'float' && target.id === id;
    if (!isTarget) {
      if (next.slotA === 'visualizer') next.slotA = '';
      if (next.slotB === 'visualizer') next.slotB = '';
    }
    floatContent[id] = next;
  }

  if (target.kind === 'area') {
    const cell = { ...cells[target.index] };
    cell[slot] = 'visualizer';
    cells[target.index] = cell;
  } else {
    const cell = { ...(floatContent[target.id] ?? emptyCell()) };
    cell[slot] = 'visualizer';
    floatContent[target.id] = cell;
  }

  return { ...config, cells, floatContent };
}

export function resolveCellCycleTime(cell: VcCellAssignment): VcCycleTime | null {
  const hasA = cell.slotA !== '';
  const hasB = cell.slotB !== '';
  if (!hasA && !hasB) return null;
  if (hasA !== hasB) return null;
  return cell.cycleTime;
}

/** Switch template while preserving area content by number and leaving floats alone. */
export function switchTemplate(config: VcModeConfig, templateId: VcTemplateId): VcModeConfig {
  const previousDefaults = defaultDividersForTemplate(config.surface.templateId);
  const nextDefaults = defaultDividersForTemplate(templateId);
  // Carry over divider values only when the key exists in both templates.
  const dividers: Record<string, number> = { ...nextDefaults };
  for (const [key, value] of Object.entries(config.surface.dividers)) {
    if (key in nextDefaults && key in previousDefaults) {
      dividers[key] = value;
    }
  }

  return normalizeVcConfig({
    ...config,
    surface: {
      ...config.surface,
      templateId,
      dividers: resolveDividers(templateId, dividers),
    },
  });
}

export function resetTemplateProportions(config: VcModeConfig): VcModeConfig {
  return normalizeVcConfig({
    ...config,
    surface: {
      ...config.surface,
      dividers: defaultDividersForTemplate(config.surface.templateId),
    },
  });
}
