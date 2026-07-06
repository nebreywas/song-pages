import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

import type { VcTitleOverflow, VcTextAlign } from '@shared/vcMode/assignmentSettings';

const SCROLL_PX_PER_SEC = 48;
const MARQUEE_GAP_PX = 48;

type VcTitleLineTextProps = {
  text: string;
  style: CSSProperties;
  overflow: VcTitleOverflow;
  textAlign?: VcTextAlign;
};

type TitleMetrics = {
  scrollDistance: number;
  textWidth: number;
  overflows: boolean;
};

/** Single-line title with optional horizontal overflow animation (host + song titles). */
export function VcTitleLineText({ text, style, overflow, textAlign = 'left' }: VcTitleLineTextProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [metrics, setMetrics] = useState<TitleMetrics>({
    scrollDistance: 0,
    textWidth: 0,
    overflows: false,
  });

  // Measure natural text width against the clip viewport — never against a width:100% visible span.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const measure = measureRef.current;
    if (!viewport || !measure) return;

    const update = () => {
      const containerWidth = viewport.clientWidth;
      const measuredWidth = measure.getBoundingClientRect().width;
      const distance = Math.max(0, Math.ceil(measuredWidth - containerWidth));
      setMetrics({
        scrollDistance: distance,
        textWidth: measuredWidth,
        overflows: distance > 0,
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [text, style.fontSize, style.fontFamily, style.fontWeight, style.fontStretch]);

  const { scrollDistance, textWidth, overflows } = metrics;
  const animate = overflows && overflow !== 'static';
  const mode: VcTitleOverflow = animate ? overflow : 'static';

  const modeClass =
    mode === 'scroll'
      ? 'vc-title-line-scroll'
      : mode === 'bounce'
        ? 'vc-title-line-bounce'
        : mode === 'auto-scroll'
          ? 'vc-title-line-restart'
          : `vc-title-line-static vc-title-line-align-${textAlign}`;

  const scrollDuration = Math.max(3, scrollDistance / SCROLL_PX_PER_SEC);
  const marqueeDuration = Math.max(
    4,
    (scrollDistance + MARQUEE_GAP_PX + textWidth) / SCROLL_PX_PER_SEC,
  );

  const cssVars = {
    '--vc-title-scroll-distance': `${-scrollDistance}px`,
    '--vc-title-scroll-duration': `${scrollDuration}s`,
    '--vc-title-marquee-duration': `${marqueeDuration}s`,
    '--vc-title-marquee-distance': `${-(textWidth + MARQUEE_GAP_PX)}px`,
    '--vc-title-marquee-gap': `${MARQUEE_GAP_PX}px`,
  } as CSSProperties;

  const rootClass = ['vc-title-line', modeClass].join(' ');

  return (
    <div className={rootClass} style={{ ...style, ...cssVars }}>
      <div ref={viewportRef} className="vc-title-line-viewport">
        {/* Hidden measurer — unconstrained width so overflow is detected reliably. */}
        <span ref={measureRef} className="vc-title-line-measure" aria-hidden="true">
          {text}
        </span>

        {mode === 'scroll' ? (
          <div className="vc-title-line-track">
            <span className="vc-title-line-text">{text}</span>
            <span className="vc-title-line-text vc-title-line-gap" aria-hidden="true">
              {text}
            </span>
          </div>
        ) : (
          <span
            key={animate ? `${mode}-${scrollDistance}` : 'static'}
            className="vc-title-line-text"
          >
            {text}
          </span>
        )}
      </div>
    </div>
  );
}
