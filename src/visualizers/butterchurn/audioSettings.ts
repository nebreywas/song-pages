import { useEffect, useRef } from 'react';

import { meterSharesFromFrequency } from '../../audio/meydaLab/meterShares';
import type { ButterchurnAudioSettings } from '../../audio/types';
import type { VisualizerSettingsValues } from '../core/settings/schema/types';

const DEFAULT_SENSITIVITY = 1;
const DEFAULT_BASS_EMPHASIS = 0;

/**
 * Map settings → Butterchurn graph gains.
 * With Meyda bass drive + a live signal, lowshelf tracks kick/bass so Milkdrop reacts harder.
 * `bassDriveSignal` is absolute low-band energy (not share) — share barely moves on kicks.
 */
export function resolveButterchurnAudioSettings(
  settings: VisualizerSettingsValues,
  bassDriveSignal: number | null = null,
): ButterchurnAudioSettings {
  const sensitivity =
    typeof settings.sensitivity === 'number' ? settings.sensitivity : DEFAULT_SENSITIVITY;
  const manualBass =
    typeof settings.bassEmphasis === 'number' ? settings.bassEmphasis : DEFAULT_BASS_EMPHASIS;

  if (bassDriveSignal != null && Number.isFinite(bassDriveSignal) && settings.meydaBassDrive === true) {
    // Absolute low energy + aggressive curve so kicks visibly lift bassEmphasis (0→12 dB).
    // Manual "Bass emphasis" slider acts as intensity when > 0; otherwise full drive.
    const drive = Math.max(0.7, manualBass > 0 ? manualBass : 1);
    const curved = Math.pow(Math.min(1, Math.max(0, bassDriveSignal)), 0.55);
    return {
      sensitivity,
      bassEmphasis: Math.min(1, curved * drive * 1.35),
    };
  }

  return { sensitivity, bassEmphasis: manualBass };
}

type ApplyOpts = {
  /** Prefer main graph analyser (pre–Butterchurn EQ) so drive does not meter its own boost. */
  analyser?: AnalyserNode | null;
  /**
   * Prefetched FFT from AnalyserBus — used when the host already owns a byte buffer.
   * Held by ref inside the hook so buffer identity churn does not restart the drive loop.
   */
  frequencyData?: Uint8Array | null;
};

/**
 * Push Butterchurn-only gain/EQ.
 * Meyda bass drive samples FFT (~30 Hz) and writes bassEmphasis into the Butterchurn branch.
 * Never attaches nodes to butterchurnTap — that risked disconnect fights with Butterchurn itself.
 */
export function useApplyButterchurnAudioSettings(
  applySettings: ((settings: ButterchurnAudioSettings) => void) | null,
  settings: VisualizerSettingsValues,
  opts: ApplyOpts = {},
): void {
  const analyser = opts.analyser ?? null;
  const frequencyData = opts.frequencyData ?? null;
  const meydaBassDrive = settings.meydaBassDrive === true;
  const binsRef = useRef<Uint8Array | null>(null);
  const frequencyDataRef = useRef(frequencyData);
  const settingsRef = useRef(settings);
  frequencyDataRef.current = frequencyData;
  settingsRef.current = settings;

  useEffect(() => {
    if (!applySettings) return;

    const canDrive = meydaBassDrive && (analyser != null || frequencyDataRef.current != null);
    if (!canDrive) {
      try {
        applySettings(resolveButterchurnAudioSettings(settingsRef.current, null));
      } catch {
        /* graph may be mid-teardown */
      }
      return;
    }

    if (analyser && (!binsRef.current || binsRef.current.length !== analyser.frequencyBinCount)) {
      binsRef.current = new Uint8Array(analyser.frequencyBinCount);
    }

    let raf = 0;
    let lastApply = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - lastApply < 33) return;
      lastApply = now;

      let bins: Uint8Array | null = null;
      if (analyser && binsRef.current) {
        try {
          analyser.getByteFrequencyData(binsRef.current as Uint8Array<ArrayBuffer>);
          bins = binsRef.current;
        } catch {
          return;
        }
      } else {
        const fd = frequencyDataRef.current;
        if (fd && fd.length > 0) bins = fd;
      }
      if (!bins) return;

      // Drive from absolute low energy — bass *share* stays flat while kicks still hit.
      const { low, bassShare } = meterSharesFromFrequency(bins);
      const signal = Math.min(1, low * (0.45 + 0.55 * bassShare) * 1.25);
      try {
        applySettings(resolveButterchurnAudioSettings(settingsRef.current, signal));
      } catch {
        /* graph may be mid-teardown */
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [applySettings, analyser, meydaBassDrive]);

  useEffect(() => {
    if (!applySettings || meydaBassDrive) return;
    try {
      applySettings(resolveButterchurnAudioSettings(settings, null));
    } catch {
      /* graph may be mid-teardown */
    }
  }, [applySettings, meydaBassDrive, settings.bassEmphasis, settings.sensitivity]);
}
