import { useCallback, useRef } from 'react';

import { useApplyButterchurnAudioSettings } from '../audioSettings';
import type { VisualizerFrameProps } from '../../core/types';
import { getButterchurnPresetKey } from '../presets/approved/presetKeys';
import { useButterchurnEngine } from './useButterchurnEngine';

type ButterchurnExperienceProps = VisualizerFrameProps & {
  experienceId: string;
  audioContext: AudioContext | null;
};

/** Butterchurn-backed visual experience — requires live Web Audio in the same renderer. */
export function ButterchurnExperience({
  experienceId,
  audioContext,
  analyser,
  butterchurnTap,
  applyButterchurnAudioSettings,
  frequencyData,
  width,
  height,
  settings,
}: ButterchurnExperienceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const presetKey = getButterchurnPresetKey(experienceId) ?? '';
  const blendSeconds = typeof settings.blendSeconds === 'number' ? settings.blendSeconds : 0.8;
  const audioNode = butterchurnTap ?? analyser;

  useApplyButterchurnAudioSettings(applyButterchurnAudioSettings ?? null, settings, {
    analyser,
    frequencyData,
  });

  const handleError = useCallback((message: string) => {
    console.warn('[Butterchurn]', message);
  }, []);

  const { ready, failed, errorMessage } = useButterchurnEngine({
    canvasRef,
    audioContext,
    audioNode,
    presetKey,
    blendSeconds,
    width,
    height,
    enabled: Boolean(audioContext && audioNode && presetKey),
    onError: handleError,
  });

  return (
    <div className="visualizer-butterchurn-host">
      <canvas ref={canvasRef} className="visualizer-canvas visualizer-canvas-butterchurn" aria-hidden="true" />
      {!ready && !failed ? <p className="visualizer-butterchurn-status">Loading visualizer…</p> : null}
      {failed ? (
        <p className="visualizer-butterchurn-status">
          {errorMessage ?? 'Visualizer unavailable — audio connection required.'}
        </p>
      ) : null}
    </div>
  );
}

/** Factory — binds an experience id to the shared Butterchurn renderer. */
export function createButterchurnExperienceComponent(experienceId: string) {
  return function BoundButterchurnExperience(
    props: VisualizerFrameProps & { audioContext?: AudioContext | null },
  ) {
    return (
      <ButterchurnExperience
        {...props}
        experienceId={experienceId}
        audioContext={props.audioContext ?? props.analyser?.context ?? null}
      />
    );
  };
}
