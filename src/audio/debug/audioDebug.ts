/**
 * In-app audio / visualizer diagnostics.
 *
 * Enabled in dev by default; set localStorage `songpages:audio-debug` to `0` to silence logs,
 * or `1` to force on in production builds. Panel visibility: `songpages:audio-debug-panel`.
 */
import { measureFrequencyBins } from '../analysis/frequencyBins';
import { snapshotAudioElement } from '../analysis/snapshotElement';
import type {
  AudioDebugEvent,
  AudioDebugLevel,
  AudioDebugSnapshot,
  AudioElementSnapshot,
} from './types';

export type {
  AudioDebugEvent,
  AudioDebugLevel,
  AudioDebugSnapshot,
  AudioElementSnapshot,
  AudioGraphSnapshot,
  AnalyserSnapshot,
  IpcStreamSnapshot,
  VisualizerSessionSnapshot,
} from './types';

export { measureFrequencyBins, snapshotAudioElement };

const STORAGE_LOG_KEY = 'songpages:audio-debug';
const STORAGE_PANEL_KEY = 'songpages:audio-debug-panel';
const MAX_EVENTS = 250;

let eventId = 0;

const defaultElementSnapshot = (): AudioElementSnapshot => ({
  present: false,
  paused: null,
  muted: null,
  volume: null,
  currentTime: null,
  duration: null,
  readyState: null,
  readyStateLabel: null,
  src: null,
  networkState: null,
});

export const emptyAudioDebugSnapshot = (): AudioDebugSnapshot => ({
  updatedAt: 0,
  main: defaultElementSnapshot(),
  mirror: defaultElementSnapshot(),
  graph: {
    attached: false,
    mode: null,
    contextState: null,
    speakerGain: null,
    fftSize: null,
  },
  analyser: {
    connected: false,
    peakBin: 0,
    avgBin: 0,
    silent: true,
  },
  ipc: {
    role: null,
    sending: false,
    receiving: false,
    framesSent: 0,
    framesReceived: 0,
    lastFrameAgeMs: null,
    lastPeakBin: 0,
    sendBlockedReason: null,
  },
  visualizer: {
    embeddedActive: false,
    windowOpen: false,
    projectionMode: null,
    activeSession: null,
    analyserEnabled: false,
    mirrorEnabled: false,
    experienceId: null,
  },
  isPlaying: false,
});

function isDevBuild(): boolean {
  return typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;
}

function readStorageFlag(key: string, devDefault: boolean): boolean {
  if (typeof localStorage === 'undefined') return devDefault && isDevBuild();
  const raw = localStorage.getItem(key);
  if (raw === '1') return true;
  if (raw === '0') return false;
  return devDefault;
}

class AudioDebugStore {
  private events: AudioDebugEvent[] = [];
  private snapshot: AudioDebugSnapshot = emptyAudioDebugSnapshot();
  private listeners = new Set<() => void>();

  isLoggingEnabled(): boolean {
    return readStorageFlag(STORAGE_LOG_KEY, isDevBuild());
  }

  isPanelVisible(): boolean {
    return readStorageFlag(STORAGE_PANEL_KEY, isDevBuild());
  }

  setPanelVisible(visible: boolean): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_PANEL_KEY, visible ? '1' : '0');
    }
    this.notify();
  }

  togglePanel(): boolean {
    const next = !this.isPanelVisible();
    this.setPanelVisible(next);
    if (next) {
      this.setLoggingEnabled(true);
      this.log('hotkey', 'Audio debug panel opened');
    }
    return next;
  }

  setLoggingEnabled(enabled: boolean): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_LOG_KEY, enabled ? '1' : '0');
    }
    this.notify();
  }

  log(source: string, message: string, data?: Record<string, unknown>, level: AudioDebugLevel = 'info'): void {
    const entry: AudioDebugEvent = {
      id: ++eventId,
      ts: Date.now(),
      level,
      source,
      message,
      data,
    };

    this.events.push(entry);
    if (this.events.length > MAX_EVENTS) {
      this.events.splice(0, this.events.length - MAX_EVENTS);
    }

    if (this.isLoggingEnabled()) {
      const prefix = `[audio:${source}] ${message}`;
      if (level === 'error') console.error(prefix, data ?? '');
      else if (level === 'warn') console.warn(prefix, data ?? '');
      else console.info(prefix, data ?? '');
    }

    this.notify();
  }

  patchSnapshot(patch: Partial<AudioDebugSnapshot>): void {
    this.snapshot = {
      ...this.snapshot,
      ...patch,
      updatedAt: Date.now(),
      main: patch.main ? { ...this.snapshot.main, ...patch.main } : this.snapshot.main,
      mirror: patch.mirror ? { ...this.snapshot.mirror, ...patch.mirror } : this.snapshot.mirror,
      graph: patch.graph ? { ...this.snapshot.graph, ...patch.graph } : this.snapshot.graph,
      analyser: patch.analyser ? { ...this.snapshot.analyser, ...patch.analyser } : this.snapshot.analyser,
      ipc: patch.ipc ? { ...this.snapshot.ipc, ...patch.ipc } : this.snapshot.ipc,
      visualizer: patch.visualizer
        ? { ...this.snapshot.visualizer, ...patch.visualizer }
        : this.snapshot.visualizer,
    };
    this.notify();
  }

  getSnapshot(): AudioDebugSnapshot {
    return this.snapshot;
  }

  getEvents(): AudioDebugEvent[] {
    return this.events;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const audioDebug = new AudioDebugStore();
