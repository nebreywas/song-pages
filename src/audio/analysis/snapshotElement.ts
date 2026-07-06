import type { AudioElementSnapshot } from '../debug/types';

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

function readyStateLabel(state: number | null): string | null {
  if (state == null) return null;
  const labels = ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'];
  return labels[state] ?? `unknown(${state})`;
}

/** Read live <audio> element fields for the debug panel. */
export function snapshotAudioElement(audio: HTMLAudioElement | null | undefined): AudioElementSnapshot {
  if (!audio) return defaultElementSnapshot();

  return {
    present: true,
    paused: audio.paused,
    muted: audio.muted,
    volume: audio.volume,
    currentTime: audio.currentTime,
    duration: Number.isFinite(audio.duration) ? audio.duration : null,
    readyState: audio.readyState,
    readyStateLabel: readyStateLabel(audio.readyState),
    src: audio.currentSrc || audio.src || null,
    networkState: audio.networkState,
  };
}
