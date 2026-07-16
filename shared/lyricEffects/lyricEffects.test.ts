import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { bandEnergyFromFrequency } from './audio/energy';
import { createOnsetDetectorState, tickOnsetDetector } from './audio/onset';
import { beatPulseLyricEffect } from './effects/beatPulse';
import { energyPulseLyricEffect } from './effects/energyPulse';
import { matrixRevealLyricEffect } from './effects/matrixReveal';
import { getLyricEffect, listLyricEffects } from './registry';
import { resolveLyricPresentationEffect, sanitizeLyricPresentationEffect } from './resolve';
import { countWords, splitLyricUnits } from './textUnits';
import type { LyricEffectFrameInput } from './types';

describe('lyricEffects resolve', () => {
  it('sanitizes known ids and defaults unknown', () => {
    assert.equal(sanitizeLyricPresentationEffect('beat-pulse'), 'beat-pulse');
    assert.equal(sanitizeLyricPresentationEffect('nope'), undefined);
    assert.equal(resolveLyricPresentationEffect('matrix-reveal'), 'matrix-reveal');
    assert.equal(resolveLyricPresentationEffect('nope'), 'none');
  });
});

describe('lyricEffects registry', () => {
  it('lists experimental modules including none', () => {
    const ids = listLyricEffects().map((m) => m.id);
    assert.deepEqual(ids, [
      'none',
      'beat-pulse',
      'energy-pulse',
      'matrix-reveal',
      'progressive-clarity',
      'audio-reactive-type',
    ]);
    assert.equal(getLyricEffect('beat-pulse').label, 'Beat Pulse');
  });
});

describe('lyricEffects textUnits', () => {
  it('splits words while preserving whitespace', () => {
    const units = splitLyricUnits('hello  world');
    assert.equal(countWords('hello  world'), 2);
    assert.equal(units.filter((u) => u.isWord).length, 2);
    assert.ok(units.some((u) => !u.isWord && u.text.includes(' ')));
  });
});

describe('lyricEffects audio', () => {
  it('computes band energy from FFT bytes', () => {
    const data = new Uint8Array(64);
    for (let i = 0; i < 8; i += 1) data[i] = 200;
    const bands = bandEnergyFromFrequency(data);
    assert.ok(bands.low > bands.high);
    assert.ok(bands.overall > 0);
  });

  it('fires sparse onsets on rising flux', () => {
    const state = createOnsetDetectorState();
    const quiet = new Uint8Array(64);
    const hit = new Uint8Array(64);
    for (let i = 0; i < 16; i += 1) hit[i] = 220;

    tickOnsetDetector(state, quiet, 1000, true);
    const first = tickOnsetDetector(state, hit, 1050, true);
    assert.equal(first.onset, true);

    // Too soon for another onset.
    const second = tickOnsetDetector(state, hit, 1100, true);
    assert.equal(second.onset, false);
  });
});

function frame(partial: Partial<LyricEffectFrameInput>): LyricEffectFrameInput {
  return {
    nowMs: 1000,
    currentTimeSec: 12,
    isPlaying: true,
    frequencyData: null,
    visibleRadius: 3,
    lines: [
      { id: 'a', text: 'alpha beta gamma', index: 0, focusDistance: 0 },
      { id: 'b', text: 'delta epsilon', index: 1, focusDistance: 1 },
    ],
    ...partial,
  };
}

describe('lyricEffects beatPulse', () => {
  it('pulses words after an onset', () => {
    const state = beatPulseLyricEffect.createState();
    const quiet = new Uint8Array(64);
    const hit = new Uint8Array(64);
    for (let i = 0; i < 16; i += 1) hit[i] = 255;

    beatPulseLyricEffect.tick(frame({ frequencyData: quiet, nowMs: 1000 }), state);
    const after = beatPulseLyricEffect.tick(frame({ frequencyData: hit, nowMs: 1050 }), state);
    const pulsed = Object.values(after.lines).some((line) => (line.pulses?.length ?? 0) > 0);
    assert.equal(pulsed, true);
  });
});

describe('lyricEffects energyPulse', () => {
  it('pulses words after an energy crest', () => {
    const state = energyPulseLyricEffect.createState();
    const quiet = new Uint8Array(64);
    const hit = new Uint8Array(64);
    for (let i = 0; i < 64; i += 1) hit[i] = i < 12 ? 220 : 40;

    energyPulseLyricEffect.tick(frame({ frequencyData: quiet, nowMs: 1000 }), state);
    const after = energyPulseLyricEffect.tick(frame({ frequencyData: hit, nowMs: 1050 }), state);
    const pulsed = Object.values(after.lines).some((line) => (line.pulses?.length ?? 0) > 0);
    assert.equal(pulsed, true);
  });

  it('drops pulses once the line leaves the on-screen set', () => {
    const state = energyPulseLyricEffect.createState();
    const quiet = new Uint8Array(64);
    const hit = new Uint8Array(64);
    for (let i = 0; i < 64; i += 1) hit[i] = i < 12 ? 220 : 40;

    energyPulseLyricEffect.tick(frame({ frequencyData: quiet, nowMs: 1000 }), state);
    const lit = energyPulseLyricEffect.tick(frame({ frequencyData: hit, nowMs: 1050 }), state);
    const litIds = Object.keys(lit.lines);
    assert.ok(litIds.length > 0);
    const pulsedId = litIds[0]!;

    // Host no longer lists that line — prior pulse must clear (quiet FFT avoids new fires).
    const scrolledAway = energyPulseLyricEffect.tick(
      frame({
        frequencyData: quiet,
        nowMs: 1100,
        lines: [{ id: 'other', text: 'zeta', index: 9, focusDistance: 0 }],
      }),
      state,
    );
    assert.equal(scrolledAway.lines[pulsedId], undefined);
  });
  it('keeps firing after many crests instead of adapting into silence', () => {
    const state = energyPulseLyricEffect.createState();
    const quiet = new Uint8Array(64);
    const hit = new Uint8Array(64);
    for (let i = 0; i < 64; i += 1) hit[i] = i < 12 ? 230 : 50;

    let fires = 0;
    for (let step = 0; step < 40; step += 1) {
      const now = 1000 + step * 200;
      energyPulseLyricEffect.tick(frame({ frequencyData: quiet, nowMs: now }), state);
      const after = energyPulseLyricEffect.tick(
        frame({ frequencyData: hit, nowMs: now + 40 }),
        state,
      );
      if (Object.keys(after.lines).length > 0) fires += 1;
    }
    // Adaptive baseline previously starved after a few hits — require ongoing fires.
    assert.ok(fires >= 8, `expected sustained fires, got ${fires}`);
  });
});

describe('lyricEffects matrixReveal', () => {
  it('scrambles newly visible text then clears when resolved', () => {
    const state = matrixRevealLyricEffect.createState();
    const early = matrixRevealLyricEffect.tick(frame({ nowMs: 1000 }), state);
    assert.ok(early.lines.a?.displayText);
    assert.notEqual(early.lines.a?.displayText, 'alpha beta gamma');

    const late = matrixRevealLyricEffect.tick(frame({ nowMs: 1000 + 5000 }), state);
    assert.equal(late.lines.a, undefined);
  });
});
