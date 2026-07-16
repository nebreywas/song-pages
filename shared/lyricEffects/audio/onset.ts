/**
 * Spectral-flux onset detector for Beat Pulse.
 *
 * This is a presentation rhythm cue from FFT energy — not lyric sync and not
 * a tempo estimate. Tuned to be sparse and subtle so pulses feel musical
 * without implying which words “matter.”
 */

export type OnsetDetectorState = {
  prevMags: Float32Array | null;
  /** Exponential envelope of recent flux — adaptive threshold. */
  fluxEnv: number;
  lastOnsetMs: number;
};

export function createOnsetDetectorState(): OnsetDetectorState {
  return { prevMags: null, fluxEnv: 0, lastOnsetMs: 0 };
}

export type OnsetTickResult = {
  /** True when this frame crosses the adaptive onset threshold. */
  onset: boolean;
  flux: number;
};

const MIN_GAP_MS = 140;
const ENV_ATTACK = 0.28;
const ENV_DECAY = 0.88;
/** Softer than before — high ratio caused mid-song silence once the envelope latched up. */
const THRESHOLD_RATIO = 1.28;
const FLOOR = 0.01;

/**
 * Compare half-wave rectified spectral flux against a slowly adapting envelope.
 * Returns at most one onset per {@link MIN_GAP_MS}.
 */
export function tickOnsetDetector(
  state: OnsetDetectorState,
  frequencyData: Uint8Array | null | undefined,
  nowMs: number,
  isPlaying: boolean,
): OnsetTickResult {
  if (!isPlaying || !frequencyData || frequencyData.length === 0) {
    return { onset: false, flux: 0 };
  }

  const n = frequencyData.length;
  if (!state.prevMags || state.prevMags.length !== n) {
    state.prevMags = new Float32Array(n);
    for (let i = 0; i < n; i += 1) state.prevMags[i] = (frequencyData[i] ?? 0) / 255;
    return { onset: false, flux: 0 };
  }

  // Emphasize low/mid bins — percussion / transient energy without claiming kick accuracy.
  const focusEnd = Math.max(8, Math.floor(n * 0.28));
  let flux = 0;
  for (let i = 0; i < focusEnd; i += 1) {
    const mag = (frequencyData[i] ?? 0) / 255;
    const delta = mag - (state.prevMags[i] ?? 0);
    if (delta > 0) flux += delta;
    state.prevMags[i] = mag;
  }
  flux /= focusEnd;

  const rising = flux > state.fluxEnv;
  state.fluxEnv = rising
    ? state.fluxEnv + (flux - state.fluxEnv) * ENV_ATTACK
    : state.fluxEnv * ENV_DECAY;

  const threshold = Math.max(FLOOR, state.fluxEnv * THRESHOLD_RATIO);
  const gapOk = nowMs - state.lastOnsetMs >= MIN_GAP_MS;
  const onset = gapOk && flux > threshold;

  if (onset) state.lastOnsetMs = nowMs;

  return { onset, flux };
}
