/**
 * Heuristic session narrative from Meyda + derived bass bands.
 * Not lyrics understanding — a rolling mood chronicle with more event kinds
 * and phrasing variance so the lab feels less stuck on 4 moods.
 */

export type NarrativeEvent = {
  id: string;
  atMs: number;
  /** Event family — used for per-kind cooldowns. */
  kind: string;
  text: string;
};

export type NarrativeSnapshot = {
  rms: number;
  centroid: number;
  flatness: number;
  energy: number;
  zcr: number;
  bassShare: number;
  trebleShare: number;
  /** Optional frame-to-frame energy flux when Meyda provides it. */
  spectralFlux?: number;
};

const PHRASE_POOLS: Record<string, string[]> = {
  quiet: [
    'The room thins out — sparse energy, almost held breath.',
    'A hush — signal falling toward silence.',
    'Dynamics drop; space opens for a soft lyric treatment.',
  ],
  swell: [
    'Swell building — overall loudness climbing.',
    'The mix leans forward; a chorus entrance energy.',
    'Level pushes up — good moment for lyric pulse.',
  ],
  punch: [
    'Punch — a sharp energy jump (hit / accent).',
    'Transient spike — something snapped into the mix.',
    'Impact frame — visualizer or word pulse likes this.',
  ],
  bassDrop: [
    'Bass weight lands — low band owns the spectrum.',
    'Sub / kick emphasis — the floor shows up.',
    'Low end takes the wheel; mid/treble get quieter in the share.',
  ],
  bassGroove: [
    'Bass groove holding — steady low-end share.',
    'Low band stays busy; head-nod territory.',
    'Sustained bass presence under the groove.',
  ],
  bright: [
    'Brightness climbs — spectrum leans treble / airy.',
    'Highs open up — shimmer / air in the mix.',
    'Centroid rises; hats and glitter more present.',
  ],
  dark: [
    'Darker mass — weight settles lower without a full bass drop.',
    'Warm / closed tone — less sparkle up top.',
    'Spectrum centers lower; mood thickens.',
  ],
  noise: [
    'Noisier / flatter spectrum — texture over pitched tone.',
    'Broadband hash — less tonal, more scrape / wash.',
    'Flatness up; sounds more like noise than a clear note.',
  ],
  brittle: [
    'Brittle / busy highs — zero-crossings climbing (hats, scratch).',
    'Surface crackle — lots of small wiggles in the wave.',
    'ZCR high — percussive glitter or distortion edge.',
  ],
  midFocus: [
    'Mid band takes focus — body / vocal region of the spectrum.',
    'Mids forward — less sub, less air; centered presence.',
    'Spectrum parks in the middle lane.',
  ],
  release: [
    'Release — loudness falling after a push.',
    'Energy eases off; afterglow of a hit.',
    'Dynamics compress downward again.',
  ],
  steady: [
    'Steady mid energy — groove holding without drama.',
    'Cruise mode — few extremes, mix sitting.',
    'Stable frame — useful baseline between events.',
  ],
};

function pick(kind: string, seq: number): string {
  const pool = PHRASE_POOLS[kind] ?? ['…'];
  return pool[seq % pool.length]!;
}

export function createNarrativeTracker() {
  let lastKind: string | null = null;
  let lastEmitAt = 0;
  let lastKindAt = new Map<string, number>();
  let seq = 0;
  let prevRms = 0;
  let prevEnergy = 0;
  let prevBassShare = 0;
  let smoothBass = 0;
  let smoothRms = 0;
  const events: NarrativeEvent[] = [];

  const push = (now: number, kind: string, minGapMs = 2200) => {
    const kindLast = lastKindAt.get(kind) ?? 0;
    // Per-kind gap + a shorter global gap so different kinds can interleave.
    if (kindLast > 0 && now - kindLast < minGapMs) return;
    if (lastEmitAt > 0 && now - lastEmitAt < 900) return;

    lastEmitAt = now;
    lastKindAt.set(kind, now);
    lastKind = kind;
    seq += 1;
    events.unshift({
      id: `n-${seq}`,
      atMs: now,
      kind,
      text: pick(kind, seq),
    });
    if (events.length > 32) events.length = 32;
  };

  return {
    ingest(now: number, snap: NarrativeSnapshot): NarrativeEvent[] {
      if (!Number.isFinite(snap.rms)) return events;

      // Light smoothing so one noisy frame doesn’t scream “DROP”.
      smoothRms = smoothRms * 0.7 + snap.rms * 0.3;
      smoothBass = smoothBass * 0.65 + snap.bassShare * 0.35;

      const dRms = snap.rms - prevRms;
      const dEnergy = snap.energy - prevEnergy;
      const dBass = snap.bassShare - prevBassShare;
      prevRms = snap.rms;
      prevEnergy = snap.energy;
      prevBassShare = snap.bassShare;

      // --- Event priority (first match wins this frame) ---

      if (smoothRms < 0.018) {
        if (lastKind !== 'quiet') push(now, 'quiet', 3500);
        return events;
      }

      // Sudden hits — punch before sustained moods.
      if (dRms > 0.045 || dEnergy > 18 || (snap.spectralFlux != null && snap.spectralFlux > 0.012)) {
        push(now, 'punch', 1800);
        return events;
      }

      // Bass drop: bass share jumps or sits high while overall level is up.
      if (
        (dBass > 0.12 && snap.bassShare > 0.28) ||
        (smoothBass > 0.38 && snap.rms > 0.06)
      ) {
        push(now, dBass > 0.1 ? 'bassDrop' : 'bassGroove', 2600);
        return events;
      }

      if (dRms > 0.025 && snap.rms > 0.08) {
        push(now, 'swell', 2400);
        return events;
      }

      if (dRms < -0.04 && prevRms > 0.08) {
        push(now, 'release', 2800);
        return events;
      }

      if (snap.zcr > 80 && snap.trebleShare > 0.35) {
        push(now, 'brittle', 3000);
        return events;
      }

      if (snap.flatness >= 0.42) {
        push(now, 'noise', 3200);
        return events;
      }

      if (snap.centroid >= 4800 && snap.trebleShare > 0.3) {
        push(now, 'bright', 3000);
        return events;
      }

      if (snap.centroid > 0 && snap.centroid <= 1400 && snap.bassShare < 0.3) {
        // Dark without “drop” — muted / closed tone.
        push(now, 'dark', 3200);
        return events;
      }

      if (snap.bassShare < 0.18 && snap.trebleShare < 0.35 && snap.rms > 0.04) {
        push(now, 'midFocus', 3400);
        return events;
      }

      if (lastKind !== 'steady' && lastKind !== 'bassGroove') {
        push(now, 'steady', 5000);
      }

      return events;
    },
    reset() {
      lastKind = null;
      lastEmitAt = 0;
      lastKindAt = new Map();
      seq = 0;
      prevRms = 0;
      prevEnergy = 0;
      prevBassShare = 0;
      smoothBass = 0;
      smoothRms = 0;
      events.length = 0;
    },
    list(): NarrativeEvent[] {
      return events;
    },
  };
}

export type NarrativeTracker = ReturnType<typeof createNarrativeTracker>;
