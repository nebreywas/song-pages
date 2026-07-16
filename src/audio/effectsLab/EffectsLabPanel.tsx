import { useState } from 'react';

import { getApp } from '../../lib/bridge';
import { useFloatingPanelDrag } from '../../lib/useFloatingPanelDrag';
import { PERFORMANCE_EFFECT_DEFINITIONS } from './performance/definitions';
import { runPerformanceEffect } from './performance/runPerformanceEffect';
import type { PerformanceEffectId, PerformanceEffectPhase } from './performance/types';
import {
  clampPlaybackRateHold,
  isPlaybackRateHoldActive,
  PLAYBACK_RATE_HOLD_MAX,
  PLAYBACK_RATE_HOLD_MIN,
  PLAYBACK_RATE_HOLD_PRESETS,
} from './playbackRate';
import { getLabEffectDefinition, WHOLE_SONG_EFFECT_MENU_ORDER } from './presets';
import type { EffectsLabState, LabEffectId } from './types';
import { presetSupportsWorkletEnhance } from './worklet/loadWorkletProcessors';
import { isEffectsLabAudible } from './types';

import '../../styles/effects-lab.css';

const EFFECTS_LAB_POS_KEY = 'songpages:effects-lab-panel-pos';

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
  /**
   * When true, performance pads IPC to the VC capture stream; whole-song Activate/A/B
   * continue via vc:state projection.
   */
  vcMirrorPlaybackActive?: boolean;
  /** Tell ListenerMode to keep the dry mirror route up for performance FX (main path). */
  onPerformanceRouteChange?: (active: boolean) => void;
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
  vcMirrorPlaybackActive = false,
  onPerformanceRouteChange,
  mainAudioRef,
  mirrorAudioRef,
  mainVolume,
}: EffectsLabPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const drag = useFloatingPanelDrag(EFFECTS_LAB_POS_KEY);

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
    if (effectsOffline) return;

    // VC open — pads target the capture stream so Discord/OBS hear the sweep.
    if (vcMirrorPlaybackActive) {
      getApp()?.vc?.sendPerformanceEffect?.({ effectId, phase });
      return;
    }

    const main = mainAudioRef.current;
    const mirror = mirrorAudioRef.current;
    if (!main || !mirror) return;

    runPerformanceEffect({
      targetAudio: mirror,
      duckAudio: main,
      duckRestoreVolume: mainVolume,
      keepDuckMuted: isEffectsLabAudible(state),
      speakerGain: 1,
      syncFromAudio: main,
      effectId,
      phase,
      onRouteActiveChange: onPerformanceRouteChange,
      restorePlaybackRate: state.playbackRateHold,
    });
  };

  const showWorkletToggle =
    presetSupportsWorkletEnhance(state.effectId) && state.effectId !== 'tape';

  const activeEffectLabel = getLabEffectDefinition(state.effectId)?.label;
  const showActiveEffectPill =
    collapsed && !effectsOffline && isEffectsLabAudible(state) && Boolean(activeEffectLabel);

  const performanceDisabled = effectsOffline;
  const performanceDisabledTitle = effectsOffline
    ? 'Effects path unavailable for this source'
    : undefined;

  return (
    <div
      ref={drag.panelRef}
      className={`effects-lab-panel${collapsed ? ' collapsed' : ''}${drag.dragging ? ' is-dragging' : ''}`}
      style={drag.style}
    >
      <header
        className="effects-lab-header effects-lab-header--drag"
        title="Drag to move · double-click to reset"
        onPointerDown={drag.onHeaderPointerDown}
        onPointerMove={drag.onHeaderPointerMove}
        onPointerUp={drag.onHeaderPointerUp}
        onPointerCancel={drag.onHeaderPointerCancel}
        onDoubleClick={drag.onHeaderDoubleClick}
      >
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
          {vcMirrorPlaybackActive && !effectsOffline ? (
            <span
              className="effects-lab-vc-pill"
              title="Effects target the VC window stream while VC Mode is open"
            >
              → VC
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

          {/*
            Same abBypass flag both ways: isEffectsLabAudible treats hold as
            temporary remove when Activate is on, temporary apply when off.
            With VC open, state projects to the VC stream via audioMirror.playbackEffects.
          */}
          <button
            type="button"
            className={`effects-lab-btn effects-lab-ab${state.abBypass ? ' active' : ''}`}
            disabled={effectsOffline || state.effectId === 'bypass'}
            onPointerDown={() => patch({ abBypass: true })}
            onPointerUp={() => patch({ abBypass: false })}
            onPointerLeave={() => patch({ abBypass: false })}
            onPointerCancel={() => patch({ abBypass: false })}
          >
            {state.enabled
              ? 'Hold to temporarily remove effect'
              : 'Hold to temporarily apply effect'}
          </button>

          <section className="effects-lab-rate-hold">
            <h3 className="effects-lab-section-title">Speed / Pitch Hold</h3>
            <p className="effects-lab-concept">
              Steady coupled speed+pitch (DJ-style). Resets to normal on the next song. Bursts below
              always return to this hold.
            </p>
            <label className="effects-lab-field">
              <span>
                Rate: {state.playbackRateHold.toFixed(2)}×
                {isPlaybackRateHoldActive(state.playbackRateHold) ? '' : ' (normal)'}
              </span>
              <input
                type="range"
                min={PLAYBACK_RATE_HOLD_MIN}
                max={PLAYBACK_RATE_HOLD_MAX}
                step={0.01}
                value={state.playbackRateHold}
                disabled={effectsOffline}
                onChange={(e) =>
                  patch({ playbackRateHold: clampPlaybackRateHold(Number(e.target.value)) })
                }
              />
            </label>
            <div className="effects-lab-rate-presets">
              {PLAYBACK_RATE_HOLD_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className={`effects-lab-btn effects-lab-rate-preset${
                    Math.abs(state.playbackRateHold - preset.rate) < 0.005 ? ' active' : ''
                  }`}
                  disabled={effectsOffline}
                  onClick={() => patch({ playbackRateHold: preset.rate })}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </section>

          <section className="effects-lab-performance">
            <h3 className="effects-lab-section-title">Audio Effects</h3>
            <div className="effects-lab-performance-grid">
              {PERFORMANCE_EFFECT_DEFINITIONS.map((row) =>
                row.hold ? (
                  <button
                    key={row.id}
                    type="button"
                    className="effects-lab-btn effects-lab-perf-btn"
                    title={
                      performanceDisabledTitle ??
                      (vcMirrorPlaybackActive
                        ? `${row.concept} (VC stream)`
                        : row.concept)
                    }
                    disabled={performanceDisabled}
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
                    title={
                      performanceDisabledTitle ??
                      (vcMirrorPlaybackActive
                        ? `${row.concept} (VC stream)`
                        : row.concept)
                    }
                    disabled={performanceDisabled}
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
