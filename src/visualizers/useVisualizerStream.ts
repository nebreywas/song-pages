import { useEffect, useRef, useState } from 'react';

import type { VisualizerStreamConfig, VisualizerStreamFrame } from '@shared/visualizerMessages';

import { getApp } from '../lib/bridge';
import { FFT_SIZE } from './audioGraph';

type StreamState = {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  pluginId: string;
  song: VisualizerStreamConfig['song'];
  frame: number;
};

/** Projection window: receive FFT frames forwarded by the main process over IPC. */
export function useVisualizerIpcStream(): { stream: StreamState | null; connected: boolean } {
  const [state, setState] = useState<StreamState | null>(null);
  const [connected, setConnected] = useState(false);
  const metaRef = useRef<{ pluginId: string; song: VisualizerStreamConfig['song'] }>({
    pluginId: 'bars',
    song: null,
  });

  useEffect(() => {
    const app = getApp();
    if (!app?.visualizer?.onConfig || !app.visualizer.onFrame) return;

    const frequencyData = new Uint8Array(FFT_SIZE / 2);
    const timeDomainData = new Uint8Array(FFT_SIZE);

    const offConfig = app.visualizer.onConfig((message: VisualizerStreamConfig) => {
      setConnected(true);
      metaRef.current = { pluginId: message.pluginId, song: message.song };
      setState((prev) => ({
        frequencyData: prev?.frequencyData ?? frequencyData,
        timeDomainData: prev?.timeDomainData ?? timeDomainData,
        currentTime: prev?.currentTime ?? 0,
        duration: prev?.duration ?? 0,
        isPlaying: prev?.isPlaying ?? false,
        pluginId: message.pluginId,
        song: message.song,
        frame: prev?.frame ?? 0,
      }));
    });

    const offFrame = app.visualizer.onFrame((message: VisualizerStreamFrame) => {
      setConnected(true);
      const bins =
        message.frequency instanceof Uint8Array
          ? message.frequency
          : new Uint8Array(message.frequency);
      frequencyData.set(bins);
      setState({
        frequencyData,
        timeDomainData,
        currentTime: message.currentTime,
        duration: message.duration,
        isPlaying: message.isPlaying,
        pluginId: metaRef.current.pluginId,
        song: metaRef.current.song,
        frame: Date.now(),
      });
    });

    return () => {
      offConfig();
      offFrame();
      setConnected(false);
    };
  }, []);

  return { stream: state, connected };
}

/** ~60fps polling — setInterval keeps running when another window has focus (rAF does not). */
const FRAME_INTERVAL_MS = 16;

/** Main window: push analyser frames to the projection window via IPC. */
export function useVisualizerIpcSender(options: {
  enabled: boolean;
  analyser: AnalyserNode | null;
  pluginId: string;
  song: VisualizerStreamConfig['song'];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}): void {
  const { enabled, analyser, pluginId, song, isPlaying, currentTime, duration } = options;
  const intervalRef = useRef<number | null>(null);
  const timingRef = useRef({ currentTime, duration, isPlaying });

  useEffect(() => {
    timingRef.current = { currentTime, duration, isPlaying };
  }, [currentTime, duration, isPlaying]);

  useEffect(() => {
    const app = getApp();
    if (!enabled || !app?.visualizer?.sendConfig) return;

    const sendConfig = () => {
      const config: VisualizerStreamConfig = { type: 'config', pluginId, song };
      app.visualizer!.sendConfig(config);
    };

    sendConfig();
    const intervalId = window.setInterval(sendConfig, 1000);
    const offSync = app.visualizer.onRequestSync?.(() => sendConfig());

    return () => {
      window.clearInterval(intervalId);
      offSync?.();
    };
  }, [enabled, pluginId, song]);

  useEffect(() => {
    const app = getApp();
    if (!enabled || !analyser || !app?.visualizer?.sendFrame) {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const scratch = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(scratch as Uint8Array<ArrayBuffer>);
      const timing = timingRef.current;
      app.visualizer!.sendFrame({
        type: 'frame',
        frequency: Array.from(scratch),
        currentTime: timing.currentTime,
        duration: timing.duration,
        isPlaying: timing.isPlaying,
      });
    };

    tick();
    intervalRef.current = window.setInterval(tick, FRAME_INTERVAL_MS);
    return () => {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [analyser, enabled]);
}
