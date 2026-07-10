import { getLabImpulseResponse } from '../spatial/impulseResponse';

/**
 * Performance insert between whole-song lab chain and spatial stage.
 * Series filter for sweeps / momentary EQ; parallel echo + reverb throw buses.
 */
export function createLabPerformanceNodes(context: AudioContext) {
  const input = context.createGain();
  input.gain.value = 1;

  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 22050;
  filter.Q.value = 0.7;

  const mainBus = context.createGain();
  mainBus.gain.value = 1;

  const echoSend = context.createGain();
  echoSend.gain.value = 0;
  const echoDelay = context.createDelay(2.5);
  echoDelay.delayTime.value = 0.28;
  const echoFeedback = context.createGain();
  echoFeedback.gain.value = 0;
  const echoFilter = context.createBiquadFilter();
  echoFilter.type = 'lowpass';
  echoFilter.frequency.value = 4500;
  echoFilter.Q.value = 0.7;
  const echoReturn = context.createGain();
  echoReturn.gain.value = 1;

  const throwSend = context.createGain();
  throwSend.gain.value = 0;
  const throwConvolver = context.createConvolver();
  throwConvolver.normalize = true;
  throwConvolver.buffer = getLabImpulseResponse(context, 'hall', 2.2, 1.6);
  const throwReturn = context.createGain();
  throwReturn.gain.value = 1;

  const output = context.createGain();
  output.gain.value = 1;

  input.connect(filter);
  filter.connect(mainBus);
  mainBus.connect(output);

  input.connect(echoSend);
  echoSend.connect(echoDelay);
  echoDelay.connect(echoFeedback);
  echoFeedback.connect(echoDelay);
  echoDelay.connect(echoFilter);
  echoFilter.connect(echoReturn);
  echoReturn.connect(output);

  input.connect(throwSend);
  throwSend.connect(throwConvolver);
  throwConvolver.connect(throwReturn);
  throwReturn.connect(output);

  return {
    input,
    output,
    filter,
    mainBus,
    echoSend,
    echoDelay,
    echoFeedback,
    echoFilter,
    echoReturn,
    throwSend,
    throwConvolver,
    throwReturn,
  };
}

export type LabPerformanceNodes = ReturnType<typeof createLabPerformanceNodes>;

/** Neutral performance path — whole-song presets stay authoritative until triggered. */
export function resetLabPerformanceNodes(nodes: LabPerformanceNodes, context: AudioContext): void {
  const now = context.currentTime;
  nodes.filter.type = 'lowpass';
  nodes.filter.Q.value = 0.7;
  nodes.filter.frequency.cancelScheduledValues(now);
  nodes.filter.frequency.setValueAtTime(22050, now);

  nodes.mainBus.gain.cancelScheduledValues(now);
  nodes.mainBus.gain.setValueAtTime(1, now);

  nodes.echoSend.gain.cancelScheduledValues(now);
  nodes.echoSend.gain.setValueAtTime(0, now);
  nodes.echoFeedback.gain.cancelScheduledValues(now);
  nodes.echoFeedback.gain.setValueAtTime(0, now);

  nodes.throwSend.gain.cancelScheduledValues(now);
  nodes.throwSend.gain.setValueAtTime(0, now);
}
