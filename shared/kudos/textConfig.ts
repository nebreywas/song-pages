import { normalizeFontStyleId } from '@shared/hostContent/typography';
import type { HostFontStyleId } from '@shared/hostContent/types';

import { KUDOS_DURATION_DEFAULT_MS, KUDOS_DURATION_MAX_MS, KUDOS_DURATION_MIN_MS, KUDOS_TEXT_MAX_GRAPHEMES } from './constants';
import { KUDO_TEXT_EFFECT_IDS } from './effects';
import { countGraphemes, truncateToMaxGraphemes } from './graphemes';
import type { KudoTextOutline, KudoTextPlacement, KudoTextShadow, TextKudoConfig } from './types';
import { normalizeKudoHexColor } from './particleColors';

function pickOutline(value: unknown): KudoTextOutline {
  return value === 'light' || value === 'heavy' ? value : 'off';
}

function pickShadow(value: unknown): KudoTextShadow {
  return value === 'soft' || value === 'hard' ? value : 'off';
}

function pickPlacement(value: unknown): KudoTextPlacement {
  const placements: KudoTextPlacement[] = ['auto', 'center', 'top', 'bottom', 'left', 'right'];
  return placements.includes(value as KudoTextPlacement) ? (value as KudoTextPlacement) : 'center';
}

/** Normalize host text for a Kudo preset (grapheme limit §3.3). */
export function sanitizeKudoTextValue(raw: unknown): string {
  if (typeof raw !== 'string') return 'AWESOME!';
  const trimmed = raw.trim();
  if (!trimmed) return 'AWESOME!';
  return truncateToMaxGraphemes(trimmed, KUDOS_TEXT_MAX_GRAPHEMES);
}

export function sanitizeTextKudoConfig(raw: unknown): TextKudoConfig | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const row = raw as Record<string, unknown>;

  const value = sanitizeKudoTextValue(row.value);
  const effectId =
    typeof row.effectId === 'string' && KUDO_TEXT_EFFECT_IDS.includes(row.effectId as never)
      ? row.effectId
      : 'slam';

  const durationMs =
    typeof row.durationMs === 'number' && Number.isFinite(row.durationMs)
      ? Math.min(KUDOS_DURATION_MAX_MS, Math.max(KUDOS_DURATION_MIN_MS, Math.round(row.durationMs)))
      : KUDOS_DURATION_DEFAULT_MS;

  const fontId = normalizeFontStyleId(row.fontId) as HostFontStyleId;
  const textColorRaw = typeof row.textColor === 'string' ? normalizeKudoHexColor(row.textColor) : null;

  return {
    value,
    effectId,
    fontId,
    durationMs,
    textColor: textColorRaw ?? '#ffffff',
    outline: pickOutline(row.outline),
    shadow: pickShadow(row.shadow),
    placement: pickPlacement(row.placement),
  };
}

export { countGraphemes };
