/** Peak / average of FFT bins — quick “is signal flowing?” check. */
export function measureFrequencyBins(
  data: Uint8Array | null | undefined,
): { peak: number; avg: number; silent: boolean } {
  if (!data || data.length === 0) return { peak: 0, avg: 0, silent: true };

  let peak = 0;
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) {
    const value = data[i] ?? 0;
    if (value > peak) peak = value;
    sum += value;
  }
  const avg = sum / data.length;
  return { peak, avg, silent: peak < 3 && avg < 1 };
}
