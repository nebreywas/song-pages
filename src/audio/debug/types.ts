export type AudioDebugLevel = 'info' | 'warn' | 'error';

export type AudioDebugEvent = {
  id: number;
  ts: number;
  level: AudioDebugLevel;
  source: string;
  message: string;
  data?: Record<string, unknown>;
};

export type AudioElementSnapshot = {
  present: boolean;
  paused: boolean | null;
  muted: boolean | null;
  volume: number | null;
  currentTime: number | null;
  duration: number | null;
  readyState: number | null;
  readyStateLabel: string | null;
  src: string | null;
  networkState: number | null;
};

export type AudioGraphSnapshot = {
  attached: boolean;
  mode: string | null;
  contextState: string | null;
  speakerGain: number | null;
  fftSize: number | null;
};

export type AnalyserSnapshot = {
  connected: boolean;
  peakBin: number;
  avgBin: number;
  silent: boolean;
};

export type IpcStreamSnapshot = {
  role: 'sender' | 'receiver' | null;
  sending: boolean;
  receiving: boolean;
  framesSent: number;
  framesReceived: number;
  lastFrameAgeMs: number | null;
  lastPeakBin: number;
  sendBlockedReason: string | null;
};

export type VisualizerSessionSnapshot = {
  embeddedActive: boolean;
  windowOpen: boolean;
  projectionMode: string | null;
  activeSession: string | null;
  analyserEnabled: boolean;
  mirrorEnabled: boolean;
  experienceId: string | null;
};

export type AudioDebugSnapshot = {
  updatedAt: number;
  main: AudioElementSnapshot;
  mirror: AudioElementSnapshot;
  graph: AudioGraphSnapshot;
  analyser: AnalyserSnapshot;
  ipc: IpcStreamSnapshot;
  visualizer: VisualizerSessionSnapshot;
  isPlaying: boolean;
};
