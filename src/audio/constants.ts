/** FFT resolution for AnalyserNode — shared by graph, IPC, and projection window. */
export const FFT_SIZE = 2048;

export const BASS_FREQUENCY_HZ = 110;
export const BASS_GAIN_DB = 11;
export const LOFI_LOWPASS_HZ = 2800;
export const LOFI_DRIVE_AMOUNT = 0.22;

/** Butterchurn bass emphasis — separate from playback bass boost. */
export const BUTTERCHURN_BASS_EMPHASIS_HZ = 120;
export const BUTTERCHURN_BASS_EMPHASIS_MAX_DB = 12;

/** Minimum analyser peak (0–255) for oscillator smoke test to pass. */
export const ANALYSER_SMOKE_MIN_PEAK = 8;
