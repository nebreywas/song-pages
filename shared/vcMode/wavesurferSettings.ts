/**
 * VC Mode — WaveSurfer content presentation.
 * Independent song slot (not a visualizer plugin) so we can decode waveforms
 * without tying into the Butterchurn/FFT experience pipeline.
 */

export type VcWavesurferViewMode =
  | 'waveform'
  | 'spectrogram'
  | 'barwave'
  | 'squiggly'
  | 'gradient';

export const VC_WAVESURFER_VIEW_MODE_IDS: readonly VcWavesurferViewMode[] = [
  'waveform',
  'spectrogram',
  'barwave',
  'squiggly',
  'gradient',
] as const;

export const VC_WAVESURFER_VIEW_MODE_LABELS: Record<VcWavesurferViewMode, string> = {
  waveform: 'Waveform',
  spectrogram: 'Spectrogram',
  barwave: 'Bar wave (SoundCloud-style)',
  squiggly: 'Squiggly line',
  gradient: 'Gradient waveform',
};

export type EffectiveWavesurferPresentation = {
  viewMode: VcWavesurferViewMode;
  barWidth: number;
  barGap: number;
  /** When true, progressColor paints elapsed portion as the track plays. */
  paintProgress: boolean;
};

export const DEFAULT_VC_WAVESURFER_PRESENTATION: EffectiveWavesurferPresentation = {
  viewMode: 'waveform',
  barWidth: 3,
  barGap: 2,
  paintProgress: true,
};

const VIEW_MODE_SET = new Set<string>(VC_WAVESURFER_VIEW_MODE_IDS);

export function normalizeWavesurferViewMode(raw: unknown): VcWavesurferViewMode | null {
  if (typeof raw !== 'string') return null;
  return VIEW_MODE_SET.has(raw) ? (raw as VcWavesurferViewMode) : null;
}

export function clampWavesurferBarWidth(value: number): number {
  return Math.min(20, Math.max(1, Math.round(value)));
}

export function clampWavesurferBarGap(value: number): number {
  return Math.min(12, Math.max(0, Math.round(value)));
}

type WavesurferOverrideFields = {
  wavesurferViewMode?: VcWavesurferViewMode;
  wavesurferBarWidth?: number;
  wavesurferBarGap?: number;
  wavesurferPaintProgress?: boolean;
};

export function resolveWavesurferPresentation(
  overrides: WavesurferOverrideFields,
): EffectiveWavesurferPresentation {
  const viewMode =
    normalizeWavesurferViewMode(overrides.wavesurferViewMode) ??
    DEFAULT_VC_WAVESURFER_PRESENTATION.viewMode;
  const barWidth =
    typeof overrides.wavesurferBarWidth === 'number' && Number.isFinite(overrides.wavesurferBarWidth)
      ? clampWavesurferBarWidth(overrides.wavesurferBarWidth)
      : DEFAULT_VC_WAVESURFER_PRESENTATION.barWidth;
  const barGap =
    typeof overrides.wavesurferBarGap === 'number' && Number.isFinite(overrides.wavesurferBarGap)
      ? clampWavesurferBarGap(overrides.wavesurferBarGap)
      : DEFAULT_VC_WAVESURFER_PRESENTATION.barGap;
  const paintProgress =
    typeof overrides.wavesurferPaintProgress === 'boolean'
      ? overrides.wavesurferPaintProgress
      : DEFAULT_VC_WAVESURFER_PRESENTATION.paintProgress;

  return { viewMode, barWidth, barGap, paintProgress };
}

/** Direct audio URLs WaveSurfer can decode — HLS stays on the mirror player only. */
export function isWavesurferDecodableUrl(url: string | null | undefined): boolean {
  const trimmed = String(url ?? '').trim();
  if (!trimmed) return false;
  if (trimmed.includes('.m3u8') || trimmed.includes('application/vnd.apple.mpegurl')) return false;
  return /^https?:\/\//i.test(trimmed) || trimmed.startsWith('blob:') || trimmed.startsWith('file:');
}
