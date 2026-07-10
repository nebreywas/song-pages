/**
 * Kudos — host-triggered live visual reactions (MVP 1.0).
 * @see documentation/archive/specs/kudos-system-1.md (MVP spec; runtime: vc-mode-architecture.md)
 */

export type KudoContentType =
  | 'builtin-assets'
  | 'emoji'
  | 'text'
  | 'text-emoji'
  | 'hybrid';

export type KudoAssetVariantMode = 'flat' | 'shaded' | 'mixed';

/** How flat built-in icons are tinted (single-color artwork only). */
export type KudoParticleColorMode = 'single' | 'multi' | 'gradient';

export type KudoOrigin =
  | 'auto'
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'random';

export type KudoTextOutline = 'off' | 'light' | 'heavy';
export type KudoTextShadow = 'off' | 'soft' | 'hard';

export type KudoTextPlacement =
  | 'auto'
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right';

export type ParticleElement =
  | { type: 'builtin-asset'; assetId: string }
  | { type: 'emoji'; value: string };

export interface ParticleKudoConfig {
  elements: ParticleElement[];
  effectId: string;
  durationMs: number;
  /** Normalized 0–1 — mapped to slow/normal/fast in renderer. */
  speed: number;
  /** @deprecated Prefer particleCount — kept for migration from early builds. */
  density: number;
  /** Particles spawned per trigger (1–150). */
  particleCount?: number;
  size: number;
  variation: number;
  origin: KudoOrigin;
  assetVariantMode?: KudoAssetVariantMode;
  /** Icon tinting for flat single-color artwork; omit for no tint. */
  iconColorMode?: KudoParticleColorMode;
  /** single: one color; multi: 2–4; gradient: start + end. */
  iconColors?: string[];
}

export interface TextKudoConfig {
  value: string;
  effectId: string;
  fontId: string;
  durationMs: number;
  textColor?: string;
  outline: KudoTextOutline;
  shadow: KudoTextShadow;
  placement: KudoTextPlacement;
}

export interface KudoPreset {
  id: string;
  name: string;
  contentType: KudoContentType;
  particle?: ParticleKudoConfig;
  text?: TextKudoConfig;
  createdAt?: number;
  updatedAt?: number;
}

export interface KudoSystemState {
  version: number;
  /** Ordered list — cycle trigger follows array order (§28.6). */
  presets: KudoPreset[];
}
