import {
  KUDOS_DURATION_MAX_MS,
  KUDOS_DURATION_MIN_MS,
  KUDOS_PARTICLE_COUNT_MAX,
  KUDOS_PARTICLE_COUNT_MIN,
  KUDOS_PARTICLE_ELEMENT_MAX,
  KUDOS_PARTICLE_ELEMENT_MIN,
  KUDOS_STATE_VERSION,
} from './constants';
import { KUDO_PARTICLE_EFFECT_IDS } from './effects';
import { firstGrapheme } from './graphemes';
import {
  sanitizeKudoColorList,
  sanitizeKudoColorMode,
} from './particleColors';
import { resolveParticleCount } from './particleCount';
import { createStarterKudoPresets } from './defaults';
import type {
  KudoOrigin,
  KudoPreset,
  KudoSystemState,
  ParticleElement,
  ParticleKudoConfig,
  TextKudoConfig,
} from './types';
import { sanitizeTextKudoConfig } from './textConfig';

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

function pickOrigin(value: unknown): KudoOrigin {
  const origins: KudoOrigin[] = ['auto', 'center', 'top', 'bottom', 'left', 'right', 'random'];
  return origins.includes(value as KudoOrigin) ? (value as KudoOrigin) : 'auto';
}

function sanitizeParticleElement(raw: unknown): ParticleElement | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (row.type === 'builtin-asset' && typeof row.assetId === 'string' && row.assetId.trim()) {
    return { type: 'builtin-asset', assetId: row.assetId.trim() };
  }
  if (row.type === 'emoji' && typeof row.value === 'string' && row.value.trim()) {
    const grapheme = firstGrapheme(row.value);
    if (!grapheme) return null;
    return { type: 'emoji', value: grapheme };
  }
  return null;
}

function sanitizeParticleConfig(
  raw: unknown,
  contentType: KudoPreset['contentType'] = 'builtin-assets',
): ParticleKudoConfig | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const row = raw as Record<string, unknown>;
  const elements = Array.isArray(row.elements)
    ? row.elements.map(sanitizeParticleElement).filter((el): el is ParticleElement => el != null)
    : [];
  const requiredType = contentType === 'emoji' ? 'emoji' : 'builtin-asset';
  const typedElements = elements.filter((el) => el.type === requiredType);
  if (typedElements.length < KUDOS_PARTICLE_ELEMENT_MIN) return undefined;

  const effectId =
    typeof row.effectId === 'string' && KUDO_PARTICLE_EFFECT_IDS.includes(row.effectId as never)
      ? row.effectId
      : 'rise';

  const durationMs =
    typeof row.durationMs === 'number' && Number.isFinite(row.durationMs)
      ? Math.min(KUDOS_DURATION_MAX_MS, Math.max(KUDOS_DURATION_MIN_MS, Math.round(row.durationMs)))
      : 3000;

  const variant = row.assetVariantMode;
  const assetVariantMode =
    variant === 'flat' || variant === 'shaded' || variant === 'mixed' ? variant : 'mixed';

  const iconColorMode = contentType === 'emoji' ? undefined : sanitizeKudoColorMode(row.iconColorMode);
  let iconColors = contentType === 'emoji' ? [] : sanitizeKudoColorList(row.iconColors, 4);
  if (iconColorMode === 'single' && iconColors.length === 0) {
    iconColors = ['#ff6b8a'];
  }
  if (iconColorMode === 'gradient' && iconColors.length < 2) {
    iconColors = [iconColors[0] ?? '#ff6b8a', iconColors[1] ?? '#ffd166'];
  }
  if (iconColorMode === 'multi' && iconColors.length < 3) {
    iconColors = [
      iconColors[0] ?? '#ff6b8a',
      iconColors[1] ?? '#ffd166',
      iconColors[2] ?? '#9b5de5',
    ];
  }

  const particleCount = (() => {
    if (typeof row.particleCount === 'number' && Number.isFinite(row.particleCount)) {
      return Math.min(
        KUDOS_PARTICLE_COUNT_MAX,
        Math.max(KUDOS_PARTICLE_COUNT_MIN, Math.round(row.particleCount)),
      );
    }
    return resolveParticleCount({ density: clamp01(Number(row.density)) });
  })();

  return {
    elements: typedElements.slice(0, KUDOS_PARTICLE_ELEMENT_MAX),
    effectId,
    durationMs,
    speed: clamp01(Number(row.speed)),
    density: clamp01(Number(row.density)),
    particleCount,
    size: clamp01(Number(row.size)),
    variation: clamp01(Number(row.variation)),
    origin: pickOrigin(row.origin),
    assetVariantMode,
    iconColorMode,
    iconColors: iconColorMode ? iconColors : [],
  };
}

function sanitizePreset(raw: unknown): KudoPreset | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || !row.id.trim()) return null;
  if (typeof row.name !== 'string' || !row.name.trim()) return null;

  const contentType = row.contentType;
  if (
    contentType !== 'builtin-assets' &&
    contentType !== 'emoji' &&
    contentType !== 'text' &&
    contentType !== 'text-emoji' &&
    contentType !== 'hybrid'
  ) {
    return null;
  }

  const particle = sanitizeParticleConfig(row.particle, contentType);
  const text =
    contentType === 'text' || contentType === 'text-emoji'
      ? sanitizeTextKudoConfig(row.text)
      : undefined;

  if ((contentType === 'text' || contentType === 'text-emoji') && !text) return null;
  if ((contentType === 'builtin-assets' || contentType === 'emoji' || contentType === 'hybrid') && !particle) {
    if (contentType !== 'hybrid') return null;
  }

  return {
    id: row.id.trim(),
    name: row.name.trim().slice(0, 48),
    contentType,
    particle,
    text,
    createdAt: typeof row.createdAt === 'number' ? row.createdAt : undefined,
    updatedAt: typeof row.updatedAt === 'number' ? row.updatedAt : undefined,
  };
}

/** Normalize persisted Kudo state on load; seed starters when missing or corrupt. */
export function migrateKudosState(raw: unknown): KudoSystemState {
  if (!raw || typeof raw !== 'object') {
    return { version: KUDOS_STATE_VERSION, presets: createStarterKudoPresets() };
  }

  const row = raw as Record<string, unknown>;
  const presets = Array.isArray(row.presets)
    ? row.presets.map(sanitizePreset).filter((preset): preset is KudoPreset => preset != null)
    : [];

  if (presets.length === 0) {
    return { version: KUDOS_STATE_VERSION, presets: createStarterKudoPresets() };
  }

  return {
    version: KUDOS_STATE_VERSION,
    presets,
  };
}

/** Persist host edits — allows an empty list (trigger becomes no-op). */
export function sanitizeKudosStateForSave(raw: KudoSystemState): KudoSystemState {
  const presets = raw.presets
    .map(sanitizePreset)
    .filter((preset): preset is KudoPreset => preset != null);
  return { version: KUDOS_STATE_VERSION, presets };
}
