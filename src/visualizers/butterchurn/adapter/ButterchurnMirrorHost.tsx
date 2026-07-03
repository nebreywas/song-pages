import { useEffect, useRef } from 'react';

import type { VisualizerSettingsValues } from '../../core/settings/schema/types';
import type { ButterchurnAudioSettings } from '../../audioGraph';
import { useApplyButterchurnAudioSettings } from '../audioSettings';
import { getButterchurnPresetKey } from '../presets/approved/presetKeys';
import { useButterchurnEngine } from './useButterchurnEngine';

const MIRROR_WIDTH = 1280;
const MIRROR_HEIGHT = 720;
const MIRROR_FPS_MS = 33;

type ButterchurnMirrorHostProps = {
  experienceId: string;
  audioContext: AudioContext | null;
  butterchurnTap: GainNode | null;
  analyser: AnalyserNode | null;
  applyButterchurnAudioSettings: ((settings: ButterchurnAudioSettings) => void) | null;
  settings: VisualizerSettingsValues;
  enabled: boolean;
  onFrame: (dataUrl: string) => void;
};

/**
 * Hidden Butterchurn renderer in the main window — captures WebGL frames for projection.
 * Butterchurn requires a live AudioNode; remote windows cannot run it directly.
 */
export function ButterchurnMirrorHost({
  experienceId,
  audioContext,
  butterchurnTap,
  analyser,
  applyButterchurnAudioSettings,
  settings,
  enabled,
  onFrame,
}: ButterchurnMirrorHostProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const presetKey = getButterchurnPresetKey(experienceId) ?? '';
  const audioNode = butterchurnTap ?? analyser;
  const blendSeconds = typeof settings.blendSeconds === 'number' ? settings.blendSeconds : 0.8;

  useApplyButterchurnAudioSettings(applyButterchurnAudioSettings, settings);

  const { ready } = useButterchurnEngine({
    canvasRef,
    audioContext,
    audioNode,
    presetKey,
    blendSeconds,
    width: MIRROR_WIDTH,
    height: MIRROR_HEIGHT,
    enabled: enabled && Boolean(presetKey),
  });

  useEffect(() => {
    if (!enabled || !ready) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const tick = () => {
      try {
        onFrame(canvas.toDataURL('image/jpeg', 0.72));
      } catch {
        // Canvas may be tainted or zero-sized during teardown.
      }
    };

    tick();
    const intervalId = window.setInterval(tick, MIRROR_FPS_MS);
    return () => window.clearInterval(intervalId);
  }, [enabled, onFrame, ready]);

  return (
    <div className="visualizer-butterchurn-mirror-host" aria-hidden="true">
      <canvas
        ref={canvasRef}
        className="visualizer-canvas visualizer-canvas-butterchurn-mirror"
        width={MIRROR_WIDTH}
        height={MIRROR_HEIGHT}
      />
    </div>
  );
}
