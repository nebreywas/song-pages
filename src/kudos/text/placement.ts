import type { KudoTextPlacement } from '@shared/kudos';

export type TextPlacementPoint = {
  left: string;
  top: string;
  translate: string;
  textAlign: 'left' | 'center' | 'right';
};

/** Map host placement to CSS position for the VC overlay. */
export function resolveTextPlacement(
  placement: KudoTextPlacement,
  effectId: string,
): TextPlacementPoint {
  const resolved = placement === 'auto' ? defaultPlacementForEffect(effectId) : placement;

  switch (resolved) {
    case 'top':
      return { left: '50%', top: '16%', translate: '-50%, 0', textAlign: 'center' };
    case 'bottom':
      return { left: '50%', top: '84%', translate: '-50%, -100%', textAlign: 'center' };
    case 'left':
      return { left: '10%', top: '50%', translate: '0, -50%', textAlign: 'left' };
    case 'right':
      return { left: '90%', top: '50%', translate: '-100%, -50%', textAlign: 'right' };
    case 'center':
    default:
      return { left: '50%', top: '50%', translate: '-50%, -50%', textAlign: 'center' };
  }
}

function defaultPlacementForEffect(effectId: string): KudoTextPlacement {
  if (effectId === 'drop') return 'top';
  return 'center';
}
