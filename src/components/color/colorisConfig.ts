import Coloris from '@melloware/coloris';

import { DEFAULT_VC_GRID_DESIGN } from '@shared/vcMode/gridDesign';

import { isValidHexColor, normalizeHexColor } from './normalizeHex';

/** Recurring VC surface colors — quick picks in the designer. */
export const VC_COLOR_SWATCHES = [
  DEFAULT_VC_GRID_DESIGN.backgroundColor,
  DEFAULT_VC_GRID_DESIGN.defaultTypography.color,
  '#e8ecf4',
  '#b7c0d1',
  DEFAULT_VC_GRID_DESIGN.gridLines.color,
  DEFAULT_VC_GRID_DESIGN.floatLines.color,
  '#1a1f2e',
  '#0a1220',
] as const;

const VC_COLOR_FIELD_SELECTOR = '.vc-color-field-input';

let colorisReady = false;

/** One-time Coloris setup for Song Pages designer surfaces. */
export function ensureVcColoris(): void {
  if (colorisReady) return;
  colorisReady = true;

  Coloris.init();

  Coloris.setInstance(VC_COLOR_FIELD_SELECTOR, {
    theme: 'pill',
    themeMode: 'dark',
    format: 'hex',
    formatToggle: false,
    alpha: false,
    focusInput: true,
    closeButton: true,
    closeLabel: 'Done',
    margin: 10,
    swatches: [...VC_COLOR_SWATCHES],
  });
}

/** Bind Coloris to a single field (safe to call when React mounts dynamic inputs). */
export function bindVcColorField(input: HTMLInputElement): void {
  ensureVcColoris();
  Coloris({ el: input, wrap: true });
}

export function closeVcColorPicker(): void {
  if (!colorisReady) return;
  Coloris.close();
}

export function readColorFieldValue(input: HTMLInputElement): string {
  const normalized = normalizeHexColor(input.value);
  return isValidHexColor(normalized) ? normalized : input.value;
}
