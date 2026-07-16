/**
 * Meyda Lab — experimental audio-feature playground.
 * Read-only: taps the shared mirror AnalyserBus (butterchurnTap → AnalyserNode).
 * Use this to decide what to wire into lyric pulse / visualizers / narrative UI later.
 */

import { useEffect, useMemo, useState, type RefObject } from 'react';

import { useFloatingPanelDrag } from '../../lib/useFloatingPanelDrag';
import { useAnalyserBus } from '../hooks/useAnalyserBus';
import {
  MEYDA_CORE_FEATURES,
  MEYDA_EXTRA_FEATURES,
  MEYDA_FEATURE_HINTS,
  MEYDA_FEATURE_LABELS,
  type MeydaLabFeatureId,
} from './features';
import { meydaLabStore } from './meydaLabStore';
import { useMeydaAnalyzer } from './useMeydaAnalyzer';

import '../../styles/meyda-lab.css';

const MEYDA_LAB_POS_KEY = 'songpages:meyda-lab-panel-pos';

function Meter({
  label,
  hint,
  value,
  max = 1,
  format,
  accent,
}: {
  label: string;
  hint?: string;
  value: number | undefined;
  max?: number;
  format?: (n: number) => string;
  accent?: 'bass' | 'mid' | 'treble' | 'default';
}) {
  if (value == null || !Number.isFinite(value)) {
    return (
      <div className="meyda-lab-meter">
        <div className="meyda-lab-meter-label">
          <span>{label}</span>
          <span>—</span>
        </div>
        {hint ? <p className="meyda-lab-meter-hint">{hint}</p> : null}
        <div className="meyda-lab-meter-track">
          <div className="meyda-lab-meter-fill" style={{ width: '0%' }} />
        </div>
      </div>
    );
  }
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`meyda-lab-meter accent-${accent ?? 'default'}`}>
      <div className="meyda-lab-meter-label">
        <span>{label}</span>
        <span>{format ? format(value) : value.toFixed(3)}</span>
      </div>
      {hint ? <p className="meyda-lab-meter-hint">{hint}</p> : null}
      <div className="meyda-lab-meter-track">
        <div className="meyda-lab-meter-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ChromaBars({ chroma }: { chroma: number[] | undefined }) {
  if (!chroma?.length) return <p className="meyda-lab-hint">Chroma off or waiting for audio.</p>;
  const max = Math.max(...chroma, 0.0001);
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return (
    <div className="meyda-lab-chroma" aria-label="Chroma">
      {chroma.map((v, i) => (
        <div key={names[i] ?? i} className="meyda-lab-chroma-col">
          <div className="meyda-lab-chroma-bar" style={{ height: `${(v / max) * 100}%` }} />
          <span>{names[i]}</span>
        </div>
      ))}
    </div>
  );
}

type MeydaLabPanelProps = {
  mirrorAudioRef: RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
};

export function MeydaLabPanel({ mirrorAudioRef, isPlaying }: MeydaLabPanelProps) {
  const [visible, setVisible] = useState(() => meydaLabStore.isPanelVisible());
  const [collapsed, setCollapsed] = useState(false);
  const [enabledExtras, setEnabledExtras] = useState<Record<string, boolean>>({
    chroma: false,
    mfcc: false,
  });
  const [pulseDemo, setPulseDemo] = useState(0);
  const drag = useFloatingPanelDrag(MEYDA_LAB_POS_KEY);

  useEffect(() => {
    const refresh = () => setVisible(meydaLabStore.isPanelVisible());
    window.addEventListener('songpages-meyda-lab-changed', refresh);
    return () => window.removeEventListener('songpages-meyda-lab-changed', refresh);
  }, []);

  const bus = useAnalyserBus({
    consumerId: 'meyda-lab',
    audioRef: mirrorAudioRef,
    isPlaying,
    enabled: visible,
  });

  const featureIds = useMemo(() => {
    const extras = MEYDA_EXTRA_FEATURES.filter((id) => enabledExtras[id]);
    return [...MEYDA_CORE_FEATURES, ...extras] as MeydaLabFeatureId[];
  }, [enabledExtras]);

  // Sample AnalyserBus time-domain via Meyda.extract (no ScriptProcessor → destination).
  const { features, narrative, running, error, resetNarrative } = useMeydaAnalyzer({
    enabled: visible && isPlaying,
    audioContext: bus.audioContext,
    analyser: bus.analyser,
    featureIds,
  });

  // Pulse uses loudness + a little bass share so kicks read better than RMS alone.
  useEffect(() => {
    const rms = typeof features.rms === 'number' ? features.rms : 0;
    const bassKick = features.bands.bassShare * 0.55;
    setPulseDemo(Math.min(1, rms * 5.5 + bassKick));
  }, [features.rms, features.bands.bassShare]);

  if (!visible) return null;

  const loudnessTotal =
    features.loudness && typeof features.loudness === 'object'
      ? features.loudness.total
      : undefined;

  const graphReady = Boolean(bus.audioContext && bus.analyser);
  const statusLabel = running
    ? 'live'
    : !isPlaying
      ? 'idle'
      : !graphReady
        ? 'no graph'
        : 'arming…';

  return (
    <div
      ref={drag.panelRef}
      className={`meyda-lab-panel${collapsed ? ' collapsed' : ''}${drag.dragging ? ' is-dragging' : ''}`}
      style={drag.style}
    >
      <header
        className="meyda-lab-header meyda-lab-header--drag"
        title="Drag to move · double-click to reset"
        onPointerDown={drag.onHeaderPointerDown}
        onPointerMove={drag.onHeaderPointerMove}
        onPointerUp={drag.onHeaderPointerUp}
        onPointerCancel={drag.onHeaderPointerCancel}
        onDoubleClick={drag.onHeaderDoubleClick}
      >
        <strong>Meyda Lab</strong>
        <span className="meyda-lab-shortcut" title="Toggle panel">
          ⌘⌃⌥M
        </span>
        <span
          className={`meyda-lab-pill${running ? ' is-live' : ''}`}
          title={
            graphReady
              ? 'Sampling AnalyserBus time-domain buffer'
              : 'Waiting for mirror AnalyserBus graph'
          }
        >
          {statusLabel}
        </span>
        <div className="meyda-lab-header-actions">
          <button type="button" onClick={() => setCollapsed((v) => !v)}>
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
          <button
            type="button"
            onClick={() => {
              meydaLabStore.setPanelVisible(false);
              setVisible(false);
            }}
          >
            Close
          </button>
        </div>
      </header>

      {!collapsed ? (
        <div className="meyda-lab-body">
          <p className="meyda-lab-lede">
            You don’t need DSP school for this. Watch <strong>Bass share</strong> on kicks/drops,
            <strong> How loud</strong> for pulses, <strong>Brightness</strong> for airy vs dark.
            Narrative below is a toy mood journal — not lyrics meaning.
          </p>

          {error ? <p className="meyda-lab-error">{error}</p> : null}
          {!isPlaying ? (
            <p className="meyda-lab-hint">
              Press play on a local (file/HLS) track — not a YouTube/SoundCloud widget.
            </p>
          ) : null}
          {isPlaying && !graphReady ? (
            <p className="meyda-lab-hint">
              Mirror graph not ready yet. Keep this panel open — it arms the analyser feed
              automatically.
            </p>
          ) : null}

          <div
            className="meyda-lab-pulse-demo"
            style={{
              transform: `scale(${1 + pulseDemo * 0.2})`,
              opacity: 0.5 + pulseDemo * 0.5,
            }}
            title="Loudness + bass share → pulse (lyric stand-in)"
          >
            pulse
          </div>

          <section>
            <h4>Bands (derived — Meyda has no “bass” dial)</h4>
            <Meter
              label="Bass share (~20–160 Hz)"
              hint="Kick / sub / low boom. Should jump on drops. This is what felt missing before."
              value={features.bands.bassShare}
              max={1}
              format={(n) => `${Math.round(n * 100)}%`}
              accent="bass"
            />
            <Meter
              label="Mid share (~160 Hz–2 kHz)"
              hint="Body of the mix — often vocals, guitars, synth flesh."
              value={features.bands.midShare}
              max={1}
              format={(n) => `${Math.round(n * 100)}%`}
              accent="mid"
            />
            <Meter
              label="Treble share (~2 kHz+)"
              hint="Hats, air, sparkle. High with brightness = glittery."
              value={features.bands.trebleShare}
              max={1}
              format={(n) => `${Math.round(n * 100)}%`}
              accent="treble"
            />
          </section>

          <section>
            <h4>Feel meters (plain English)</h4>
            <Meter
              label={MEYDA_FEATURE_LABELS.rms}
              hint={MEYDA_FEATURE_HINTS.rms}
              value={features.rms}
              max={0.3}
            />
            <Meter
              label={MEYDA_FEATURE_LABELS.energy}
              hint={MEYDA_FEATURE_HINTS.energy}
              value={features.energy}
              max={80}
            />
            <Meter
              label={MEYDA_FEATURE_LABELS.loudness}
              hint={MEYDA_FEATURE_HINTS.loudness}
              value={loudnessTotal}
              max={24}
              format={(n) => `${n.toFixed(2)} sones`}
            />
            <Meter
              label={MEYDA_FEATURE_LABELS.spectralCentroid}
              hint={MEYDA_FEATURE_HINTS.spectralCentroid}
              value={features.spectralCentroid}
              max={8000}
              format={(n) => `${Math.round(n)} Hz`}
            />
            <Meter
              label={MEYDA_FEATURE_LABELS.zcr}
              hint={MEYDA_FEATURE_HINTS.zcr}
              value={features.zcr}
              max={200}
            />
            <Meter
              label={MEYDA_FEATURE_LABELS.spectralFlatness}
              hint={MEYDA_FEATURE_HINTS.spectralFlatness}
              value={features.spectralFlatness}
              max={1}
            />
            <Meter
              label={MEYDA_FEATURE_LABELS.spectralRolloff}
              hint={MEYDA_FEATURE_HINTS.spectralRolloff}
              value={features.spectralRolloff}
              max={12000}
              format={(n) => `${Math.round(n)} Hz`}
            />
            <Meter
              label={MEYDA_FEATURE_LABELS.spectralSpread}
              hint={MEYDA_FEATURE_HINTS.spectralSpread}
              value={features.spectralSpread}
              max={4000}
            />
            <Meter
              label={MEYDA_FEATURE_LABELS.perceptualSpread}
              hint={MEYDA_FEATURE_HINTS.perceptualSpread}
              value={features.perceptualSpread}
              max={1}
            />
            <Meter
              label={MEYDA_FEATURE_LABELS.perceptualSharpness}
              hint={MEYDA_FEATURE_HINTS.perceptualSharpness}
              value={features.perceptualSharpness}
              max={1}
            />
          </section>

          <section>
            <h4>Extras (heavier)</h4>
            {MEYDA_EXTRA_FEATURES.map((id) => (
              <label key={id} className="meyda-lab-toggle">
                <input
                  type="checkbox"
                  checked={Boolean(enabledExtras[id])}
                  onChange={(e) =>
                    setEnabledExtras((prev) => ({ ...prev, [id]: e.target.checked }))
                  }
                />
                <span>
                  {MEYDA_FEATURE_LABELS[id]}
                  <em className="meyda-lab-toggle-hint"> — {MEYDA_FEATURE_HINTS[id]}</em>
                </span>
              </label>
            ))}
            {enabledExtras.chroma ? <ChromaBars chroma={features.chroma} /> : null}
            {enabledExtras.mfcc && features.mfcc?.length ? (
              <p className="meyda-lab-hint mono">
                MFCC: {features.mfcc.slice(0, 8).map((n) => n.toFixed(2)).join(', ')}
                …
              </p>
            ) : null}
          </section>

          <section>
            <div className="meyda-lab-section-head">
              <h4>Session narrative (toy)</h4>
              <button type="button" onClick={resetNarrative}>
                Clear
              </button>
            </div>
            <p className="meyda-lab-hint">
              Now watches bass drops, punches, swells, bright/dark, noise, brittle highs, mid focus —
              rotating phrases per kind. Still not “what the song means.”
            </p>
            <ul className="meyda-lab-narrative">
              {narrative.length === 0 ? (
                <li className="meyda-lab-hint">Play a track — moments appear as the mix shifts.</li>
              ) : (
                narrative.map((ev) => (
                  <li key={ev.id}>
                    <span className="meyda-lab-kind">{ev.kind}</span> {ev.text}
                  </li>
                ))
              )}
            </ul>
          </section>

          <section>
            <h4>Ideas to steal later</h4>
            <ul className="meyda-lab-ideas">
              <li>Lyric pulse from RMS + bass share (kicks punch words)</li>
              <li>Bass share → Butterchurn bass emphasis / beat reactivity</li>
              <li>Centroid / treble → palette lean or glow temperature</li>
              <li>Quiet / release → soften ornaments</li>
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}
