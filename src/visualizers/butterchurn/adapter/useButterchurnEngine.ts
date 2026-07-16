import { useEffect, useRef, useState } from 'react';

import { loadButterchurn } from '../engine/loadModules';
import type { ButterchurnVisualizer } from 'butterchurn';
import { resumeAudioContext } from '../../../audio/graph/registry';
import { resolvePresetByKey } from '../presets/registry';

type UseButterchurnEngineOptions = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  audioContext: AudioContext | null;
  audioNode: AudioNode | null;
  presetKey: string;
  blendSeconds: number;
  width: number;
  height: number;
  enabled: boolean;
  onError?: (message: string) => void;
};

/** Manage Butterchurn WebGL lifecycle — init, preset load, render loop, teardown. */
export function useButterchurnEngine({
  canvasRef,
  audioContext,
  audioNode,
  presetKey,
  blendSeconds,
  width,
  height,
  enabled,
  onError,
}: UseButterchurnEngineOptions): { ready: boolean; failed: boolean; errorMessage: string | null } {
  const visualizerRef = useRef<ButterchurnVisualizer | null>(null);
  const connectedNodeRef = useRef<AudioNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const presetKeyRef = useRef(presetKey);
  const blendRef = useRef(blendSeconds);
  const sizeRef = useRef({ width, height });

  useEffect(() => {
    presetKeyRef.current = presetKey;
  }, [presetKey]);

  useEffect(() => {
    blendRef.current = blendSeconds;
  }, [blendSeconds]);

  useEffect(() => {
    sizeRef.current = { width, height };
    const visualizer = visualizerRef.current;
    if (!visualizer || !ready) return;
    // Butterchurn requires a third options argument — omitting it throws.
    visualizer.setRendererSize?.(width, height, {});
  }, [height, ready, width]);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      setFailed(false);
      setErrorMessage(null);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (connectedNodeRef.current && visualizerRef.current?.disconnectAudio) {
        visualizerRef.current.disconnectAudio(connectedNodeRef.current);
      }
      connectedNodeRef.current = null;
      visualizerRef.current?.destroy?.();
      visualizerRef.current = null;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || !audioContext || !audioNode) return;

    let cancelled = false;

    const boot = async () => {
      try {
        resumeAudioContext(audioContext);
        await audioContext.resume();

        const butterchurn = await loadButterchurn();
        if (cancelled) return;

        if (connectedNodeRef.current && visualizerRef.current?.disconnectAudio) {
          visualizerRef.current.disconnectAudio(connectedNodeRef.current);
        }
        visualizerRef.current?.destroy?.();

        const { width: bootWidth, height: bootHeight } = sizeRef.current;
        const visualizer = butterchurn.createVisualizer(audioContext, canvas, {
          width: Math.max(1, bootWidth),
          height: Math.max(1, bootHeight),
          pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        });

        visualizer.connectAudio(audioNode);
        connectedNodeRef.current = audioNode;

        const preset = await resolvePresetByKey(presetKeyRef.current);
        visualizer.loadPreset(preset, blendRef.current);

        visualizerRef.current = visualizer;
        setReady(true);
        setFailed(false);
        setErrorMessage(null);

        const tick = () => {
          visualizerRef.current?.render();
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Butterchurn failed to start.';
        setReady(false);
        setFailed(true);
        setErrorMessage(message);
        onError?.(message);
      }
    };

    void boot();

    return () => {
      cancelled = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (connectedNodeRef.current && visualizerRef.current?.disconnectAudio) {
        visualizerRef.current.disconnectAudio(connectedNodeRef.current);
      }
      connectedNodeRef.current = null;
      visualizerRef.current?.destroy?.();
      visualizerRef.current = null;
      setReady(false);
    };
  }, [audioContext, audioNode, canvasRef, enabled, onError]);

  useEffect(() => {
    const visualizer = visualizerRef.current;
    if (!visualizer || !ready) return;

    let cancelled = false;
    void (async () => {
      try {
        const preset = await resolvePresetByKey(presetKey);
        if (cancelled) return;
        visualizer.loadPreset(preset, blendSeconds);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not load preset.';
        onError?.(message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [blendSeconds, onError, presetKey, ready]);

  return { ready, failed, errorMessage };
}
