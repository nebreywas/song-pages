/** Effects discovery lab — whole-song prototype ids. */

export type LabEffectId =
  | 'bypass'
  | 'bass-boost'
  | 'lo-fi'
  | 'wide'
  | 'warm'
  | 'club'
  | 'night-drive'
  | 'radio'
  | 'late-night'
  | 'dream'
  | 'mono-punch'
  | 'underwater'
  | 'arena'
  | 'air'
  | 'vocal-emphasis'
  | 'mix-emphasis'
  | 'tape'
  | 'alive'
  | 'punch';

export type LabSpatialWetMode =
  | 'none'
  | 'delay'
  | 'convolver-plate'
  | 'convolver-hall';

/** stereo = pass-through; mono-sum = L+R; side-emphasis = M/S vocal lean; center-cut = L−R. */
export type LabSpatialRouting = 'stereo' | 'mono-sum' | 'side-emphasis' | 'center-cut';

export type LabSpatialParams = {
  routing: LabSpatialRouting;
  /** Mid (center) gain in M/S decode — lower reduces centered vocals. */
  midMix: number;
  /** Side (stereo difference) gain in M/S decode — higher emphasizes panned material. */
  sideMix: number;
  wetMode: LabSpatialWetMode;
  dryMix: number;
  wetMix: number;
  delayTimeSec: number;
  delayFeedback: number;
  delayFilterHz: number;
  convolverDurationSec: number;
  convolverDecay: number;
  /** Low-pass on wet return only — keeps dry present while darkening reverb tail. */
  wetReturnFilterHz: number;
};

export type LabEffectParams = {
  /** Existing chain — lowshelf @ BASS_FREQUENCY_HZ */
  bassLowshelfGainDb: number;
  /** Existing chain — lowpass cutoff (22050 = full bandwidth). */
  lowpassHz: number;
  lowpassQ: number;
  /** High-pass in lab chain (≤40 Hz = effectively off). */
  highpassHz: number;
  highpassQ: number;
  /** 0 = clean waveshaper; higher = more saturation. */
  driveAmount: number;
  highShelfGainDb: number;
  highShelfFrequencyHz: number;
  midPeakingGainDb: number;
  midPeakingFrequencyHz: number;
  midPeakingQ: number;
  compressorEnabled: boolean;
  compressorThresholdDb: number;
  compressorRatio: number;
  compressorAttackSec: number;
  compressorReleaseSec: number;
  /** Applied on lab output trim node (dB). */
  outputTrimDb: number;
  spatial: LabSpatialParams;
};

export type EffectsLabState = {
  panelVisible: boolean;
  enabled: boolean;
  effectId: LabEffectId;
  /** User trim layered on preset compensation (dB). */
  outputTrimDb: number;
  /** Hold-to-compare bypass while auditioning. */
  abBypass: boolean;
  /** Phase D+ — hybrid worklet when Tape / Alive / Punch preset is active. */
  workletEnhance: boolean;
};

export const DEFAULT_LAB_SPATIAL: LabSpatialParams = {
  routing: 'stereo',
  midMix: 1,
  sideMix: 1,
  wetMode: 'none',
  dryMix: 1,
  wetMix: 0,
  delayTimeSec: 0.38,
  delayFeedback: 0.25,
  delayFilterHz: 5000,
  convolverDurationSec: 1.4,
  convolverDecay: 2.4,
  wetReturnFilterHz: 22050,
};

export const DEFAULT_EFFECTS_LAB_STATE: EffectsLabState = {
  panelVisible: false,
  enabled: false,
  effectId: 'warm',
  outputTrimDb: 0,
  abBypass: false,
  workletEnhance: false,
};

export function isEffectsLabAudible(state: EffectsLabState): boolean {
  if (!state.enabled || state.abBypass) return false;
  return state.effectId !== 'bypass';
}

/**
 * Closing the panel stops whole-song FX unless another surface keeps them live
 * (e.g. future VC control surface — gate deactivation there when that ships).
 */
export function deactivateEffectsOnPanelClose(
  prev: EffectsLabState,
  next: EffectsLabState,
): EffectsLabState {
  if (!prev.panelVisible || next.panelVisible) return next;
  return { ...next, enabled: false, abBypass: false };
}

export function isWorkletEnhanceActive(state: EffectsLabState): boolean {
  if (!isEffectsLabAudible(state) || !state.workletEnhance) return false;
  return state.effectId === 'tape' || state.effectId === 'alive' || state.effectId === 'punch';
}

/** @deprecated Use workletEnhance */
export function isTapeWowFlutterActive(state: EffectsLabState): boolean {
  return isWorkletEnhanceActive(state) && state.effectId === 'tape';
}

export type LabEffectDefinition = {
  id: LabEffectId;
  label: string;
  tier: 'production' | 'phase-a' | 'phase-b' | 'phase-c' | 'phase-d' | 'phase-e';
  concept: string;
  params: LabEffectParams;
};
