/** SQLite settings key for host Kudo presets (ordered list). */
export const KUDOS_SETTINGS_KEY = 'kudos.presets';

export const KUDOS_STATE_VERSION = 1;

/** Hard cap on simultaneous active Kudo instances (spec §15). */
export const KUDOS_MAX_CONCURRENT = 3;

/** Particle element slots per preset (spec §5.1). */
export const KUDOS_PARTICLE_ELEMENT_MIN = 1;
export const KUDOS_PARTICLE_ELEMENT_MAX = 4;

/** Text / text-emoji host-facing limit (spec §3.3) — grapheme count. */
export const KUDOS_TEXT_MAX_GRAPHEMES = 18;

/** Duration bounds (spec §7.1). */
export const KUDOS_DURATION_MIN_MS = 750;
export const KUDOS_DURATION_MAX_MS = 8000;
export const KUDOS_DURATION_DEFAULT_MS = 3000;

/** Normalized control ranges (0–1) for sliders; mapped in renderer. */
export const KUDOS_SPEED_DEFAULT = 0.5;
export const KUDOS_DENSITY_DEFAULT = 0.5;
export const KUDOS_SIZE_DEFAULT = 0.5;
export const KUDOS_VARIATION_DEFAULT = 0.5;

/** Particles spawned per trigger (explicit host control). */
export const KUDOS_PARTICLE_COUNT_MIN = 1;
export const KUDOS_PARTICLE_COUNT_MAX = 150;
export const KUDOS_PARTICLE_COUNT_DEFAULT = 40;

/** @deprecated Legacy ceiling — use KUDOS_PARTICLE_COUNT_MAX. */
export const KUDOS_PARTICLE_COUNT_LEGACY_MAX = 48;
