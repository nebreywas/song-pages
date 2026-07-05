/**
 * Host Content typography — style/size ids, labels, normalization, CSS mapping.
 * Matches Host-content-design.md font tables.
 */

import type { HostFontSizeId, HostFontStyleId } from './types';

export const HOST_FONT_STYLE_LABELS: Record<HostFontStyleId, string> = {
  clean: 'Clean',
  bold: 'Bold',
  condensed: 'Condensed',
  elegant: 'Elegant',
  classic: 'Classic',
  playful: 'Playful',
  retro: 'Retro',
  digital: 'Digital',
  handwritten: 'Handwritten',
  mono: 'Mono',
  impact: 'Impact',
  editorial: 'Editorial',
};

export const HOST_FONT_SIZE_LABELS: Record<HostFontSizeId, string> = {
  tiny: 'Tiny',
  'very-small': 'Very Small',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  'x-large': 'X-Large',
  display: 'Display',
  hero: 'Hero',
};

/** Pixel sizes from the Host Content spec. */
export const HOST_FONT_SIZE_PX: Record<HostFontSizeId, number> = {
  tiny: 9,
  'very-small': 12,
  small: 18,
  medium: 24,
  large: 32,
  'x-large': 48,
  display: 72,
  hero: 96,
};

export const HOST_FONT_STYLE_IDS = Object.keys(HOST_FONT_STYLE_LABELS) as HostFontStyleId[];

export const HOST_FONT_SIZE_IDS = Object.keys(HOST_FONT_SIZE_LABELS) as HostFontSizeId[];

const VALID_FONT_STYLES = new Set<string>(HOST_FONT_STYLE_IDS);
const VALID_FONT_SIZES = new Set<string>(HOST_FONT_SIZE_IDS);

/**
 * CSS font-family stacks — bundled faces use SongPages-* names loaded in hostContentFonts.css.
 */
export const HOST_FONT_FAMILY: Record<HostFontStyleId, string> = {
  clean: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  bold: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  condensed: '"Avenir Next Condensed", "Arial Narrow", sans-serif',
  elegant: 'Didot, "Bodoni 72", "Bodoni MT", Georgia, serif',
  classic: 'Georgia, "Times New Roman", serif',
  playful: '"SongPages Playful", "Baloo 2", system-ui, sans-serif',
  retro: '"SongPages Retro", Bungee, Impact, sans-serif',
  digital: '"SongPages Digital", Orbitron, ui-monospace, monospace',
  handwritten: '"SongPages Handwritten", Caveat, cursive',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  impact: 'Impact, Haettenschweiler, sans-serif',
  editorial: '"Iowan Old Style", Palatino, "Palatino Linotype", Georgia, serif',
};

export const HOST_FONT_WEIGHT: Partial<Record<HostFontStyleId, number>> = {
  bold: 700,
  impact: 700,
};

export const HOST_FONT_STRETCH: Partial<Record<HostFontStyleId, string>> = {
  condensed: 'condensed',
};

export function normalizeFontStyleId(raw: unknown): HostFontStyleId {
  if (typeof raw === 'string' && VALID_FONT_STYLES.has(raw)) {
    return raw as HostFontStyleId;
  }
  return 'clean';
}

export function normalizeFontSizeId(raw: unknown): HostFontSizeId {
  if (raw === 'xlarge') return 'x-large';
  if (typeof raw === 'string' && VALID_FONT_SIZES.has(raw)) {
    return raw as HostFontSizeId;
  }
  return 'medium';
}

export type HostTextCssStyle = {
  color: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  fontStretch?: string;
  lineHeight: number;
};

/** Build inline CSS for host title/area text previews and live VC rendering. */
export function hostTextCssStyle(
  fontStyle: HostFontStyleId,
  fontSize: HostFontSizeId,
  color: string,
): HostTextCssStyle {
  return {
    color,
    fontFamily: HOST_FONT_FAMILY[fontStyle],
    fontSize: `${HOST_FONT_SIZE_PX[fontSize]}px`,
    fontWeight: HOST_FONT_WEIGHT[fontStyle] ?? 400,
    fontStretch: HOST_FONT_STRETCH[fontStyle],
    lineHeight: 1.35,
  };
}
