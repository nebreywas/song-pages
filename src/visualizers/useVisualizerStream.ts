import { useEffect, useRef, useState } from 'react';

import type { VisualizerStreamConfig, VisualizerStreamFrame } from '@shared/visualizerMessages';

import { getApp } from '../lib/bridge';
import { FFT_SIZE } from './audioGraph';
import { audioDebug, measureFrequencyBins } from './debug/audioDebug';

type StreamState = {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  experienceId: string;
  song: VisualizerStreamConfig['song'];
  projectionMode: VisualizerStreamConfig['projectionMode'];
  pageUrl: string | null;
  frame: number;
  canvasFrame: string | null;
};

/** Projection window: receive FFT frames forwarded by the main process over IPC. */
export function useVisualizerIpcStream(): { stream: StreamState | null; connected: boolean } {
  const [state, setState] = useState<StreamState | null>(null);
  const [connected, setConnected] = useState(false);
  const metaRef = useRef<{
    experienceId: string;
    song: VisualizerStreamConfig['song'];
    projectionMode: VisualizerStreamConfig['projectionMode'];
    pageUrl: string | null;
  }>({
    experienceId: 'spectrum',
    song: null,
    projectionMode: 'visualizer',
    pageUrl: null,
  });

  useEffect(() => {
    const app = getApp();
    if (!app?.visualizer?.onConfig || !app.visualizer.onFrame) return;

    const frequencyData = new Uint8Array(FFT_SIZE / 2);
    const timeDomainData = new Uint8Array(FFT_SIZE);
    let framesReceived = 0;
    let lastFrameAt = 0;
    let lastStallWarnAt = 0;

    audioDebug.log('ipc-recv', 'Projection stream listener attached');

    const offConfig = app.visualizer.onConfig((message: VisualizerStreamConfig) => {
      setConnected(true);
      metaRef.current = {
        experienceId: message.experienceId,
        song: message.song,
        projectionMode: message.projectionMode ?? 'visualizer',
        pageUrl: message.pageUrl ?? null,
      };
      setState((prev) => ({
        frequencyData: prev?.frequencyData ?? frequencyData,
        timeDomainData: prev?.timeDomainData ?? timeDomainData,
        currentTime: prev?.currentTime ?? 0,
        duration: prev?.duration ?? 0,
        isPlaying: prev?.isPlaying ?? false,
        experienceId: message.experienceId,
        song: message.song,
        projectionMode: message.projectionMode ?? 'visualizer',
        pageUrl: message.pageUrl ?? null,
        frame: prev?.frame ?? 0,
        canvasFrame: prev?.canvasFrame ?? null,
      }));
    });

    const offFrame = app.visualizer.onFrame((message: VisualizerStreamFrame) => {
      setConnected(true);
      framesReceived += 1;
      lastFrameAt = Date.now();
      const bins =
        message.frequency instanceof Uint8Array
          ? message.frequency
          : new Uint8Array(message.frequency);
      frequencyData.set(bins);
      const fft = measureFrequencyBins(frequencyData);
      audioDebug.patchSnapshot({
        ipc: {
          role: 'receiver',
          receiving: true,
          framesReceived,
          lastFrameAgeMs: 0,
          lastPeakBin: fft.peak,
        },
        analyser: {
          connected: true,
          peakBin: fft.peak,
          avgBin: fft.avg,
          silent: fft.silent,
        },
        isPlaying: message.isPlaying,
      });
      if (framesReceived === 1) {
        audioDebug.log('ipc-recv', 'First frame received', { peak: fft.peak, isPlaying: message.isPlaying });
      }
      if (fft.silent && message.isPlaying && framesReceived % 120 === 0) {
        audioDebug.log('ipc-recv', 'Frame received but FFT is silent', { peak: fft.peak }, 'warn');
      }
      setState({
        frequencyData,
        timeDomainData,
        currentTime: message.currentTime,
        duration: message.duration,
        isPlaying: message.isPlaying,
        experienceId: metaRef.current.experienceId,
        song: metaRef.current.song,
        projectionMode: metaRef.current.projectionMode,
        pageUrl: metaRef.current.pageUrl,
        frame: lastFrameAt,
        canvasFrame: message.canvasFrame ?? null,
      });
    });

    const stallId = window.setInterval(() => {
      if (!lastFrameAt) return;
      const ageMs = Date.now() - lastFrameAt;
      audioDebug.patchSnapshot({
        ipc: { lastFrameAgeMs: ageMs },
      });
      const snap = audioDebug.getSnapshot();
      if (snap.isPlaying && ageMs > 500 && framesReceived > 0 && Date.now() - lastStallWarnAt > 2000) {
        lastStallWarnAt = Date.now();
        audioDebug.log('ipc-recv', 'Projection frame stall detected', { lastFrameAgeMs: ageMs }, 'warn');
      }
    }, 250);

    return () => {
      offConfig();
      offFrame();
      window.clearInterval(stallId);
      setConnected(false);
      audioDebug.log('ipc-recv', 'Projection stream disconnected');
    };
  }, []);

  return { stream: state, connected };
}

/** ~60fps polling — setInterval keeps running when another window has focus (rAF does not). */
const FRAME_INTERVAL_MS = 16;

/** Main window: push config/FFT/canvas frames to the projection window via IPC. */
export function useVisualizerIpcSender(options: {
  enabled: boolean;
  sendFrames: boolean;
  analyser: AnalyserNode | null;
  experienceId: string;
  song: VisualizerStreamConfig['song'];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  projectionMode: VisualizerStreamConfig['projectionMode'];
  pageUrl: string | null;
  canvasFrame?: string | null;
}): void {
  const {
    enabled,
    sendFrames,
    analyser,
    experienceId,
    song,
    isPlaying,
    currentTime,
    duration,
    projectionMode,
    pageUrl,
    canvasFrame = null,
  } = options;
  const intervalRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(analyser);
  const timingRef = useRef({ currentTime, duration, isPlaying });
  const canvasFrameRef = useRef<string | null>(canvasFrame);
  const framesSentRef = useRef(0);
  const wasSendingRef = useRef(false);
  const lastSendBlockedRef = useRef<string | null>(null);

  useEffect(() => {
    analyserRef.current = analyser;
  }, [analyser]);

  useEffect(() => {
    canvasFrameRef.current = canvasFrame;
  }, [canvasFrame]);

  useEffect(() => {
    timingRef.current = { currentTime, duration, isPlaying };
  }, [currentTime, duration, isPlaying]);

  useEffect(() => {
    const app = getApp();
    if (!enabled || !app?.visualizer?.sendConfig) return;

    const sendConfig = () => {
      const config: VisualizerStreamConfig = {
        type: 'config',
        experienceId,
        song,
        projectionMode,
        pageUrl,
      };
      app.visualizer!.sendConfig(config);
    };

    sendConfig();
    const intervalId = window.setInterval(sendConfig, 1000);
    const offSync = app.visualizer.onRequestSync?.(() => sendConfig());

    return () => {
      window.clearInterval(intervalId);
      offSync?.();
    };
  }, [enabled, experienceId, pageUrl, projectionMode, song]);

  useEffect(() => {
    const app = getApp();

    const describeBlock = (): string | null => {
      if (!enabled) return 'ipc disabled (window closed)';
      if (!sendFrames) return 'sendFrames false (not visualizer projection or analyser off)';
      if (!analyserRef.current) return 'analyser null';
      if (!app?.visualizer?.sendFrame) return 'bridge missing sendFrame';
      return null;
    };

    const blocked = describeBlock();
    lastSendBlockedRef.current = blocked;

    if (blocked) {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      audioDebug.patchSnapshot({
        ipc: {
          role: 'sender',
          sending: false,
          sendBlockedReason: blocked,
        },
      });
      if (sendFrames && enabled) {
        audioDebug.log('ipc-send', 'Frame loop stopped', { reason: blocked }, 'warn');
      }
      wasSendingRef.current = false;
      return;
    }

    const node = analyserRef.current!;
    const scratch = new Uint8Array(node.frequencyBinCount);
    framesSentRef.current = 0;

    audioDebug.log('ipc-send', 'Frame loop started', {
      fftSize: node.fftSize,
      binCount: node.frequencyBinCount,
    });

    const tick = () => {
      const activeAnalyser = analyserRef.current;
      if (!activeAnalyser) return;

      activeAnalyser.getByteFrequencyData(scratch as Uint8Array<ArrayBuffer>);
      const timing = timingRef.current;
      const fft = measureFrequencyBins(scratch);

      app.visualizer!.sendFrame({
        type: 'frame',
        // Copy — scratch buffer is reused each tick; typed array IPC is cheaper than Array.from.
        frequency: new Uint8Array(scratch),
        currentTime: timing.currentTime,
        duration: timing.duration,
        isPlaying: timing.isPlaying,
        canvasFrame: canvasFrameRef.current,
      });

      framesSentRef.current += 1;
      audioDebug.patchSnapshot({
        ipc: {
          role: 'sender',
          sending: true,
          sendBlockedReason: null,
          framesSent: framesSentRef.current,
          lastPeakBin: fft.peak,
        },
        analyser: {
          connected: true,
          peakBin: fft.peak,
          avgBin: fft.avg,
          silent: fft.silent,
        },
      });

      if (framesSentRef.current === 1) {
        audioDebug.log('ipc-send', 'First frame sent', { peak: fft.peak });
      }
      if (fft.silent && timing.isPlaying && framesSentRef.current % 120 === 0) {
        audioDebug.log('ipc-send', 'Sending silent FFT while playing', { peak: fft.peak }, 'warn');
      }
    };

    tick();
    intervalRef.current = window.setInterval(tick, FRAME_INTERVAL_MS);
    wasSendingRef.current = true;
    return () => {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      audioDebug.log('ipc-send', 'Frame loop torn down', {
        framesSent: framesSentRef.current,
        wasSending: wasSendingRef.current,
      });
      wasSendingRef.current = false;
    };
  }, [analyser, enabled, sendFrames]);
}
