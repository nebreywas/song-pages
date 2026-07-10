import { LOFI_DRIVE_AMOUNT } from '../constants';

/** Soft-clipping waveshaper curve — amount 0 ≈ linear. */
export function makeDriveCurveForAmount(amount: number): Float32Array<ArrayBuffer> {
  const samples = 44100;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i += 1) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  return curve;
}

export const LINEAR_CURVE = makeDriveCurveForAmount(0);
export const LOFI_DRIVE_CURVE = makeDriveCurveForAmount(LOFI_DRIVE_AMOUNT);
