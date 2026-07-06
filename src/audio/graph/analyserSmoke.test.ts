import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ANALYSER_SMOKE_MIN_PEAK } from '../constants.ts';
import { assertTapGraphWiring, runOscillatorAnalyserSmoke } from './analyserSmoke.ts';
import { buildAudioGraphFromSource } from './buildGraph.ts';

function tryCreateTestContext(): AudioContext | null {
  if (typeof globalThis.AudioContext !== 'function') {
    return null;
  }
  try {
    return new globalThis.AudioContext();
  } catch {
    return null;
  }
}

test('assertTapGraphWiring requires zero speakerGain', () => {
  const fakeGain = { gain: { value: 0 } } as GainNode;
  const graph = {
    mode: 'tap' as const,
    speakerGain: fakeGain,
  };
  assertTapGraphWiring(graph as never);

  fakeGain.gain.value = 1;
  assert.throws(() => assertTapGraphWiring(graph as never), /speakerGain should be 0/);
});

test('oscillator analyser smoke — tap graph produces non-zero FFT', async (t) => {
  const context = tryCreateTestContext();
  if (!context) {
    t.skip('Web Audio unavailable in Node — use runOscillatorAnalyserSmoke in browser devtools');
    return;
  }

  const result = await runOscillatorAnalyserSmoke(context, { minPeak: ANALYSER_SMOKE_MIN_PEAK });
  assert.ok(result.peak >= ANALYSER_SMOKE_MIN_PEAK);
  assert.equal(result.silent, false);
});

test('buildAudioGraphFromSource tap mode wires speakerGain to zero', async (t) => {
  const context = tryCreateTestContext();
  if (!context) {
    t.skip('Web Audio unavailable in Node');
    return;
  }

  const oscillator = context.createOscillator();
  const graph = buildAudioGraphFromSource(context, oscillator, { mode: 'tap', connectSpeakers: false });
  assertTapGraphWiring(graph);
  await context.close();
});
