import { useSyncExternalStore } from 'react';

import { ALARE_SPEED_NUDGE_MAX_STEPS, ALARE_SPEED_NUDGE_STEP } from '@shared/alare';

import {
  getAlareLiveDebugSnapshot,
  subscribeAlareLiveDebug,
} from '../live-debug/alareLiveDebugStore';

type VcLiveDebugHudProps = {
  enabled: boolean;
};

function formatSignedPercent(fraction: number): string {
  const pct = fraction * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

function formatRate(linesPerSec: number): string {
  if (!Number.isFinite(linesPerSec) || linesPerSec === 0) return '—';
  const sign = linesPerSec > 0 ? '+' : '';
  return `${sign}${linesPerSec.toFixed(3)} ln/s`;
}

/** How long until trim accumulates ~1 line of lead/lag at the current drift. */
function formatSecPerLine(driftLinesPerSec: number): string {
  if (!Number.isFinite(driftLinesPerSec) || Math.abs(driftLinesPerSec) < 1e-6) return '—';
  const sec = 1 / Math.abs(driftLinesPerSec);
  if (sec >= 60) return `~${(sec / 60).toFixed(1)} min / line`;
  return `~${sec.toFixed(0)}s / line`;
}

function AlareDebugSection() {
  const snap = useSyncExternalStore(
    subscribeAlareLiveDebug,
    getAlareLiveDebugSnapshot,
    getAlareLiveDebugSnapshot,
  );

  if (!snap.active) {
    return (
      <section className="vc-live-debug-section">
        <h3>ALARE</h3>
        <p className="vc-live-debug-muted">No ALARE lyrics cell active.</p>
      </section>
    );
  }

  const stepLabel =
    snap.nudgeSteps === 0
      ? '0 (default)'
      : `${snap.nudgeSteps > 0 ? '+' : ''}${snap.nudgeSteps} / ±${ALARE_SPEED_NUDGE_MAX_STEPS}`;

  return (
    <section className="vc-live-debug-section">
      <h3>ALARE</h3>
      <dl className="vc-live-debug-dl">
        <div>
          <dt>Trim</dt>
          <dd>
            {formatSignedPercent(snap.nudge)}{' '}
            <span className="vc-live-debug-muted">({stepLabel})</span>
          </dd>
        </div>
        <div>
          <dt>Step size</dt>
          <dd>{formatSignedPercent(ALARE_SPEED_NUDGE_STEP)} per press</dd>
        </div>
        <div>
          <dt>Avg timeline</dt>
          <dd>{formatRate(snap.baseLinesPerSec).replace(/^\+/, '')}</dd>
        </div>
        <div>
          <dt>Drift</dt>
          <dd>
            {formatRate(snap.driftLinesPerSec)}{' '}
            <span className="vc-live-debug-muted">({formatSecPerLine(snap.driftLinesPerSec)})</span>
          </dd>
        </div>
        <div>
          <dt>Line offset</dt>
          <dd>
            {snap.nudgeLineOffset >= 0 ? '+' : ''}
            {snap.nudgeLineOffset.toFixed(2)} lines
            {snap.scrollClamped ? (
              <span className="vc-live-debug-warn"> · clamped</span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>Scroll pos</dt>
          <dd>
            {snap.scrollLinePosition.toFixed(2)} / {snap.maxLineIndex}
          </dd>
        </div>
        {snap.densityPressure != null ? (
          <div>
            <dt>Density</dt>
            <dd>{snap.densityPressure.toFixed(2)}</dd>
          </div>
        ) : null}
        {snap.durationSource ? (
          <div>
            <dt>Duration</dt>
            <dd>{snap.durationSource}</dd>
          </div>
        ) : null}
      </dl>
      <p className="vc-live-debug-note">
        Trim adds line drift over wall-clock time — not a 1:1 faster/slower scroll. Resets on song
        change.
      </p>
    </section>
  );
}

/**
 * Live Debug HUD on the VC surface — sectioned readout for realtime systems.
 * Visibility follows the app-wide Live Debug setting (mirrored via VC state).
 */
export function VcLiveDebugHud({ enabled }: VcLiveDebugHudProps) {
  if (!enabled) return null;

  return (
    <aside className="vc-live-debug-hud" aria-label="Live Debug">
      <header className="vc-live-debug-header">
        <span className="vc-live-debug-badge">Live Debug</span>
      </header>
      <AlareDebugSection />
    </aside>
  );
}
