/**
 * Subtle tape wow/flutter — modulated delay tap (Phase D worklet prototype).
 * Kept as plain JS so AudioWorklet can load it without bundler transforms.
 */

const MAX_DELAY_SAMPLES = 2048;
const BASE_DELAY_SAMPLES = 96;

class TapeWowFlutterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'depth',
        defaultValue: 0,
        minValue: 0,
        maxValue: 1,
        automationRate: 'k-rate',
      },
    ];
  }

  constructor() {
    super();
    this.writeIndex = 0;
    this.wowPhase = Math.random();
    this.flutterPhase = Math.random();
    /** @type {Float32Array[]} */
    this.buffers = [];
  }

  /** @param {Float32Array[][]} inputs */
  /** @param {Float32Array[][]} outputs */
  /** @param {Record<string, Float32Array>} parameters */
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input?.[0] || !output?.[0]) return true;

    const depth = parameters.depth[0] ?? 0;
    if (depth <= 0.0001) {
      for (let ch = 0; ch < output.length; ch += 1) {
        const inCh = input[ch] ?? input[0];
        output[ch].set(inCh);
      }
      return true;
    }

    const sr = sampleRate;
    const wowHz = 0.4;
    const flutterHz = 7.5;
    const wowDepthSec = 0.0021 * depth;
    const flutterDepthSec = 0.00032 * depth;
    const dryMix = 0.68;

    const blockLength = output[0].length;
    for (let i = 0; i < blockLength; i += 1) {
      this.wowPhase += wowHz / sr;
      this.flutterPhase += flutterHz / sr;
      const modSamples =
        BASE_DELAY_SAMPLES +
        (wowDepthSec * sr * Math.sin(this.wowPhase * Math.PI * 2) +
          flutterDepthSec * sr * Math.sin(this.flutterPhase * Math.PI * 2));

      const delaySamples = Math.max(
        1,
        Math.min(MAX_DELAY_SAMPLES - 2, Math.floor(modSamples)),
      );

      for (let ch = 0; ch < output.length; ch += 1) {
        const inCh = input[ch] ?? input[0];
        if (!this.buffers[ch] || this.buffers[ch].length !== MAX_DELAY_SAMPLES) {
          this.buffers[ch] = new Float32Array(MAX_DELAY_SAMPLES);
        }
        const buf = this.buffers[ch];
        const writeIdx = this.writeIndex % MAX_DELAY_SAMPLES;
        buf[writeIdx] = inCh[i];

        const readIdx =
          (this.writeIndex - delaySamples + MAX_DELAY_SAMPLES * 4) % MAX_DELAY_SAMPLES;
        const wet = buf[readIdx];
        output[ch][i] = inCh[i] * dryMix + wet * (1 - dryMix);
      }
      this.writeIndex += 1;
    }

    return true;
  }
}

registerProcessor('tape-wow-flutter', TapeWowFlutterProcessor);
