import { useEffect, useState } from 'react';

import { PERFORMANCE_EFFECT_DEFINITIONS } from './performance/definitions';
import { runPerformanceEffect } from './performance/runPerformanceEffect';
import type { PerformanceEffectId, PerformanceEffectPhase } from './performance/types';
import { LAB_EFFECT_DEFINITIONS } from './presets';
import { effectsLabStore } from './effectsLabStore';
import type { EffectsLabState, LabEffectDefinition, LabEffectId } from './types';
import { presetSupportsWorkletEnhance } from './worklet/loadWorkletProcessors';
import { isEffectsLabAudible } from './types';

import '../../styles/effects-lab.css';

const TIER_GROUPS: { tier: LabEffectDefinition['tier']; label: string }[] = [
  { tier: 'production', label: 'Production references' },
  { tier: 'phase-a', label: 'Phase A — tonal' },
  { tier: 'phase-b', label: 'Phase B — spatial' },
  { tier: 'phase-c', label: 'Phase C — whole-song (from performance)' },
  { tier: 'phase-d', label: 'Phase D — tape / worklet' },
  { tier: 'phase-e', label: 'Phase E — hybrid worklets' },
];

const WORKLET_ENHANCE_LABELS: Partial<Record<LabEffectId, string>> = {
  tape: 'Wow/flutter (AudioWorklet A/B)',
  alive: 'Harmonic exciter (AudioWorklet A/B)',
  punch: 'Transient emphasis (AudioWorklet A/B)',
};

const WORKLET_ENHANCE_HINTS: Partial<Record<LabEffectId, string>> = {
  tape: 'Native Tape baseline vs hybrid wow/flutter — toggle while playing to compare.',
  alive: 'Native Alive presence vs parallel harmonic blend — toggle while playing to compare.',
  punch: 'Native Punch groove vs transient emphasis worklet — toggle while playing to compare.',
};

type EffectsLabPanelProps = {
  state: EffectsLabState;
  onChange: (next: EffectsLabState) => void;
  mirrorAttached: boolean;
  graphMode: 'tap' | 'playback' | 'none';
  mainAudioRef: React.RefObject<HTMLAudioElement | null>;
  mirrorAudioRef: React.RefObject<HTMLAudioElement | null>;
  mainVolume: number;
};

/** Internal discovery harness — whole-song presets + Phase C performance triggers. */
export function EffectsLabPanel({
  state,
  onChange,
  mirrorAttached,
  graphMode,
  mainAudioRef,
  mirrorAudioRef,
  mainVolume,
}: EffectsLabPanelProps) {
  const [visible, setVisible] = useState(() => effectsLabStore.isPanelVisible());
  const [collapsed, setCollapsed] = useState(false);
  const [perfStatus, setPerfStatus] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setVisible(effectsLabStore.isPanelVisible());
    refresh();
    window.addEventListener('songpages-effects-lab-changed', refresh);
    return () => window.removeEventListener('songpages-effects-lab-changed', refresh);
  }, []);

  if (!visible) return null;

  const selected = LAB_EFFECT_DEFINITIONS.find((row) => row.id === state.effectId);

  const patch = (partial: Partial<EffectsLabState>) => onChange({ ...state, ...partial });

  const firePerformance = (effectId: PerformanceEffectId, phase: PerformanceEffectPhase) => {
    const main = mainAudioRef.current;
    const mirror = mirrorAudioRef.current;
    if (!main || !mirror) {
      setPerfStatus('Attach mirror audio (play a track first).');
      return;
    }

    const ok = runPerformanceEffect({
      mirrorAudio: mirror,
      mainAudio: main,
      mainVolume,
      keepMirrorAudible: isEffectsLabAudible(state),
      effectId,
      phase,
    });

    if (!ok) return;
    const def = PERFORMANCE_EFFECT_DEFINITIONS.find((row) => row.id === effectId);
    setPerfStatus(
      phase === 'hold'
        ? `Holding: ${def?.label ?? effectId}`
        : phase === 'release'
          ? `Released: ${def?.label ?? effectId}`
          : `Triggered: ${def?.label ?? effectId}`,
    );
  };

  return (
    <div className={`effects-lab-panel${collapsed ? ' collapsed' : ''}`}>
      <header className="effects-lab-header">
        <strong>Effects Lab</strong>
        <span className="effects-lab-shortcut" title="Toggle panel">
          ⌘⌃⌥E
        </span>
        <div className="effects-lab-header-actions">
          <button type="button" className="effects-lab-btn" onClick={() => setCollapsed((v) => !v)}>
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
          <button
            type="button"
            className="effects-lab-btn"
            onClick={() => effectsLabStore.setPanelVisible(false)}
          >
            Close
          </button>
        </div>
      </header>

      {!collapsed ? (
        <div className="effects-lab-body">
          <p className="effects-lab-lead">
            Discovery harness — mirror Web Audio path. Whole-song presets duck main; performance
            effects trigger on the mirror graph.
          </p>

          <label className="effects-lab-field">
            <span>Whole-song effect</span>
            <select
              value={state.effectId}
              onChange={(e) => patch({ effectId: e.target.value as LabEffectId })}
            >
              {TIER_GROUPS.map(({ tier, label }) => (
                <optgroup key={tier} label={label}>
                  {LAB_EFFECT_DEFINITIONS.filter((row) => row.tier === tier).map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          {selected ? (
            <p className="effects-lab-concept">
              <span className="effects-lab-tier">{selected.tier}</span> {selected.concept}
            </p>
          ) : null}

          <label className="effects-lab-field effects-lab-field-inline">
            <input
              type="checkbox"
              checked={state.enabled}
              onChange={(e) => patch({ enabled: e.target.checked })}
            />
            <span>Enable on mirror (ducks main)</span>
          </label>

          {presetSupportsWorkletEnhance(state.effectId) ? (
            <label className="effects-lab-field effects-lab-field-inline">
              <input
                type="checkbox"
                checked={state.workletEnhance}
                onChange={(e) => patch({ workletEnhance: e.target.checked })}
                disabled={!state.enabled}
              />
              <span>{WORKLET_ENHANCE_LABELS[state.effectId] ?? 'Worklet enhance (A/B)'}</span>
            </label>
          ) : null}

          {WORKLET_ENHANCE_HINTS[state.effectId] ? (
            <p className="effects-lab-tape-hint">{WORKLET_ENHANCE_HINTS[state.effectId]}</p>
          ) : null}

          <label className="effects-lab-field">
            <span>Output trim (dB): {state.outputTrimDb.toFixed(1)}</span>
            <input
              type="range"
              min={-6}
              max={6}
              step={0.5}
              value={state.outputTrimDb}
              onChange={(e) => patch({ outputTrimDb: Number(e.target.value) })}
            />
          </label>

          <button
            type="button"
            className={`effects-lab-btn effects-lab-ab${state.abBypass ? ' active' : ''}`}
            onPointerDown={() => patch({ abBypass: true })}
            onPointerUp={() => patch({ abBypass: false })}
            onPointerLeave={() => patch({ abBypass: false })}
            onPointerCancel={() => patch({ abBypass: false })}
          >
            Hold for A/B (bypass)
          </button>

          <section className="effects-lab-performance">
            <h3 className="effects-lab-section-title">Phase C — Performance</h3>
            <p className="effects-lab-performance-lead">
              Click to trigger or hold momentary filters. Play a song first.
            </p>
            <div className="effects-lab-performance-grid">
              {PERFORMANCE_EFFECT_DEFINITIONS.map((row) =>
                row.hold ? (
                  <button
                    key={row.id}
                    type="button"
                    className="effects-lab-btn effects-lab-perf-btn"
                    title={row.concept}
                    onPointerDown={() => firePerformance(row.id, 'hold')}
                    onPointerUp={() => firePerformance(row.id, 'release')}
                    onPointerLeave={() => firePerformance(row.id, 'release')}
                    onPointerCancel={() => firePerformance(row.id, 'release')}
                  >
                    {row.label}
                    <span className="effects-lab-perf-hint">hold</span>
                  </button>
                ) : (
                  <button
                    key={row.id}
                    type="button"
                    className="effects-lab-btn effects-lab-perf-btn"
                    title={row.concept}
                    onClick={() => firePerformance(row.id, 'trigger')}
                  >
                    {row.label}
                  </button>
                ),
              )}
            </div>
            {perfStatus ? <div className="effects-lab-perf-status">{perfStatus}</div> : null}
          </section>

          <div className="effects-lab-status">
            <div>Mirror graph: {mirrorAttached ? graphMode : 'not attached'}</div>
            <div>
              Audible:{' '}
              {state.enabled && state.effectId !== 'bypass' && !state.abBypass
                ? 'lab whole-song'
                : 'main/native (performance triggers mirror temporarily)'}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
