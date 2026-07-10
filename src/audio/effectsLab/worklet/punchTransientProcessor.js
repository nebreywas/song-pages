/**
 * Transient emphasis via fast/slow envelope difference (Phase E).
 */

class PunchTransientEmphasisProcessor extends AudioWorkletProcessor {
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
    this.fastEnv = [0, 0];
    this.slowEnv = [0, 0];
  }

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
    const fastRelease = Math.exp(-1 / (0.012 * sr));
    const slowRelease = Math.exp(-1 / (0.09 * sr));
    const punchGain = 2.8 * depth;

    for (let ch = 0; ch < output.length; ch += 1) {
      const inCh = input[ch] ?? input[0];
      const outCh = output[ch];
      let fast = this.fastEnv[ch] ?? 0;
      let slow = this.slowEnv[ch] ?? 0;

      for (let i = 0; i < inCh.length; i += 1) {
        const abs = Math.abs(inCh[i]);
        fast = Math.max(abs, fast * fastRelease);
        slow = slow * slowRelease + abs * (1 - slowRelease);
        const transient = Math.max(0, fast - slow);
        const gain = 1 + transient * punchGain;
        outCh[i] = inCh[i] * gain;
      }

      this.fastEnv[ch] = fast;
      this.slowEnv[ch] = slow;
    }

    return true;
  }
}

registerProcessor('punch-transient-emphasis', PunchTransientEmphasisProcessor);
