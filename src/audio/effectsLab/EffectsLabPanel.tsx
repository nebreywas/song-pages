import { useState } from 'react';

import { PERFORMANCE_EFFECT_DEFINITIONS } from './performance/definitions';
import { runPerformanceEffect } from './performance/runPerformanceEffect';
import type { PerformanceEffectId, PerformanceEffectPhase } from './performance/types';
import { getLabEffectDefinition, WHOLE_SONG_EFFECT_MENU_ORDER } from './presets';
import type { EffectsLabState, LabEffectId } from './types';
import { presetSupportsWorkletEnhance } from './worklet/loadWorkletProcessors';
import { isEffectsLabAudible } from './types';

import '../../styles/effects-lab.css';

const WORKLET_ENHANCE_LABELS: Partial<Record<LabEffectId, string>> = {
  alive: 'Harmonic exciter (AudioWorklet A/B)',
  punch: 'Transient emphasis (AudioWorklet A/B)',
};

type EffectsLabPanelProps = {
  state: EffectsLabState;
  onChange: (next: EffectsLabState) => void;
  crossfades: boolean;
  onCrossfadesChange: (enabled: boolean) => void;
  /** Widget transport (YouTube / SoundCloud) — mirror FX path unavailable while playing. */
  effectsOffline?: boolean;
  mainAudioRef: React.RefObject<HTMLAudioElement | null>;
  mirrorAudioRef: React.RefObject<HTMLAudioElement | null>;
  mainVolume: number;
};

/** Whole-song presets + momentary performance effects — integrated player panel. */
export function EffectsLabPanel({
  state,
  onChange,
  crossfades,
  onCrossfadesChange,
  effectsOffline = false,
  mainAudioRef,
  mirrorAudioRef,
  mainVolume,
}: EffectsLabPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (!state.panelVisible) return null;

  const patch = (partial: Partial<EffectsLabState>) => onChange({ ...state, ...partial });

  const onEffectIdChange = (effectId: LabEffectId) => {
    const next: Partial<EffectsLabState> = { effectId };
    // Tape wow/flutter is approved — always on when Tape is selected.
    if (effectId === 'tape') {
      next.workletEnhance = true;
    }
    patch(next);
  };

  const firePerformance = (effectId: PerformanceEffectId, phase: PerformanceEffectPhase) => {
    const main = mainAudioRef.current;
    const mirror = mirrorAudioRef.current;
    if (!main || !mirror) return;

    runPerformanceEffect({
      mirrorAudio: mirror,
      mainAudio: main,
      mainVolume,
      keepMirrorAudible: isEffectsLabAudible(state),
      effectId,
      phase,
    });
  };

  const showWorkletToggle =
    presetSupportsWorkletEnhance(state.effectId) && state.effectId !== 'tape';

  const activeEffectLabel = getLabEffectDefinition(state.effectId)?.label;
  const showActiveEffectPill =
    collapsed && !effectsOffline && isEffectsLabAudible(state) && Boolean(activeEffectLabel);

  return (
    <div className={`effects-lab-panel${collapsed ? ' collapsed' : ''}`}>
      <header className="effects-lab-header">
        <strong className="effects-lab-title">
          Audio &amp; Effects
          {showActiveEffectPill ? (
            <span className="effects-lab-active-pill">{activeEffectLabel}</span>
          ) : null}
          {effectsOffline ? (
            <span className="effects-lab-offline-pill" title="This source plays outside the effects path">
              offline
            </span>
          ) : null}
        </strong>
        <div className="effects-lab-header-actions">
          <button type="button" className="effects-lab-btn" onClick={() => setCollapsed((v) => !v)}>
            {collapsed ? 'Open' : 'Minimize'}
          </button>
        </div>
      </header>

      {!collapsed ? (
        <div className="effects-lab-body">
          <label className="effects-lab-field">
            <span>Whole-song effect</span>
            <select
              value={state.effectId}
              onChange={(e) => onEffectIdChange(e.target.value as LabEffectId)}
            >
              {WHOLE_SONG_EFFECT_MENU_ORDER.map((id) => {
                const def = getLabEffectDefinition(id);
                return (
                  <option key={id} value={id}>
                    {def?.label ?? id}
                  </option>
                );
              })}
            </select>
          </label>

          <label className="effects-lab-field effects-lab-field-inline">
            <input
              type="checkbox"
              checked={state.enabled}
              onChange={(e) => {
                const enabled = e.target.checked;
                patch({
                  enabled,
                  ...(enabled && state.effectId === 'tape' ? { workletEnhance: true } : {}),
                });
              }}
            />
            <span>Activate</span>
          </label>

          {showWorkletToggle ? (
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

          <label className="effects-lab-field">
            <span>Strength (dB): {state.outputTrimDb.toFixed(1)}</span>
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
            {state.enabled
              ? 'Hold to temporarily remove effect'
              : 'Hold to temporarily apply effect'}
          </button>

          <section className="effects-lab-performance">
            <h3 className="effects-lab-section-title">Audio Effects</h3>
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
          </section>

          <section className="effects-lab-audio-settings">
            <h3 className="effects-lab-section-title">Audio Settings</h3>
            <label className="effects-lab-field effects-lab-field-inline">
              <input
                type="checkbox"
                checked={crossfades}
                onChange={(e) => onCrossfadesChange(e.target.checked)}
              />
              <span>Crossfade between songs</span>
            </label>
          </section>
        </div>
      ) : null}
    </div>
  );
}
