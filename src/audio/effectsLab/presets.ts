import { BASS_GAIN_DB, LOFI_DRIVE_AMOUNT, LOFI_LOWPASS_HZ } from '../constants';
import type { LabEffectDefinition, LabEffectParams, LabSpatialParams } from './types';
import { DEFAULT_LAB_SPATIAL } from './types';

/** Flat graph — bypass and A/B reference. */
export function bypassParams(outputTrimDb = 0): LabEffectParams {
  return {
    bassLowshelfGainDb: 0,
    lowpassHz: 22050,
    lowpassQ: 0.7,
    highpassHz: 20,
    highpassQ: 0.7,
    driveAmount: 0,
    highShelfGainDb: 0,
    highShelfFrequencyHz: 8000,
    midPeakingGainDb: 0,
    midPeakingFrequencyHz: 800,
    midPeakingQ: 1,
    compressorEnabled: false,
    compressorThresholdDb: -24,
    compressorRatio: 1,
    compressorAttackSec: 0.003,
    compressorReleaseSec: 0.25,
    outputTrimDb,
    spatial: { ...DEFAULT_LAB_SPATIAL },
  };
}

function withSpatial(base: LabEffectParams, spatial: Partial<LabSpatialParams>): LabEffectParams {
  return {
    ...base,
    spatial: { ...base.spatial, ...spatial },
  };
}

function withCompressor(
  base: LabEffectParams,
  thresholdDb: number,
  ratio: number,
): LabEffectParams {
  return {
    ...base,
    compressorEnabled: true,
    compressorThresholdDb: thresholdDb,
    compressorRatio: ratio,
  };
}

/** Phase A whole-song prototypes — tuned for discovery, not final production. */
export const LAB_EFFECT_DEFINITIONS: LabEffectDefinition[] = [
  {
    id: 'bypass',
    label: 'Bypass (flat)',
    tier: 'production',
    concept: 'Unprocessed mirror path for A/B.',
    params: bypassParams(),
  },
  {
    id: 'bass-boost',
    label: 'Bass Boost',
    tier: 'production',
    concept: 'Existing production lowshelf boost.',
    params: {
      ...bypassParams(),
      bassLowshelfGainDb: BASS_GAIN_DB,
    },
  },
  {
    id: 'lo-fi',
    label: 'Lo-fi',
    tier: 'production',
    concept: 'Existing production lowpass + gentle drive.',
    params: {
      ...bypassParams(),
      lowpassHz: LOFI_LOWPASS_HZ,
      driveAmount: LOFI_DRIVE_AMOUNT,
    },
  },
  {
    id: 'wide',
    label: 'Wide (v1)',
    tier: 'phase-a',
    concept: 'Larger feel — presence lift, light mid contour, subtle low support.',
    params: {
      ...bypassParams(-1),
      bassLowshelfGainDb: 1.5,
      highShelfGainDb: 2.5,
      highShelfFrequencyHz: 9000,
      midPeakingGainDb: -1.5,
      midPeakingFrequencyHz: 750,
      midPeakingQ: 0.9,
    },
  },
  {
    id: 'warm',
    label: 'Warm',
    tier: 'phase-a',
    concept: 'Softer highs, gentle body, mild saturation.',
    params: withCompressor(
      {
        ...bypassParams(-0.5),
        highShelfGainDb: -2.5,
        highShelfFrequencyHz: 6500,
        midPeakingGainDb: 1.5,
        midPeakingFrequencyHz: 280,
        midPeakingQ: 0.7,
        driveAmount: 0.08,
      },
      -20,
      2.5,
    ),
  },
  {
    id: 'club',
    label: 'Club',
    tier: 'phase-a',
    concept: 'Tighter low end, reduced mud, assertive punch.',
    params: withCompressor(
      {
        ...bypassParams(-1.5),
        bassLowshelfGainDb: 4,
        midPeakingGainDb: -3,
        midPeakingFrequencyHz: 320,
        midPeakingQ: 1.1,
        driveAmount: 0.12,
        highShelfGainDb: 1.5,
        highShelfFrequencyHz: 10000,
      },
      -16,
      4,
    ),
  },
  {
    id: 'night-drive',
    label: 'Night Drive',
    tier: 'phase-a',
    concept: 'Darker, smoother, less brittle — subtle low body without club-style slam.',
    params: {
      ...bypassParams(-0.5),
      highShelfGainDb: -4,
      highShelfFrequencyHz: 5000,
      bassLowshelfGainDb: 3.5,
      midPeakingGainDb: 1,
      midPeakingFrequencyHz: 240,
      midPeakingQ: 0.75,
      driveAmount: 0.05,
    },
  },
  {
    id: 'radio',
    label: 'Radio',
    tier: 'phase-a',
    concept: 'Band-shaped, compressed broadcast feel.',
    params: withCompressor(
      {
        ...bypassParams(-2),
        lowpassHz: 12000,
        bassLowshelfGainDb: -2,
        highShelfGainDb: -3,
        highShelfFrequencyHz: 4500,
        midPeakingGainDb: 2.5,
        midPeakingFrequencyHz: 2200,
        midPeakingQ: 0.6,
        driveAmount: 0.15,
      },
      -14,
      5,
    ),
  },
  {
    id: 'late-night',
    label: 'Late Night',
    tier: 'phase-a',
    concept: 'Full at restrained level — softened transients and aggression.',
    params: withCompressor(
      {
        ...bypassParams(1),
        highShelfGainDb: -2,
        highShelfFrequencyHz: 7000,
        midPeakingGainDb: 0.5,
        midPeakingFrequencyHz: 400,
        midPeakingQ: 0.6,
        driveAmount: 0.04,
      },
      -22,
      2,
    ),
  },
  {
    id: 'dream',
    label: 'Dream',
    tier: 'phase-b',
    concept: 'Warm intimate room — close soft bloom; the cozy counterpoint to Arena big hall.',
    params: withSpatial(
      {
        ...bypassParams(-1),
        bassLowshelfGainDb: 2,
        highShelfGainDb: -4.5,
        highShelfFrequencyHz: 5000,
        midPeakingGainDb: 1.8,
        midPeakingFrequencyHz: 360,
        midPeakingQ: 0.72,
        driveAmount: 0.05,
      },
      {
        wetMode: 'convolver-plate',
        dryMix: 0.73,
        wetMix: 0.5,
        convolverDurationSec: 1.15,
        convolverDecay: 2.45,
        wetReturnFilterHz: 3600,
      },
    ),
  },
  {
    id: 'mono-punch',
    label: 'Mono Punch',
    tier: 'phase-b',
    concept: 'Centered, dense, old-school force — mono sum with punch and saturation.',
    params: withSpatial(
      withCompressor(
        {
          ...bypassParams(-1.5),
          bassLowshelfGainDb: 3,
          midPeakingGainDb: 2,
          midPeakingFrequencyHz: 900,
          midPeakingQ: 0.9,
          driveAmount: 0.14,
          highShelfGainDb: -1,
          highShelfFrequencyHz: 9000,
        },
        -15,
        3.5,
      ),
      { routing: 'mono-sum' },
    ),
  },
  {
    id: 'underwater',
    label: 'Underwater',
    tier: 'phase-b',
    concept: 'Immersive filtered space — resonant low-pass with subdued highs.',
    params: withSpatial(
      {
        ...bypassParams(-0.5),
        lowpassHz: 520,
        lowpassQ: 3.5,
        bassLowshelfGainDb: 2.5,
        highShelfGainDb: -6,
        highShelfFrequencyHz: 4000,
        driveAmount: 0.04,
      },
      {
        wetMode: 'delay',
        dryMix: 0.82,
        wetMix: 0.22,
        delayTimeSec: 0.28,
        delayFeedback: 0.18,
        delayFilterHz: 900,
      },
    ),
  },
  {
    id: 'arena',
    label: 'Arena',
    tier: 'phase-b',
    concept: 'Big hall reverb — larger space than Dream, with controlled low end.',
    params: withSpatial(
      withCompressor(
        {
          ...bypassParams(-2.5),
          bassLowshelfGainDb: 0.5,
          midPeakingGainDb: -2,
          midPeakingFrequencyHz: 260,
          midPeakingQ: 0.75,
          highShelfGainDb: -2,
          highShelfFrequencyHz: 7500,
        },
        -18,
        2.5,
      ),
      {
        wetMode: 'convolver-hall',
        dryMix: 0.72,
        wetMix: 0.48,
        convolverDurationSec: 3.2,
        convolverDecay: 1.35,
        wetReturnFilterHz: 9500,
      },
    ),
  },
  {
    id: 'air',
    label: 'Air',
    tier: 'phase-b',
    concept: 'Open, glossy lift — careful presence and air without harshness.',
    params: {
      ...bypassParams(-1),
      highShelfGainDb: 3.2,
      highShelfFrequencyHz: 11000,
      midPeakingGainDb: 1.2,
      midPeakingFrequencyHz: 4200,
      midPeakingQ: 0.7,
      bassLowshelfGainDb: -0.5,
    },
  },
  {
    id: 'vocal-emphasis',
    label: 'Vocal Emphasis',
    tier: 'phase-c',
    concept: 'High-pass clarity with presence lift — foregrounds vocals and upper mix detail.',
    params: {
      ...bypassParams(-0.5),
      highpassHz: 340,
      highpassQ: 0.82,
      bassLowshelfGainDb: -2.5,
      midPeakingGainDb: 2.2,
      midPeakingFrequencyHz: 2800,
      midPeakingQ: 0.65,
      highShelfGainDb: 1.4,
      highShelfFrequencyHz: 9200,
    },
  },
  {
    id: 'mix-emphasis',
    label: 'Mix Emphasis',
    tier: 'phase-c',
    concept:
      'M/S side lean — attenuates centered vocals (karaoke-style, not AI isolation). Counterpart to Vocal Emphasis.',
    params: withSpatial(
      {
        ...bypassParams(-0.5),
        bassLowshelfGainDb: -1.5,
        midPeakingGainDb: 1,
        midPeakingFrequencyHz: 3200,
        midPeakingQ: 0.55,
      },
      {
        routing: 'side-emphasis',
        midMix: 0.16,
        sideMix: 1.14,
      },
    ),
  },
  {
    id: 'tape',
    label: 'Tape',
    tier: 'phase-d',
    concept: 'Warm density, softened highs, gentle saturation with tape wow/flutter.',
    params: withCompressor(
      {
        ...bypassParams(-0.5),
        bassLowshelfGainDb: 0.8,
        highShelfGainDb: -3.2,
        highShelfFrequencyHz: 5800,
        midPeakingGainDb: 1.4,
        midPeakingFrequencyHz: 320,
        midPeakingQ: 0.68,
        driveAmount: 0.11,
        lowpassHz: 15500,
        lowpassQ: 0.55,
      },
      -19,
      2.6,
    ),
  },
  {
    id: 'alive',
    label: 'Alive',
    tier: 'phase-e',
    concept:
      'Harmonic presence and immediacy — native excitation; toggle worklet for parallel harmonic blend.',
    params: withCompressor(
      {
        ...bypassParams(-1),
        midPeakingGainDb: 2.8,
        midPeakingFrequencyHz: 2600,
        midPeakingQ: 0.62,
        highShelfGainDb: 2.2,
        highShelfFrequencyHz: 8800,
        driveAmount: 0.13,
        bassLowshelfGainDb: 0.5,
      },
      -17,
      2.4,
    ),
  },
  {
    id: 'punch',
    label: 'Punch',
    tier: 'phase-e',
    concept:
      'Attack-forward groove — fast dynamics and mid body; toggle worklet for transient emphasis.',
    params: withCompressor(
      {
        ...bypassParams(-1.5),
        bassLowshelfGainDb: 2,
        midPeakingGainDb: 2.2,
        midPeakingFrequencyHz: 1150,
        midPeakingQ: 0.85,
        driveAmount: 0.09,
        highShelfGainDb: 0.8,
        highShelfFrequencyHz: 9500,
        compressorAttackSec: 0.001,
        compressorReleaseSec: 0.18,
      },
      -16,
      3.2,
    ),
  },
];

/** Whole-song dropdown order in Audio & Effects (bypass omitted — use Activate off). */
export const WHOLE_SONG_EFFECT_MENU_ORDER = [
  'bass-boost',
  'lo-fi',
  'wide',
  'warm',
  'club',
  'radio',
  'vocal-emphasis',
  'mix-emphasis',
  'tape',
  'night-drive',
  'late-night',
  'dream',
  'arena',
  'air',
  'alive',
  'punch',
  'mono-punch',
  'underwater',
] as const satisfies readonly LabEffectDefinition['id'][];

const BY_ID = new Map(LAB_EFFECT_DEFINITIONS.map((row) => [row.id, row]));

export function getLabEffectDefinition(id: string): LabEffectDefinition | undefined {
  return BY_ID.get(id as LabEffectDefinition['id']);
}

export function resolveLabEffectParams(
  effectId: string,
  userTrimDb: number,
  forceBypass: boolean,
): LabEffectParams {
  if (forceBypass) {
    return bypassParams(userTrimDb);
  }
  const def = getLabEffectDefinition(effectId);
  if (!def) return bypassParams(userTrimDb);
  return {
    ...def.params,
    outputTrimDb: def.params.outputTrimDb + userTrimDb,
  };
}
