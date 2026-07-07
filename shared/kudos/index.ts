export {
  KUDOS_DURATION_DEFAULT_MS,
  KUDOS_DURATION_MAX_MS,
  KUDOS_DURATION_MIN_MS,
  KUDOS_MAX_CONCURRENT,
  KUDOS_PARTICLE_COUNT_DEFAULT,
  KUDOS_PARTICLE_COUNT_LEGACY_MAX,
  KUDOS_PARTICLE_COUNT_MAX,
  KUDOS_PARTICLE_COUNT_MIN,
  KUDOS_PARTICLE_ELEMENT_MAX,
  KUDOS_PARTICLE_ELEMENT_MIN,
  KUDOS_SETTINGS_KEY,
  KUDOS_STATE_VERSION,
  KUDOS_TEXT_MAX_GRAPHEMES,
} from './constants';
export { nextKudoCycleIndex, kudoPresetAtCycleIndex } from './cycle';
export { createStarterKudoPresets, defaultEmojiParticleConfig, defaultParticleConfig, defaultTextEmojiKudoConfig, defaultTextKudoConfig } from './defaults';
export { densityToParticleCountLegacy, resolveParticleCount } from './particleCount';
export { isEmojiGrapheme, phraseIncludesEmoji, segmentPhrase, type PhraseSegment } from './phraseSegments';
export { estimatePhraseWidthEm, kudoTextFontSizePx, peakTextEffectScale } from './textSizing';
export { countGraphemes, firstGrapheme, isSingleGrapheme, sanitizeEmojiElements, segmentGraphemes, truncateToMaxGraphemes } from './graphemes';
export { sanitizeKudoTextValue, sanitizeTextKudoConfig } from './textConfig';
export {
  KUDO_PARTICLE_EFFECTS,
  KUDO_PARTICLE_EFFECT_IDS,
  KUDO_TEXT_EFFECTS,
  KUDO_TEXT_EFFECT_IDS,
  isParticleEffectImplemented,
  isTextEffectImplemented,
  type KudoParticleEffectId,
  type KudoTextEffectId,
} from './effects';
export {
  kudoIconColorUsesTint,
  lerpKudoHexColor,
  normalizeKudoHexColor,
  resolveParticleIconTint,
  sanitizeKudoColorList,
  sanitizeKudoColorMode,
} from './particleColors';
export { migrateKudosState, sanitizeKudosStateForSave } from './migrate';
export type {
  KudoAssetVariantMode,
  KudoContentType,
  KudoOrigin,
  KudoParticleColorMode,
  KudoPreset,
  KudoSystemState,
  KudoTextOutline,
  KudoTextPlacement,
  KudoTextShadow,
  ParticleElement,
  ParticleKudoConfig,
  TextKudoConfig,
} from './types';
