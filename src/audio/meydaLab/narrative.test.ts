import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { bandEnergiesFromSpectrum } from './bandEnergy';
import { createNarrativeTracker } from './narrative';

describe('meydaLab bandEnergy', () => {
  it('attributes low bins to bass and high bins to treble', () => {
    // bufferSize 2048 @ 44100 → ~21.5 Hz/bin. Bin 2 ≈ 43 Hz (bass), bin 100 ≈ 2150 Hz (treble).
    const spectrum = new Float32Array(512);
    spectrum[2] = 10;
    spectrum[100] = 5;
    const bands = bandEnergiesFromSpectrum(spectrum, 44100, 2048);
    assert.ok(bands.bassShare > 0.5);
    assert.ok(bands.trebleShare > 0.2);
  });
});

describe('meydaLab narrative', () => {
  it('emits varied kinds across changing snapshots', () => {
    const tracker = createNarrativeTracker();
    tracker.ingest(1000, {
      rms: 0.2,
      energy: 40,
      centroid: 5000,
      flatness: 0.1,
      zcr: 20,
      bassShare: 0.15,
      trebleShare: 0.45,
    });
    tracker.ingest(4000, {
      rms: 0.22,
      energy: 45,
      centroid: 1200,
      flatness: 0.1,
      zcr: 15,
      bassShare: 0.45,
      trebleShare: 0.15,
      spectralFlux: 0.1,
    });
    tracker.ingest(7000, {
      rms: 0.01,
      energy: 1,
      centroid: 1000,
      flatness: 0.2,
      zcr: 5,
      bassShare: 0.2,
      trebleShare: 0.2,
    });

    const kinds = new Set(tracker.list().map((e) => e.kind));
    assert.ok(kinds.size >= 2, `expected multiple narrative kinds, got ${[...kinds]}`);
    assert.ok(
      tracker.list().some((e) => e.kind === 'quiet' || e.kind === 'bassDrop' || e.kind === 'bassGroove'),
    );
  });
});
