/**
 * Render a lyric line with optional agnostic effect presentation
 * (pulse spans, scrambled display text, clarity filters).
 */

import type { CSSProperties, ReactNode } from 'react';

import { splitLyricUnits, type LyricLinePresentation } from '@shared/lyricEffects';

/** Shared pulse chrome — used by plain ALARE and Pretty token spans. */
export function pulseStyle(intensity: number): CSSProperties {
  const t = Math.max(0, Math.min(1, intensity));
  // Scale + glow only — no translateY (that looked like sparks drifting off the line).
  return {
    display: 'inline-block',
    transform: `scale(${(1 + t * 0.14).toFixed(3)})`,
    textShadow: t > 0.05 ? `0 0 ${(8 + t * 14).toFixed(1)}px currentColor` : undefined,
    filter: t > 0.2 ? `brightness(${(1 + t * 0.3).toFixed(3)})` : undefined,
  };
}

/** Max pulse intensity per word index for a line presentation. */
export function pulseIntensityByWord(
  fx: LyricLinePresentation | undefined,
): Map<number, number> {
  const byWord = new Map<number, number>();
  if (!fx?.pulses) return byWord;
  for (const pulse of fx.pulses) {
    if (pulse.kind !== 'word') continue;
    const prev = byWord.get(pulse.unitIndex) ?? 0;
    if (pulse.intensity > prev) byWord.set(pulse.unitIndex, pulse.intensity);
  }
  return byWord;
}

/** Map ALARE opacity × effect opacityMul; stack filters without inventing meaning. */
export function composeLineStyle(
  baseOpacity: number,
  fx: LyricLinePresentation | undefined,
): CSSProperties {
  const opacityMul = fx?.opacityMul ?? 1;
  // Active pulses must stay readable on fade-stack edges (top/bottom) — otherwise
  // only near-center lines look "alive" and pulsing appears to settle mid/bottom.
  const hasPulse = (fx?.pulses?.length ?? 0) > 0;
  const opacityFloor = hasPulse ? 0.92 : 0;
  return {
    opacity: Math.max(opacityFloor, Math.max(0, Math.min(1, baseOpacity * opacityMul))),
    filter: fx?.filter,
    transform: fx?.transform,
  };
}

export function renderLyricEffectText(
  sourceText: string,
  fx: LyricLinePresentation | undefined,
): ReactNode {
  const text = fx?.displayText ?? sourceText;
  const byWord = pulseIntensityByWord(fx);
  if (byWord.size === 0) return text;

  const units = splitLyricUnits(text);
  return units.map((unit, i) => {
    if (!unit.isWord) return <span key={`s-${i}`}>{unit.text}</span>;
    const intensity = byWord.get(unit.wordIndex);
    if (intensity == null || intensity <= 0) {
      return <span key={`w-${unit.wordIndex}`}>{unit.text}</span>;
    }
    const pulse = pulseStyle(intensity);
    return (
      <span
        key={`w-${unit.wordIndex}`}
        className="vc-lyric-fx-pulse"
        style={{
          ...pulse,
          opacity: 0.72 + Math.min(1, intensity) * 0.28,
          fontWeight: intensity > 0.45 ? 600 : undefined,
        }}
      >
        {unit.text}
      </span>
    );
  });
}
