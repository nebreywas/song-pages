import { getLabImpulseResponse, type LabImpulseKind } from './impulseResponse';
import type { LabSpatialParams } from '../types';

/** Wet send/return nodes — delay, convolution, and stereo routing (incl. M/S). */
export function createLabSpatialNodes(context: AudioContext, maxDelaySec = 2.5) {
  const input = context.createGain();
  input.gain.value = 1;

  const stereoDirect = context.createGain();
  stereoDirect.gain.value = 1;

  const channelSplitter = context.createChannelSplitter(2);

  const monoLeft = context.createGain();
  const monoRight = context.createGain();
  monoLeft.gain.value = 0.5;
  monoRight.gain.value = 0.5;
  const monoBus = context.createGain();
  monoBus.gain.value = 1;
  const monoMerger = context.createChannelMerger(2);
  const monoDirect = context.createGain();
  monoDirect.gain.value = 0;

  const cutLeft = context.createGain();
  cutLeft.gain.value = 1;
  const cutRight = context.createGain();
  cutRight.gain.value = -1;
  const cutMerger = context.createChannelMerger(2);
  const centerCutDirect = context.createGain();
  centerCutDirect.gain.value = 0;

  const lMid = context.createGain();
  lMid.gain.value = 0.5;
  const rMid = context.createGain();
  rMid.gain.value = 0.5;
  const midBus = context.createGain();

  const lSide = context.createGain();
  lSide.gain.value = 0.5;
  const rSide = context.createGain();
  rSide.gain.value = -0.5;
  const sideBus = context.createGain();

  const midToL = context.createGain();
  const midToR = context.createGain();
  const sideToL = context.createGain();
  const sideToR = context.createGain();
  const msMerger = context.createChannelMerger(2);
  const sideEmphasisDirect = context.createGain();
  sideEmphasisDirect.gain.value = 0;

  const merge = context.createGain();
  merge.gain.value = 1;

  input.connect(stereoDirect);
  stereoDirect.connect(merge);

  input.connect(channelSplitter);
  channelSplitter.connect(monoLeft, 0);
  channelSplitter.connect(monoRight, 1);
  monoLeft.connect(monoBus);
  monoRight.connect(monoBus);
  monoBus.connect(monoMerger, 0, 0);
  monoBus.connect(monoMerger, 0, 1);
  monoMerger.connect(monoDirect);
  monoDirect.connect(merge);

  channelSplitter.connect(cutLeft, 0);
  channelSplitter.connect(cutRight, 1);
  cutLeft.connect(cutMerger, 0, 0);
  cutLeft.connect(cutMerger, 0, 1);
  cutRight.connect(cutMerger, 0, 0);
  cutRight.connect(cutMerger, 0, 1);
  cutMerger.connect(centerCutDirect);
  centerCutDirect.connect(merge);

  channelSplitter.connect(lMid, 0);
  channelSplitter.connect(rMid, 1);
  lMid.connect(midBus);
  rMid.connect(midBus);

  channelSplitter.connect(lSide, 0);
  channelSplitter.connect(rSide, 1);
  lSide.connect(sideBus);
  rSide.connect(sideBus);

  midBus.connect(midToL);
  midBus.connect(midToR);
  sideBus.connect(sideToL);
  sideBus.connect(sideToR);
  midToL.connect(msMerger, 0, 0);
  sideToL.connect(msMerger, 0, 0);
  midToR.connect(msMerger, 0, 1);
  sideToR.connect(msMerger, 0, 1);
  msMerger.connect(sideEmphasisDirect);
  sideEmphasisDirect.connect(merge);

  const dryGain = context.createGain();
  const wetSend = context.createGain();
  const wetSum = context.createGain();
  wetSum.gain.value = 1;
  const wetReturnFilter = context.createBiquadFilter();
  wetReturnFilter.type = 'lowpass';
  wetReturnFilter.frequency.value = 22050;
  wetReturnFilter.Q.value = 0.7;
  const wetReturn = context.createGain();
  const output = context.createGain();

  merge.connect(dryGain);
  merge.connect(wetSend);
  dryGain.connect(output);

  const wetToDelay = context.createGain();
  const wetToConvolver = context.createGain();
  wetSend.connect(wetToDelay);
  wetSend.connect(wetToConvolver);

  const delay = context.createDelay(maxDelaySec);
  delay.delayTime.value = 0.35;
  const delayFeedback = context.createGain();
  delayFeedback.gain.value = 0;
  const delayFilter = context.createBiquadFilter();
  delayFilter.type = 'lowpass';
  delayFilter.frequency.value = 6000;

  wetToDelay.connect(delay);
  delay.connect(delayFilter);
  delayFilter.connect(delayFeedback);
  delayFeedback.connect(delay);
  delayFilter.connect(wetSum);

  const convolver = context.createConvolver();
  convolver.normalize = true;
  wetToConvolver.connect(convolver);
  convolver.connect(wetSum);

  wetSum.connect(wetReturnFilter);
  wetReturnFilter.connect(wetReturn);
  wetReturn.connect(output);

  return {
    input,
    output,
    stereoDirect,
    monoDirect,
    centerCutDirect,
    sideEmphasisDirect,
    midToL,
    midToR,
    sideToL,
    sideToR,
    dryGain,
    wetSend,
    wetSum,
    wetReturnFilter,
    wetReturn,
    wetToDelay,
    wetToConvolver,
    delay,
    delayFeedback,
    delayFilter,
    convolver,
  };
}

export type LabSpatialNodes = ReturnType<typeof createLabSpatialNodes>;

export function applyLabSpatialNodes(
  nodes: LabSpatialNodes,
  context: AudioContext,
  spatial: LabSpatialParams,
): void {
  const { routing } = spatial;

  nodes.stereoDirect.gain.value = routing === 'stereo' ? 1 : 0;
  nodes.monoDirect.gain.value = routing === 'mono-sum' ? 1 : 0;
  nodes.centerCutDirect.gain.value = routing === 'center-cut' ? 1 : 0;
  nodes.sideEmphasisDirect.gain.value = routing === 'side-emphasis' ? 1 : 0;

  nodes.midToL.gain.value = spatial.midMix;
  nodes.midToR.gain.value = spatial.midMix;
  nodes.sideToL.gain.value = spatial.sideMix;
  nodes.sideToR.gain.value = -spatial.sideMix;

  nodes.dryGain.gain.value = spatial.dryMix;
  nodes.wetSend.gain.value = spatial.wetMode === 'none' ? 0 : spatial.wetMix;
  nodes.wetReturn.gain.value = spatial.wetMode === 'none' ? 0 : 1;
  nodes.wetReturnFilter.frequency.value = spatial.wetReturnFilterHz;

  const useDelay = spatial.wetMode === 'delay';
  const useConvolver =
    spatial.wetMode === 'convolver-plate' || spatial.wetMode === 'convolver-hall';

  nodes.wetToDelay.gain.value = useDelay ? 1 : 0;
  nodes.wetToConvolver.gain.value = useConvolver ? 1 : 0;

  if (useDelay) {
    nodes.delay.delayTime.value = spatial.delayTimeSec;
    nodes.delayFeedback.gain.value = spatial.delayFeedback;
    nodes.delayFilter.frequency.value = spatial.delayFilterHz;
  } else {
    nodes.delayFeedback.gain.value = 0;
  }

  if (useConvolver) {
    const kind: LabImpulseKind = spatial.wetMode === 'convolver-hall' ? 'hall' : 'plate';
    nodes.convolver.buffer = getLabImpulseResponse(
      context,
      kind,
      spatial.convolverDurationSec,
      spatial.convolverDecay,
    );
  }
}
