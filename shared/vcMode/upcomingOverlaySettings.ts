/** VC Mode hotkey overlay — upcoming queue list position and length. */

export type VcUpcomingOverlayPosition = 'left' | 'center' | 'right';

export type VcUpcomingOverlayMaxCount = 5 | 10 | 15 | 20;

export type VcUpcomingOverlaySettings = {
  position: VcUpcomingOverlayPosition;
  maxCount: VcUpcomingOverlayMaxCount;
};

export const VC_UPCOMING_OVERLAY_POSITION_OPTIONS: Array<{
  value: VcUpcomingOverlayPosition;
  label: string;
}> = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

export const VC_UPCOMING_OVERLAY_MAX_OPTIONS: VcUpcomingOverlayMaxCount[] = [5, 10, 15, 20];

export const DEFAULT_VC_UPCOMING_OVERLAY_SETTINGS: VcUpcomingOverlaySettings = {
  position: 'center',
  maxCount: 10,
};

const POSITION_SET = new Set<string>(VC_UPCOMING_OVERLAY_POSITION_OPTIONS.map((row) => row.value));
const MAX_SET = new Set<number>(VC_UPCOMING_OVERLAY_MAX_OPTIONS);

export function sanitizeUpcomingOverlaySettings(raw: unknown): VcUpcomingOverlaySettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_VC_UPCOMING_OVERLAY_SETTINGS };
  }

  const value = raw as Record<string, unknown>;
  const position =
    typeof value.position === 'string' && POSITION_SET.has(value.position)
      ? (value.position as VcUpcomingOverlayPosition)
      : DEFAULT_VC_UPCOMING_OVERLAY_SETTINGS.position;

  const maxCount =
    typeof value.maxCount === 'number' && MAX_SET.has(value.maxCount)
      ? (value.maxCount as VcUpcomingOverlayMaxCount)
      : DEFAULT_VC_UPCOMING_OVERLAY_SETTINGS.maxCount;

  return { position, maxCount };
}
