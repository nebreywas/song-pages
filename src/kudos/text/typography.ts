import type { CSSProperties } from 'react';

import type { KudoTextOutline, KudoTextShadow } from '@shared/kudos';
import {
  HOST_FONT_FAMILY,
  HOST_FONT_STRETCH,
  HOST_FONT_WEIGHT,
  type HostFontStyleId,
} from '@shared/hostContent/typography';

export function kudoTextTypography(
  fontId: HostFontStyleId,
  fontSizePx: number,
  textColor: string,
  outline: KudoTextOutline,
  shadow: KudoTextShadow,
): CSSProperties {
  const style: CSSProperties = {
    color: textColor,
    fontFamily: HOST_FONT_FAMILY[fontId],
    fontSize: `${fontSizePx}px`,
    fontWeight: HOST_FONT_WEIGHT[fontId] ?? 700,
    fontStretch: HOST_FONT_STRETCH[fontId],
    lineHeight: 1.05,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  };

  const shadows: string[] = [];
  if (outline === 'light') {
    style.WebkitTextStroke = '1px rgba(0,0,0,0.85)';
  } else if (outline === 'heavy') {
    style.WebkitTextStroke = '2px #000000';
    shadows.push('0 0 12px rgba(0,0,0,0.45)');
  }

  if (shadow === 'soft') {
    shadows.push('0 8px 28px rgba(0,0,0,0.55)');
  } else if (shadow === 'hard') {
    shadows.push('4px 4px 0 rgba(0,0,0,0.9)');
  }

  if (shadows.length > 0) {
    style.textShadow = shadows.join(', ');
  }

  return style;
}
