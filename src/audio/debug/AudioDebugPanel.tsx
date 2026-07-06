import { useEffect, useState } from 'react';

import {
  audioDebug,
  type AudioDebugEvent,
  type AudioDebugSnapshot,
  emptyAudioDebugSnapshot,
} from './audioDebug';

import '../../styles/audio-debug.css';

function formatTime(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString(undefined, {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
}

function Row({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  const text = value == null ? '—' : String(value);
  return (
    <div className="audio-debug-row">
      <span className="audio-debug-label">{label}</span>
      <span className="audio-debug-value">{text}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="audio-debug-section">
      <h4>{title}</h4>
      {children}
    </section>
  );
}

type AudioDebugPanelProps = {
  /** Shown in corner badge — e.g. "main" or "projection". */
  surface?: string;
};

/** Live audio pipeline diagnostics — dev default, toggle via panel header. */
export function AudioDebugPanel({ surface = 'main' }: AudioDebugPanelProps) {
  const [visible, setVisible] = useState(() => audioDebug.isPanelVisible());
  const [logging, setLogging] = useState(() => audioDebug.isLoggingEnabled());
  const [snapshot, setSnapshot] = useState<AudioDebugSnapshot>(emptyAudioDebugSnapshot());
  const [events, setEvents] = useState<AudioDebugEvent[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setSnapshot(audioDebug.getSnapshot());
      setEvents(audioDebug.getEvents());
      setVisible(audioDebug.isPanelVisible());
      setLogging(audioDebug.isLoggingEnabled());
    };
    refresh();
    const offStore = audioDebug.subscribe(refresh);
    window.addEventListener('songpages-audio-debug-changed', refresh);
    return () => {
      offStore();
      window.removeEventListener('songpages-audio-debug-changed', refresh);
    };
  }, []);

  if (!visible) return null;

  const warnIpc =
    snapshot.ipc.role === 'receiver' &&
    snapshot.isPlaying &&
    snapshot.ipc.lastFrameAgeMs != null &&
    snapshot.ipc.lastFrameAgeMs > 500;

  const warnAnalyser = snapshot.analyser.connected && snapshot.isPlaying && snapshot.analyser.silent;
  const warnMirror =
    snapshot.visualizer.mirrorEnabled &&
    snapshot.isPlaying &&
    snapshot.mirror.present &&
    snapshot.mirror.paused === true;
  const warnMirrorMuted =
    snapshot.graph.attached &&
    snapshot.isPlaying &&
    (snapshot.mirror.muted === true || (snapshot.mirror.volume != null && snapshot.mirror.volume <= 0));

  return (
    <div className={`audio-debug-panel${collapsed ? ' collapsed' : ''}`} data-surface={surface}>
      <header className="audio-debug-header">
        <strong>Audio debug · {surface}</strong>
        <span className="audio-debug-shortcut" title="Toggle panel">
          ⌘⇧D
        </span>
        <div className="audio-debug-header-actions">
          <button
            type="button"
            className="audio-debug-btn"
            onClick={() => setCollapsed((value) => !value)}
            aria-expanded={!collapsed}
          >
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
          <button
            type="button"
            className="audio-debug-btn"
            onClick={() => {
              const next = !logging;
              audioDebug.setLoggingEnabled(next);
              setLogging(next);
            }}
          >
            Log: {logging ? 'on' : 'off'}
          </button>
          <button
            type="button"
            className="audio-debug-btn"
            onClick={() => {
              audioDebug.setPanelVisible(false);
              setVisible(false);
            }}
          >
            Hide
          </button>
        </div>
      </header>

      {!collapsed ? (
        <div className="audio-debug-body">
          {(warnIpc || warnAnalyser || warnMirror || warnMirrorMuted) && (
            <div className="audio-debug-alert">
              {warnIpc ? 'IPC frames stalled (>500ms). ' : ''}
              {warnAnalyser ? 'Analyser silent while playing. ' : ''}
              {warnMirror ? 'Mirror paused while mirror path enabled. ' : ''}
              {warnMirrorMuted ? 'Mirror muted/volume=0 blocks FFT in Chromium. ' : ''}
            </div>
          )}

          <Section title="Visualizer session">
            <Row label="session" value={snapshot.visualizer.activeSession} />
            <Row label="embedded" value={snapshot.visualizer.embeddedActive} />
            <Row label="window" value={snapshot.visualizer.windowOpen} />
            <Row label="projection" value={snapshot.visualizer.projectionMode} />
            <Row label="analyser enabled" value={snapshot.visualizer.analyserEnabled} />
            <Row label="mirror enabled" value={snapshot.visualizer.mirrorEnabled} />
            <Row label="experience" value={snapshot.visualizer.experienceId} />
            <Row label="isPlaying" value={snapshot.isPlaying} />
          </Section>

          <Section title="Main audio">
            <Row label="paused" value={snapshot.main.paused} />
            <Row label="readyState" value={snapshot.main.readyStateLabel} />
            <Row label="time" value={snapshot.main.currentTime?.toFixed(1) ?? null} />
          </Section>

          <Section title="Mirror audio">
            <Row label="present" value={snapshot.mirror.present} />
            <Row label="paused" value={snapshot.mirror.paused} />
            <Row label="muted" value={snapshot.mirror.muted} />
            <Row label="volume" value={snapshot.mirror.volume} />
            <Row label="readyState" value={snapshot.mirror.readyStateLabel} />
            <Row label="time" value={snapshot.mirror.currentTime?.toFixed(1) ?? null} />
            <Row label="src" value={snapshot.mirror.src ? 'loaded' : 'empty'} />
          </Section>

          <Section title="Web Audio graph">
            <Row label="attached" value={snapshot.graph.attached} />
            <Row label="mode" value={snapshot.graph.mode} />
            <Row label="context" value={snapshot.graph.contextState} />
            <Row label="speaker gain" value={snapshot.graph.speakerGain} />
          </Section>

          <Section title="Analyser FFT">
            <Row label="connected" value={snapshot.analyser.connected} />
            <Row label="peak bin" value={snapshot.analyser.peakBin} />
            <Row label="avg bin" value={Math.round(snapshot.analyser.avgBin)} />
            <Row label="silent" value={snapshot.analyser.silent} />
          </Section>

          <Section title="IPC stream">
            <Row label="role" value={snapshot.ipc.role} />
            <Row label="sending" value={snapshot.ipc.sending} />
            <Row label="receiving" value={snapshot.ipc.receiving} />
            <Row label="frames sent" value={snapshot.ipc.framesSent} />
            <Row label="frames recv" value={snapshot.ipc.framesReceived} />
            <Row label="last frame age ms" value={snapshot.ipc.lastFrameAgeMs} />
            <Row label="send blocked" value={snapshot.ipc.sendBlockedReason} />
          </Section>

          <Section title="Recent events">
            <ol className="audio-debug-events">
              {[...events].reverse().slice(0, 12).map((event) => (
                <li key={event.id} className={`audio-debug-event level-${event.level}`}>
                  <span className="audio-debug-event-time">{formatTime(event.ts)}</span>
                  <span className="audio-debug-event-source">{event.source}</span>
                  <span className="audio-debug-event-msg">{event.message}</span>
                </li>
              ))}
            </ol>
          </Section>
        </div>
      ) : null}
    </div>
  );
}

/** Keyboard + menu toggle for the audio debug panel. */
export function useAudioDebugHotkey(): void {
  useEffect(() => {
    const onToggle = () => {
      audioDebug.togglePanel();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      const mod = event.metaKey || event.ctrlKey;

      // Mac-friendly primary: ⌘⇧D
      if (mod && event.shiftKey && !event.altKey && event.code === 'KeyD') {
        event.preventDefault();
        onToggle();
        return;
      }

      // Secondary: ⌘⌥A — must use event.code; Option+A is not key "a" on Mac.
      if (mod && event.altKey && !event.shiftKey && event.code === 'KeyA') {
        event.preventDefault();
        onToggle();
      }
    };

    window.addEventListener('songpages-audio-debug-toggle', onToggle);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('songpages-audio-debug-toggle', onToggle);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, []);
}
