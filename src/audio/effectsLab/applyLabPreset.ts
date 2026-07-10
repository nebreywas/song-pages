import { BASS_FREQUENCY_HZ } from '../constants';
import { LINEAR_CURVE, makeDriveCurveForAmount } from '../graph/driveCurve';
import type { AudioGraph } from '../types';
import { applyLabSpatialNodes } from './spatial/labSpatialNodes';
import type { LabEffectParams } from './types';

/** Apply discovery-lab parameters to the mirror playback graph. */
export function applyLabEffectParams(graph: AudioGraph, params: LabEffectParams): void {
  const { effects, lab } = graph;

  effects.bassFilter.gain.value = params.bassLowshelfGainDb;
  effects.lofiLowpass.frequency.value = params.lowpassHz;
  effects.lofiLowpass.Q.value = params.lowpassQ;
  effects.lofiDrive.curve =
    params.driveAmount > 0.001 ? makeDriveCurveForAmount(params.driveAmount) : LINEAR_CURVE;

  lab.highpass.type = 'highpass';
  lab.highpass.frequency.value = params.highpassHz <= 40 ? 20 : params.highpassHz;
  lab.highpass.Q.value = params.highpassQ;

  lab.highShelf.type = 'highshelf';
  lab.highShelf.frequency.value = params.highShelfFrequencyHz;
  lab.highShelf.gain.value = params.highShelfGainDb;

  lab.midPeaking.type = 'peaking';
  lab.midPeaking.frequency.value = params.midPeakingFrequencyHz;
  lab.midPeaking.Q.value = params.midPeakingQ;
  lab.midPeaking.gain.value = params.midPeakingGainDb;

  if (params.compressorEnabled) {
    lab.compressor.threshold.value = params.compressorThresholdDb;
    lab.compressor.ratio.value = params.compressorRatio;
    lab.compressor.attack.value = params.compressorAttackSec;
    lab.compressor.release.value = params.compressorReleaseSec;
    lab.compressor.knee.value = 6;
  } else {
    lab.compressor.threshold.value = 0;
    lab.compressor.ratio.value = 1;
  }

  const trimLinear = 10 ** (params.outputTrimDb / 20);
  lab.outputTrim.gain.value = trimLinear;

  applyLabSpatialNodes(lab.spatial, graph.context, params.spatial);

  effects.bassFilter.frequency.value = BASS_FREQUENCY_HZ;
}
