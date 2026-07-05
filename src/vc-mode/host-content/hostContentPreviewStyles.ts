/**
 * React CSSProperties adapter for shared Host Content typography.
 */

import type { CSSProperties } from 'react';

import { hostTextCssStyle, type HostFontSizeId, type HostFontStyleId } from '@shared/hostContent';

export function hostTextPreviewStyle(
  fontStyle: HostFontStyleId,
  fontSize: HostFontSizeId,
  color: string,
): CSSProperties {
  const style = hostTextCssStyle(fontStyle, fontSize, color);
  return {
    color: style.color,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontStretch: style.fontStretch,
    lineHeight: style.lineHeight,
  };
}
