/**
 * Default Meyda extractors for the lab — light enough for real-time playground use.
 * Heavy ones (mfcc, full chroma UI) stay optional toggles.
 *
 * Note: amplitudeSpectrum + spectralFlux are always pulled for derived bass bands /
 * punch detection even when not shown as primary meters.
 */

import type { MeydaAudioFeature } from 'meyda';

export const MEYDA_CORE_FEATURES = [
  'rms',
  'energy',
  'zcr',
  'spectralCentroid',
  'spectralFlatness',
  'spectralRolloff',
  'spectralSpread',
  'perceptualSpread',
  'perceptualSharpness',
  'loudness',
] as const satisfies ReadonlyArray<MeydaAudioFeature>;

/** Always extracted alongside core — needed for bass bands. */
export const MEYDA_DERIVED_FEATURES = ['amplitudeSpectrum'] as const satisfies ReadonlyArray<MeydaAudioFeature>;

export const MEYDA_EXTRA_FEATURES = ['chroma', 'mfcc'] as const satisfies ReadonlyArray<MeydaAudioFeature>;

export type MeydaCoreFeature = (typeof MEYDA_CORE_FEATURES)[number];
export type MeydaExtraFeature = (typeof MEYDA_EXTRA_FEATURES)[number];

export type MeydaLabFeatureId = MeydaCoreFeature | MeydaExtraFeature;

export const MEYDA_FEATURE_LABELS: Record<MeydaLabFeatureId, string> = {
  rms: 'How loud right now',
  energy: 'How much signal energy',
  zcr: 'How busy / crackly the wave is',
  spectralCentroid: 'Brightness (buzz vs boom)',
  spectralFlatness: 'Noise vs clear tone',
  spectralRolloff: 'Where the highs cut off',
  spectralSpread: 'How wide the spectrum is',
  perceptualSpread: 'Perceived spectral width',
  perceptualSharpness: 'Perceived “sharp” edge',
  loudness: 'Perceived loudness',
  chroma: 'Pitch-class colors (C…B)',
  mfcc: 'Timbre fingerprint coeffs',
};

/** One-line “why should I care?” for the lab UI. */
export const MEYDA_FEATURE_HINTS: Record<MeydaLabFeatureId, string> = {
  rms: 'Overall level — great for pulsing words on loud hits.',
  energy: 'Similar to RMS; jumps on dense / hard frames.',
  zcr: 'High = hats, scratch, noise; low = smoother / bassy tones.',
  spectralCentroid: 'Low Hz = dark/bass-heavy feel; high = bright/air.',
  spectralFlatness: 'High = hiss/wash; low = pitched instruments.',
  spectralRolloff: 'Frequency below which most energy sits.',
  spectralSpread: 'Narrow = focused tone; wide = full / noisy stack.',
  perceptualSpread: 'Human-hearing flavored “how spread out”.',
  perceptualSharpness: 'Edges / bite in the sound.',
  loudness: 'Roughly what a listener feels as volume (sones).',
  chroma: 'Which pitch classes are active — key / harmonic color.',
  mfcc: 'Advanced timbre vector — more for experiments than vibe meters.',
};
