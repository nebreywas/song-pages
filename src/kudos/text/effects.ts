import { segmentGraphemes } from '@shared/kudos';

export type TextEchoLayer = {
  offsetX: number;
  offsetY: number;
  opacity: number;
};

export type TextEffectFrame = {
  visibleText: string;
  transform: string;
  opacity: number;
  echoLayers: TextEchoLayer[];
};

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

/** Compute per-frame text draw state for Phase A text effects (§9.1–9.4). */
export function computeTextEffectFrame(effectId: string, value: string, lifeT: number): TextEffectFrame {
  const introT = Math.min(1, lifeT / 0.42);
  const graphemes = segmentGraphemes(value);

  switch (effectId) {
    case 'balloon': {
      const scale = 0.2 + easeOutBack(introT) * 0.85;
      return {
        visibleText: value,
        transform: `scale(${scale})`,
        opacity: Math.min(1, introT * 1.4),
        echoLayers: [],
      };
    }
    case 'echo': {
      const fadeIn = easeOutCubic(introT);
      return {
        visibleText: value,
        transform: 'scale(1)',
        opacity: fadeIn,
        echoLayers: [
          { offsetX: 10, offsetY: 10, opacity: 0.18 * fadeIn },
          { offsetX: 5, offsetY: 5, opacity: 0.32 * fadeIn },
        ],
      };
    }
    case 'type': {
      const count = Math.max(introT > 0 ? 1 : 0, Math.ceil(graphemes.length * easeOutCubic(introT)));
      return {
        visibleText: graphemes.slice(0, count).join(''),
        transform: 'scale(1)',
        opacity: 1,
        echoLayers: [],
      };
    }
    case 'slam':
    default: {
      const scale = 2.4 - easeOutCubic(introT) * 1.4;
      const y = (1 - easeOutCubic(introT)) * -48;
      return {
        visibleText: value,
        transform: `translateY(${y}px) scale(${scale})`,
        opacity: Math.min(1, introT * 1.8),
        echoLayers: [],
      };
    }
  }
}
