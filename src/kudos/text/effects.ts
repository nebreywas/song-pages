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
  /** Per-grapheme vertical offsets for Wave (Phase B). */
  graphemeOffsets?: number[];
};

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
}

/** Compute per-frame text draw state (spec §9 — Phase A + B). */
export function computeTextEffectFrame(effectId: string, value: string, lifeT: number): TextEffectFrame {
  const introT = Math.min(1, lifeT / 0.42);
  const graphemes = segmentGraphemes(value);

  switch (effectId) {
    case 'stamp': {
      const landT = easeOutCubic(introT);
      const scale = 2.2 - landT * 1.2;
      const rotate = (1 - landT) * -14;
      const y = (1 - landT) * -28;
      return {
        visibleText: value,
        transform: `translateY(${y}px) rotate(${rotate}deg) scale(${scale})`,
        opacity: Math.min(1, introT * 1.6),
        echoLayers: [],
      };
    }
    case 'flash': {
      const snapT = Math.min(1, lifeT / 0.08);
      const pulse =
        lifeT < 0.18 ? 1 : lifeT < 0.28 ? 0.35 + Math.sin((lifeT - 0.18) * 40) * 0.25 + 0.4 : 1;
      return {
        visibleText: value,
        transform: 'scale(1)',
        opacity: snapT * pulse,
        echoLayers: [],
      };
    }
    case 'bounce': {
      const dropT = easeOutBounce(introT);
      const y = (1 - dropT) * -140;
      return {
        visibleText: value,
        transform: `translateY(${y}px) scale(1)`,
        opacity: Math.min(1, introT * 1.4),
        echoLayers: [],
      };
    }
    case 'drop': {
      const fallT = easeOutCubic(introT);
      const y = (1 - fallT) * -120;
      return {
        visibleText: value,
        transform: `translateY(${y}px) scale(1)`,
        opacity: Math.min(1, introT * 1.5),
        echoLayers: [],
      };
    }
    case 'zoom': {
      const depthT = easeOutCubic(introT);
      const scale = 0.18 + depthT * 0.92;
      return {
        visibleText: value,
        transform: `scale(${scale})`,
        opacity: Math.min(1, introT * 1.3),
        echoLayers: [],
      };
    }
    case 'wave': {
      const waveAmp = 14 * Math.min(1, introT);
      const graphemeOffsets = graphemes.map((_, index) => {
        const phase = lifeT * Math.PI * 5 - index * 0.65;
        return Math.sin(phase) * waveAmp;
      });
      return {
        visibleText: value,
        transform: 'scale(1)',
        opacity: Math.min(1, introT * 1.2),
        echoLayers: [],
        graphemeOffsets,
      };
    }
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
