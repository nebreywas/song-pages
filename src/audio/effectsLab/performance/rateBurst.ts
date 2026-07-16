/**
 * Time-limited speed+pitch bursts (coupled playbackRate) with shaped easings.
 * Independent of the Web Audio performance filter/reverb insert.
 */
import {
  applyElementPlaybackRateMany,
  clampPlaybackRateHold,
  easePlaybackRate,
  lerpPlaybackRate,
  PLAYBACK_RATE_HOLD_DEFAULT,
  type PlaybackRateEasing,
} from '../playbackRate';
import type { PerformanceEffectId } from './types';

export type RateBurstKind = 'dive' | 'climb';

type RateBurstPlan = {
  peakRate: number;
  attackMs: number;
  sustainMs: number;
  releaseMs: number;
  attackEasing: PlaybackRateEasing;
  releaseEasing: PlaybackRateEasing;
};

const RATE_BURST_PLANS: Record<RateBurstKind, RateBurstPlan> = {
  // Vinyl-ish slowdown: ease into the dive, linger, ease back.
  dive: {
    peakRate: 0.72,
    attackMs: 450,
    sustainMs: 900,
    releaseMs: 1400,
    attackEasing: 'ease-in-out',
    releaseEasing: 'ease-out',
  },
  // Chipmunk lift: snap up a bit faster, settle home.
  climb: {
    peakRate: 1.28,
    attackMs: 350,
    sustainMs: 700,
    releaseMs: 1200,
    attackEasing: 'ease-out',
    releaseEasing: 'ease-in-out',
  },
};

let burstRaf = 0;
let burstActive = false;
let burstRestoreRate = PLAYBACK_RATE_HOLD_DEFAULT;
let burstTargets: HTMLMediaElement[] = [];

export function isPlaybackRateBurstActive(): boolean {
  return burstActive;
}

export function rateBurstKindFromEffectId(effectId: PerformanceEffectId): RateBurstKind | null {
  if (effectId === 'rate-dive') return 'dive';
  if (effectId === 'rate-climb') return 'climb';
  return null;
}

export function rateBurstTotalMs(kind: RateBurstKind): number {
  const plan = RATE_BURST_PLANS[kind];
  return plan.attackMs + plan.sustainMs + plan.releaseMs;
}

function stopBurstRaf(): void {
  if (burstRaf) {
    cancelAnimationFrame(burstRaf);
    burstRaf = 0;
  }
}

/** Cancel an in-flight burst and restore the hold rate on all target elements. */
export function cancelPlaybackRateBurst(restoreRate = burstRestoreRate): void {
  stopBurstRaf();
  burstActive = false;
  applyElementPlaybackRateMany(burstTargets, restoreRate);
  burstTargets = [];
  burstRestoreRate = PLAYBACK_RATE_HOLD_DEFAULT;
}

/**
 * Animate playbackRate on the given elements: current → peak → restore.
 * overlapping starts cancel the previous burst.
 */
export function runPlaybackRateBurst(options: {
  audios: HTMLMediaElement[];
  kind: RateBurstKind;
  /** Steady hold to land on when the burst ends (defaults to 1). */
  restoreRate?: number;
}): boolean {
  const audios = options.audios.filter(Boolean);
  if (audios.length === 0) return false;

  const plan = RATE_BURST_PLANS[options.kind];
  const restoreRate = clampPlaybackRateHold(options.restoreRate ?? PLAYBACK_RATE_HOLD_DEFAULT);
  const startRate = clampPlaybackRateHold(audios[0]!.playbackRate || restoreRate);
  const peakRate = clampPlaybackRateHold(plan.peakRate);

  cancelPlaybackRateBurst(restoreRate);
  burstTargets = audios;
  burstRestoreRate = restoreRate;
  burstActive = true;

  const startedAt = performance.now();
  const attackEnd = plan.attackMs;
  const sustainEnd = attackEnd + plan.sustainMs;
  const total = sustainEnd + plan.releaseMs;

  const tick = (now: number) => {
    const elapsed = now - startedAt;
    let rate = restoreRate;

    if (elapsed < attackEnd) {
      const t = easePlaybackRate(elapsed / plan.attackMs, plan.attackEasing);
      rate = lerpPlaybackRate(startRate, peakRate, t);
    } else if (elapsed < sustainEnd) {
      rate = peakRate;
    } else if (elapsed < total) {
      const t = easePlaybackRate((elapsed - sustainEnd) / plan.releaseMs, plan.releaseEasing);
      rate = lerpPlaybackRate(peakRate, restoreRate, t);
    } else {
      applyElementPlaybackRateMany(burstTargets, restoreRate);
      burstActive = false;
      burstRaf = 0;
      burstTargets = [];
      return;
    }

    applyElementPlaybackRateMany(burstTargets, rate);
    burstRaf = requestAnimationFrame(tick);
  };

  burstRaf = requestAnimationFrame(tick);
  return true;
}
