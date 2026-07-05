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
