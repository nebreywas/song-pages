/**
 * Parallel harmonic excitation — high band soft saturation blended back (Phase E).
 */

class AliveHarmonicExciterProcessor extends AudioWorkletProcessor {
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
    this.lpState = [0, 0];
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

    const hpCoeff = 0.92;
    const wetMix = 0.22 * depth;
    const drive = 2.4;

    for (let ch = 0; ch < output.length; ch += 1) {
      const inCh = input[ch] ?? input[0];
      const outCh = output[ch];
      let lp = this.lpState[ch] ?? 0;

      for (let i = 0; i < inCh.length; i += 1) {
        const sample = inCh[i];
        lp += (sample - lp) * (1 - hpCoeff);
        const high = sample - lp;
        const harmonic = Math.tanh(high * drive);
        outCh[i] = sample * (1 - wetMix) + (sample + harmonic * 0.35) * wetMix;
      }

      this.lpState[ch] = lp;
    }

    return true;
  }
}

registerProcessor('alive-harmonic-exciter', AliveHarmonicExciterProcessor);
