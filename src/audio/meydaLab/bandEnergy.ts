/**
 * Split a Meyda amplitude/power spectrum into bass / mid / treble energy.
 * Meyda has no first-class “bass” feature — this is the missing knob for drops.
 */

export type BandEnergies = {
  /** Sum of magnitudes ~20–160 Hz (kick / sub / low bass). */
  bass: number;
  /** Roughly 160 Hz–2 kHz (body / vocals / guitars). */
  mid: number;
  /** Above ~2 kHz (hats / air / brilliance). */
  treble: number;
  /** bass / (bass+mid+treble) — “how bass-weighted is this frame?” */
  bassShare: number;
  midShare: number;
  trebleShare: number;
};

const EMPTY: BandEnergies = {
  bass: 0,
  mid: 0,
  treble: 0,
  bassShare: 0,
  midShare: 0,
  trebleShare: 0,
};

/**
 * @param spectrum — Meyda amplitudeSpectrum or powerSpectrum
 * @param sampleRate — AudioContext.sampleRate
 * @param bufferSize — Meyda bufferSize (FFT bins ≈ bufferSize/2)
 */
export function bandEnergiesFromSpectrum(
  spectrum: ArrayLike<number> | undefined,
  sampleRate: number,
  bufferSize: number,
): BandEnergies {
  if (!spectrum || spectrum.length === 0 || sampleRate <= 0 || bufferSize <= 0) {
    return EMPTY;
  }

  const hzPerBin = sampleRate / bufferSize;
  let bass = 0;
  let mid = 0;
  let treble = 0;

  for (let i = 0; i < spectrum.length; i += 1) {
    const hz = i * hzPerBin;
    if (hz < 20) continue;
    const mag = Math.abs(spectrum[i] ?? 0);
    if (hz < 160) bass += mag;
    else if (hz < 2000) mid += mag;
    else treble += mag;
  }

  const total = bass + mid + treble;
  if (total <= 1e-9) return EMPTY;

  return {
    bass,
    mid,
    treble,
    bassShare: bass / total,
    midShare: mid / total,
    trebleShare: treble / total,
  };
}
