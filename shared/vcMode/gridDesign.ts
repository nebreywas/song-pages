/**
 * Surface grid appearance — background, default typography, grid/float lines.
 * Typography defaults apply unless a content assignment overrides font fields.
 */

import {
  normalizeFontSizeId,
  normalizeFontStyleId,
  type HostFontSizeId,
  type HostFontStyleId,
} from '../hostContent';

export type GridDividerCss = Record<string, string | number | undefined>;

export type VcGridLineStyle = 'solid' | 'dotted' | 'dashed' | 'double';

export type VcGridLineSettings = {
  style: VcGridLineStyle;
  /** 0 hides lines. */
  thicknessPx: number;
  color: string;
};

export type VcGridDefaultTypography = {
  fontStyle: HostFontStyleId;
  fontSize: HostFontSizeId;
  color: string;
};

export type VcGridDesignSettings = {
  backgroundColor: string;
  defaultTypography: VcGridDefaultTypography;
  /** Divider lines between template areas. */
  gridLines: VcGridLineSettings;
  /** Outline applied to all floats (designer + live VC). */
  floatLines: VcGridLineSettings;
  /** Default fill behind float content (each float may override). */
  floatBackground: VcFloatBackgroundSettings;
  /** Optional host graphic stretched beneath the entire surface. */
  fullscreenGraphic: VcGridFullscreenGraphic;
};

/** Full-surface host graphic — sits above background color, below areas/floats. */
export type VcGridFullscreenGraphic = {
  /** Host catalog graphic id; null hides the layer. */
  itemId: string | null;
  /** 0 = hidden, 100 = fully opaque over the background color. */
  opacityPct: number;
};

export const DEFAULT_VC_FULLSCREEN_GRAPHIC: VcGridFullscreenGraphic = {
  itemId: null,
  opacityPct: 100,
};

/** Background fill shared by floats unless a float overrides color/opacity. */
export type VcFloatBackgroundSettings = {
  color: string;
  /** 0 = transparent fill, 100 = opaque. */
  opacityPct: number;
};

export const DEFAULT_VC_FLOAT_BACKGROUND: VcFloatBackgroundSettings = {
  color: '#000000',
  opacityPct: 0,
};

export const VC_GRID_LINE_STYLE_OPTIONS: Array<{ value: VcGridLineStyle; label: string }> = [
  { value: 'solid', label: 'Line' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'double', label: 'Double line' },
];

export const DEFAULT_VC_GRID_DESIGN: VcGridDesignSettings = {
  backgroundColor: '#000000',
  defaultTypography: {
    fontStyle: 'clean',
    fontSize: 'medium',
    color: '#ffffff',
  },
  gridLines: {
    style: 'solid',
    thicknessPx: 1,
    color: '#5c677a',
  },
  floatLines: {
    style: 'solid',
    thicknessPx: 1,
    color: '#5b9fd4',
  },
  floatBackground: { ...DEFAULT_VC_FLOAT_BACKGROUND },
  fullscreenGraphic: { ...DEFAULT_VC_FULLSCREEN_GRAPHIC },
};

const LINE_STYLES = new Set<VcGridLineStyle>(['solid', 'dotted', 'dashed', 'double']);

function pickColor(raw: unknown, fallback: string): string {
  return typeof raw === 'string' && /^#[0-9a-f]{6}$/i.test(raw) ? raw : fallback;
}

function clampLineThickness(value: number): number {
  return Math.min(20, Math.max(0, Math.round(value)));
}

function sanitizeLineSettings(raw: unknown, fallback: VcGridLineSettings): VcGridLineSettings {
  if (!raw || typeof raw !== 'object') return { ...fallback };
  const value = raw as Partial<VcGridLineSettings>;
  const style =
    typeof value.style === 'string' && LINE_STYLES.has(value.style as VcGridLineStyle)
      ? (value.style as VcGridLineStyle)
      : fallback.style;
  return {
    style,
    thicknessPx:
      typeof value.thicknessPx === 'number' && Number.isFinite(value.thicknessPx)
        ? clampLineThickness(value.thicknessPx)
        : fallback.thicknessPx,
    color: pickColor(value.color, fallback.color),
  };
}

function clampOpacityPct(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function sanitizeFloatBackground(raw: unknown, fallback: VcFloatBackgroundSettings): VcFloatBackgroundSettings {
  if (!raw || typeof raw !== 'object') return { ...fallback };
  const value = raw as Partial<VcFloatBackgroundSettings>;
  return {
    color: pickColor(value.color, fallback.color),
    opacityPct:
      typeof value.opacityPct === 'number' && Number.isFinite(value.opacityPct)
        ? clampOpacityPct(value.opacityPct)
        : fallback.opacityPct,
  };
}

function sanitizeFullscreenGraphic(raw: unknown, fallback: VcGridFullscreenGraphic): VcGridFullscreenGraphic {
  if (!raw || typeof raw !== 'object') return { ...fallback };
  const value = raw as Partial<VcGridFullscreenGraphic>;
  const itemId =
    typeof value.itemId === 'string' && value.itemId.trim() ? value.itemId.trim() : null;
  return {
    itemId,
    opacityPct:
      typeof value.opacityPct === 'number' && Number.isFinite(value.opacityPct)
        ? clampOpacityPct(value.opacityPct)
        : fallback.opacityPct,
  };
}

/** Normalize persisted grid design settings. */
export function sanitizeGridDesign(raw: unknown): VcGridDesignSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_VC_GRID_DESIGN };
  const value = raw as Partial<VcGridDesignSettings> & { lines?: Partial<VcGridLineSettings> };
  const base = DEFAULT_VC_GRID_DESIGN;

  const typographyRaw =
    value.defaultTypography && typeof value.defaultTypography === 'object'
      ? (value.defaultTypography as Partial<VcGridDefaultTypography>)
      : {};

  // Migrate legacy single `lines` field → gridLines.
  const legacyLines = value.lines;
  const gridLinesRaw = value.gridLines ?? legacyLines;

  return {
    backgroundColor: pickColor(value.backgroundColor, base.backgroundColor),
    defaultTypography: {
      fontStyle: normalizeFontStyleId(typographyRaw.fontStyle ?? base.defaultTypography.fontStyle),
      fontSize: normalizeFontSizeId(typographyRaw.fontSize ?? base.defaultTypography.fontSize),
      color: pickColor(typographyRaw.color, base.defaultTypography.color),
    },
    gridLines: sanitizeLineSettings(gridLinesRaw, base.gridLines),
    floatLines: sanitizeLineSettings(value.floatLines, base.floatLines),
    floatBackground: sanitizeFloatBackground(value.floatBackground, base.floatBackground),
    fullscreenGraphic: sanitizeFullscreenGraphic(value.fullscreenGraphic, base.fullscreenGraphic),
  };
}

/** CSS for draggable grid divider bars (designer + live VC). */
export function gridDividerCss(
  axis: 'vertical' | 'horizontal',
  lines: VcGridLineSettings,
): GridDividerCss {
  const thickness = lines.thicknessPx;
  if (thickness <= 0) {
    return { opacity: 0, pointerEvents: 'none' as const };
  }

  const borderSide = axis === 'vertical' ? 'borderLeft' : 'borderTop';
  const crossSize = axis === 'vertical' ? 'width' : 'height';

  if (lines.style === 'solid') {
    return {
      background: lines.color,
      [crossSize]: `${thickness}px`,
      border: 'none',
    };
  }

  return {
    background: 'transparent',
    [crossSize]: `${thickness}px`,
    [borderSide]: `${thickness}px ${lines.style} ${lines.color}`,
    boxSizing: 'border-box' as const,
  };
}

export type VcRegionBorderOverrides = {
  borderColor?: string;
  borderStyle?: VcGridLineStyle;
  borderThicknessPx?: number;
};

/** Per-region appearance fields including optional lock to grid defaults. */
export type VcRegionAppearanceSnapshot = {
  backgroundColor: string;
  borderColor: string;
  borderStyle: VcGridLineStyle;
  borderThicknessPx: number;
  backgroundOpacityPct?: number;
  contentOpacityPct?: number;
};

export type VcRegionAppearanceState = VcRegionBorderOverrides & {
  backgroundColor?: string;
  backgroundOpacityPct?: number;
  contentOpacityPct?: number;
  /** When true, live rendering uses grid defaults; savedRegionAppearance holds the prior values. */
  lockAppearanceToGrid?: boolean;
  savedRegionAppearance?: VcRegionAppearanceSnapshot;
};

export type VcRegionAppearanceMode = 'area' | 'float';

/** Overrides that affect live rendering — empty while locked to grid defaults. */
export function effectiveRegionAppearanceOverrides(
  region: VcRegionAppearanceState,
): VcRegionBorderOverrides & {
  backgroundColor?: string;
  backgroundOpacityPct?: number;
  contentOpacityPct?: number;
} {
  if (region.lockAppearanceToGrid) return {};
  const { lockAppearanceToGrid: _lock, savedRegionAppearance: _saved, ...overrides } = region;
  return overrides;
}

/** Capture the appearance currently in effect (before locking to grid defaults). */
export function captureRegionAppearanceSnapshot(
  region: VcRegionAppearanceState,
  gridDesign: VcGridDesignSettings,
  mode: VcRegionAppearanceMode,
): VcRegionAppearanceSnapshot {
  if (region.lockAppearanceToGrid && region.savedRegionAppearance) {
    return { ...region.savedRegionAppearance };
  }

  const unlocked = { ...region, lockAppearanceToGrid: false, savedRegionAppearance: undefined };
  const border = resolveRegionBorder(unlocked, gridDesign);
  const floatDefaults = gridDesign.floatBackground ?? DEFAULT_VC_FLOAT_BACKGROUND;

  if (mode === 'float') {
    const appearance = resolveFloatAppearance(unlocked, gridDesign);
    return {
      backgroundColor: appearance.backgroundColor,
      borderColor: border.color,
      borderStyle: border.style,
      borderThicknessPx: border.thicknessPx,
      backgroundOpacityPct: appearance.backgroundOpacityPct,
      contentOpacityPct: appearance.contentOpacityPct,
    };
  }

  return {
    backgroundColor: resolveAreaBackgroundColor(unlocked, gridDesign),
    borderColor: border.color,
    borderStyle: border.style,
    borderThicknessPx: border.thicknessPx,
  };
}

/** Convert a snapshot back into sparse overrides (omit fields that match grid defaults). */
export function snapshotToSparseAppearanceOverrides(
  snapshot: VcRegionAppearanceSnapshot,
  gridDesign: VcGridDesignSettings,
  mode: VcRegionAppearanceMode,
): VcRegionBorderOverrides & {
  backgroundColor?: string;
  backgroundOpacityPct?: number;
  contentOpacityPct?: number;
} {
  const lines = gridDesign.floatLines;
  const floatDefaults = gridDesign.floatBackground ?? DEFAULT_VC_FLOAT_BACKGROUND;
  const areaBackgroundDefault = gridDesign.backgroundColor;

  const next: VcRegionBorderOverrides & {
    backgroundColor?: string;
    backgroundOpacityPct?: number;
    contentOpacityPct?: number;
  } = {};

  const backgroundDefault = mode === 'float' ? floatDefaults.color : areaBackgroundDefault;
  if (snapshot.backgroundColor !== backgroundDefault) {
    next.backgroundColor = snapshot.backgroundColor;
  }
  if (snapshot.borderColor !== lines.color) next.borderColor = snapshot.borderColor;
  if (snapshot.borderStyle !== lines.style) next.borderStyle = snapshot.borderStyle;
  if (snapshot.borderThicknessPx !== lines.thicknessPx) {
    next.borderThicknessPx = snapshot.borderThicknessPx;
  }

  if (mode === 'float') {
    if (
      typeof snapshot.backgroundOpacityPct === 'number' &&
      snapshot.backgroundOpacityPct !== floatDefaults.opacityPct
    ) {
      next.backgroundOpacityPct = snapshot.backgroundOpacityPct;
    }
    if (typeof snapshot.contentOpacityPct === 'number' && snapshot.contentOpacityPct !== 100) {
      next.contentOpacityPct = snapshot.contentOpacityPct;
    }
  }

  return next;
}

const APPEARANCE_OVERRIDE_CLEAR: Partial<VcRegionAppearanceState> = {
  backgroundColor: undefined,
  borderColor: undefined,
  borderStyle: undefined,
  borderThicknessPx: undefined,
  backgroundOpacityPct: undefined,
  contentOpacityPct: undefined,
};

/** Toggle lock — snapshots current values on lock, restores them on unlock. */
export function buildRegionAppearanceLockPatch(
  region: VcRegionAppearanceState,
  gridDesign: VcGridDesignSettings,
  locked: boolean,
  mode: VcRegionAppearanceMode,
): Partial<VcRegionAppearanceState> {
  if (locked) {
    return {
      lockAppearanceToGrid: true,
      savedRegionAppearance: captureRegionAppearanceSnapshot(region, gridDesign, mode),
      ...APPEARANCE_OVERRIDE_CLEAR,
    };
  }

  const snapshot =
    region.savedRegionAppearance ?? captureRegionAppearanceSnapshot(region, gridDesign, mode);

  return {
    lockAppearanceToGrid: false,
    savedRegionAppearance: undefined,
    ...APPEARANCE_OVERRIDE_CLEAR,
    ...snapshotToSparseAppearanceOverrides(snapshot, gridDesign, mode),
  };
}

/** Apply a control edit — routes to savedRegionAppearance while locked. */
export function patchRegionAppearanceField(
  region: VcRegionAppearanceState,
  patch: Partial<VcRegionAppearanceSnapshot & VcRegionBorderOverrides & VcRegionAppearanceState>,
): Partial<VcRegionAppearanceState> {
  if (!region.lockAppearanceToGrid || !region.savedRegionAppearance) {
    return patch;
  }

  const { lockAppearanceToGrid: _lock, savedRegionAppearance: _saved, ...appearancePatch } = patch;
  if (Object.keys(appearancePatch).length === 0) {
    return patch;
  }

  return {
    savedRegionAppearance: {
      ...region.savedRegionAppearance,
      ...appearancePatch,
    },
  };
}

function sanitizeAppearanceSnapshot(
  raw: unknown,
  mode: VcRegionAppearanceMode,
  gridDesign: VcGridDesignSettings,
): VcRegionAppearanceSnapshot | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const value = raw as Partial<VcRegionAppearanceSnapshot>;
  const lines = gridDesign.floatLines;
  const floatDefaults = gridDesign.floatBackground ?? DEFAULT_VC_FLOAT_BACKGROUND;
  const style = pickOptionalBorderStyle(value.borderStyle) ?? lines.style;
  const thicknessPx = pickOptionalBorderThickness(value.borderThicknessPx) ?? lines.thicknessPx;

  const snapshot: VcRegionAppearanceSnapshot = {
    backgroundColor: pickColor(
      value.backgroundColor,
      mode === 'float' ? floatDefaults.color : gridDesign.backgroundColor,
    ),
    borderColor: pickColor(value.borderColor, lines.color),
    borderStyle: style,
    borderThicknessPx: thicknessPx,
  };

  if (mode === 'float') {
    const backgroundOpacityPct = clampOpacityPct(value.backgroundOpacityPct);
    const contentOpacityPct = clampOpacityPct(value.contentOpacityPct);
    if (backgroundOpacityPct !== undefined) snapshot.backgroundOpacityPct = backgroundOpacityPct;
    if (contentOpacityPct !== undefined) snapshot.contentOpacityPct = contentOpacityPct;
  }

  return snapshot;
}

export function sanitizeSavedRegionAppearance(
  raw: unknown,
  mode: VcRegionAppearanceMode,
  gridDesign: VcGridDesignSettings = DEFAULT_VC_GRID_DESIGN,
): VcRegionAppearanceSnapshot | undefined {
  return sanitizeAppearanceSnapshot(raw, mode, gridDesign);
}

function mergeRegionBorder(
  overrides: VcRegionBorderOverrides,
  gridDesign: VcGridDesignSettings,
): VcGridLineSettings {
  const defaults = gridDesign.floatLines;
  return {
    style: overrides.borderStyle ?? defaults.style,
    thicknessPx: overrides.borderThicknessPx ?? defaults.thicknessPx,
    color: overrides.borderColor ?? defaults.color,
  };
}

/** Border settings shown in the layout editor (saved snapshot while locked). */
export function resolveRegionBorderDraft(
  overrides: VcRegionAppearanceState,
  gridDesign: VcGridDesignSettings,
): VcGridLineSettings {
  if (overrides.lockAppearanceToGrid && overrides.savedRegionAppearance) {
    const saved = overrides.savedRegionAppearance;
    return {
      style: saved.borderStyle,
      thicknessPx: saved.borderThicknessPx,
      color: saved.borderColor,
    };
  }
  const { lockAppearanceToGrid: _lock, savedRegionAppearance: _saved, ...draft } = overrides;
  return mergeRegionBorder(draft, gridDesign);
}

export function pickOptionalBorderStyle(raw: unknown): VcGridLineStyle | undefined {
  return typeof raw === 'string' && LINE_STYLES.has(raw as VcGridLineStyle)
    ? (raw as VcGridLineStyle)
    : undefined;
}

export function pickOptionalBorderThickness(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
  return clampLineThickness(raw);
}

/** True when a region stores its own border fields (areas skip outline until set). */
export function regionHasBorderOverride(overrides: VcRegionAppearanceState): boolean {
  if (overrides.lockAppearanceToGrid) return false;
  return (
    overrides.borderColor !== undefined ||
    overrides.borderStyle !== undefined ||
    overrides.borderThicknessPx !== undefined
  );
}

/** Merge per-region border overrides with grid float line defaults (respects lock). */
export function resolveRegionBorder(
  overrides: VcRegionAppearanceState,
  gridDesign: VcGridDesignSettings,
): VcGridLineSettings {
  return mergeRegionBorder(effectiveRegionAppearanceOverrides(overrides), gridDesign);
}

/** CSS border outline for a float or area region. */
export function regionOutlineCss(
  overrides: VcRegionBorderOverrides,
  gridDesign: VcGridDesignSettings,
): GridDividerCss {
  return floatOutlineCss(resolveRegionBorder(overrides, gridDesign));
}

/** Per-float border color — override or grid float line color. */
export function resolveFloatBorderColor(
  float: VcRegionBorderOverrides,
  gridDesign: VcGridDesignSettings,
): string {
  return resolveRegionBorder(float, gridDesign).color;
}

/** CSS border outline for a float (thickness/style from grid, optional overrides). */
export function floatOutlineCssForFloat(
  float: VcRegionBorderOverrides,
  gridDesign: VcGridDesignSettings,
): GridDividerCss {
  return regionOutlineCss(float, gridDesign);
}

/** CSS border outline for float regions (designer + live VC). */
export function floatOutlineCss(lines: VcGridLineSettings): GridDividerCss {
  const thickness = lines.thicknessPx;
  if (thickness <= 0) {
    return { border: 'none', boxShadow: 'none' };
  }

  return {
    border: `${thickness}px ${lines.style} ${lines.color}`,
    boxSizing: 'border-box' as const,
    boxShadow: 'none',
  };
}

/** Convert #rrggbb + 0–100% opacity to rgba() for float backgrounds. */
export function hexColorWithAlpha(hex: string, opacityPct: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return `rgba(0, 0, 0, ${clampOpacityPct(opacityPct) / 100})`;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${clampOpacityPct(opacityPct) / 100})`;
}

export type ResolvedFloatAppearance = {
  backgroundColor: string;
  backgroundOpacityPct: number;
  contentOpacityPct: number;
};

/** Merge grid defaults with optional per-float transparency overrides (respects lock). */
export function resolveFloatAppearance(
  float: VcRegionAppearanceState,
  gridDesign: VcGridDesignSettings,
): ResolvedFloatAppearance {
  const effective = effectiveRegionAppearanceOverrides(float);
  const defaults = gridDesign.floatBackground ?? DEFAULT_VC_FLOAT_BACKGROUND;
  return {
    backgroundColor: effective.backgroundColor ?? defaults.color,
    backgroundOpacityPct: effective.backgroundOpacityPct ?? defaults.opacityPct,
    contentOpacityPct:
      typeof effective.contentOpacityPct === 'number' && Number.isFinite(effective.contentOpacityPct)
        ? clampOpacityPct(effective.contentOpacityPct)
        : 100,
  };
}

/** Draft float appearance for the layout editor (saved snapshot while locked). */
export function resolveFloatAppearanceDraft(
  float: VcRegionAppearanceState,
  gridDesign: VcGridDesignSettings,
): ResolvedFloatAppearance {
  if (float.lockAppearanceToGrid && float.savedRegionAppearance) {
    const saved = float.savedRegionAppearance;
    const defaults = gridDesign.floatBackground ?? DEFAULT_VC_FLOAT_BACKGROUND;
    return {
      backgroundColor: saved.backgroundColor,
      backgroundOpacityPct: saved.backgroundOpacityPct ?? defaults.opacityPct,
      contentOpacityPct: saved.contentOpacityPct ?? 100,
    };
  }
  const { lockAppearanceToGrid: _lock, savedRegionAppearance: _saved, ...draft } = float;
  return resolveFloatAppearance({ ...draft, lockAppearanceToGrid: false }, gridDesign);
}

/** Background fill + optional content opacity for float regions. */
export function floatAppearanceCss(
  float: VcRegionAppearanceState,
  gridDesign: VcGridDesignSettings,
): { region: GridDividerCss; content: GridDividerCss } {
  const appearance = resolveFloatAppearance(float, gridDesign);
  const region: GridDividerCss = {
    background:
      appearance.backgroundOpacityPct > 0
        ? hexColorWithAlpha(appearance.backgroundColor, appearance.backgroundOpacityPct)
        : 'transparent',
  };
  const content: GridDividerCss =
    appearance.contentOpacityPct < 100
      ? { opacity: appearance.contentOpacityPct / 100 }
      : {};
  return { region, content };
}

export function getFullscreenGraphic(gridDesign: VcGridDesignSettings): VcGridFullscreenGraphic {
  return gridDesign.fullscreenGraphic ?? DEFAULT_VC_FULLSCREEN_GRAPHIC;
}

export function hasActiveFullscreenGraphic(gridDesign: VcGridDesignSettings): boolean {
  const graphic = getFullscreenGraphic(gridDesign);
  return Boolean(graphic.itemId && graphic.opacityPct > 0);
}

/** Base-area fill — transparent while a fullscreen graphic is active, else grid default or override. */
export function resolveAreaBackgroundColor(
  cell: { backgroundColor?: string; lockAppearanceToGrid?: boolean },
  gridDesign: VcGridDesignSettings,
): string {
  if (hasActiveFullscreenGraphic(gridDesign)) {
    return 'transparent';
  }
  if (cell.lockAppearanceToGrid) {
    return gridDesign.backgroundColor;
  }
  return cell.backgroundColor ?? gridDesign.backgroundColor;
}

/** Color shown in area layout UI (saved snapshot while locked). */
export function resolveAreaBackgroundDisplayColor(
  cell: VcRegionAppearanceState,
  gridDesign: VcGridDesignSettings,
): string {
  if (cell.lockAppearanceToGrid && cell.savedRegionAppearance) {
    return cell.savedRegionAppearance.backgroundColor;
  }
  return cell.backgroundColor ?? gridDesign.backgroundColor;
}

function isOpaqueRegionFill(background: string | undefined): boolean {
  if (!background || background === 'transparent') return false;
  const rgba = background.match(
    /^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)$/i,
  );
  if (rgba) return Number(rgba[1]) >= 0.98;
  return true;
}

/** Color for lyrics edge overlays — matches the visible region fill, else grid canvas. */
export function resolveLyricsFadeBackground(
  regionBackground: string | undefined,
  gridBackgroundColor: string,
): string {
  return isOpaqueRegionFill(regionBackground) ? regionBackground! : gridBackgroundColor;
}
