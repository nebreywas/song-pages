import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

import type {
  EffectiveGraphicPresentation,
  EffectiveVideoPresentation,
  VcGraphicOverflow,
  VcMediaFitMode,
} from '@shared/vcMode/assignmentSettings';

type VcMediaPresentationProps = {
  kind: 'graphic' | 'video';
  src: string;
  alt?: string;
  presentation: EffectiveGraphicPresentation | EffectiveVideoPresentation;
  playback?: EffectiveVideoPresentation['playback'];
  className?: string;
};

function insetStyle(insetPct: number): CSSProperties {
  return { padding: `${insetPct}%` };
}

function overflowClass(overflow: VcGraphicOverflow | undefined): string {
  switch (overflow) {
    case 'scroll':
      return 'vc-media-overflow-scroll';
    case 'auto-scroll':
      return 'vc-media-overflow-auto-scroll';
    case 'bounce':
      return 'vc-media-overflow-bounce';
    default:
      return 'vc-media-overflow-static';
  }
}

function fitModeClass(fitMode: VcMediaFitMode): string {
  return `vc-media-fit-mode-${fitMode}`;
}

function fitStyle(
  fitMode: VcMediaFitMode,
  widthPx?: number,
  heightPx?: number,
): CSSProperties {
  switch (fitMode) {
    case 'stretch':
      // Filled via CSS — stretch must ignore intrinsic aspect ratio.
      return {};
    case 'max-x':
      return { width: '100%', height: 'auto', maxHeight: '100%', objectFit: 'contain' };
    case 'max-y':
      return { height: '100%', width: 'auto', maxWidth: '100%', objectFit: 'contain' };
    case 'original':
      return {
        width: widthPx ? `${widthPx}px` : 'auto',
        height: heightPx ? `${heightPx}px` : 'auto',
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
      };
    default:
      return { width: '100%', height: '100%', objectFit: 'contain' };
  }
}

function MediaShell({
  presentation,
  overflow,
  fitMode,
  children,
  className,
}: {
  presentation: EffectiveGraphicPresentation | EffectiveVideoPresentation;
  overflow?: VcGraphicOverflow;
  fitMode: VcMediaFitMode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`vc-media-shell ${fitModeClass(fitMode)} ${overflowClass(overflow)}${className ? ` ${className}` : ''}`}
      style={insetStyle(presentation.insetPct)}
    >
      <div className="vc-media-stage">{children}</div>
    </div>
  );
}

function VideoWithPlayback({
  src,
  presentation,
  fitMode,
  widthPx,
  heightPx,
}: {
  src: string;
  presentation: EffectiveVideoPresentation;
  fitMode: VcMediaFitMode;
  widthPx?: number;
  heightPx?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.loop = presentation.playback === 'loop';
    void video.play().catch(() => {});

    if (presentation.playback !== 'bounce') return;

    const onEnded = () => {
      const rate = video.playbackRate === 1 ? -1 : 1;
      video.playbackRate = rate;
      if (rate < 0) {
        video.currentTime = Math.max(0, video.duration - 0.05);
      }
      void video.play().catch(() => {});
    };

    video.addEventListener('ended', onEnded);
    return () => video.removeEventListener('ended', onEnded);
  }, [presentation.playback, src]);

  return (
    <video
      ref={videoRef}
      className="vc-host-video vc-media-fit"
      src={src}
      autoPlay
      muted
      playsInline
      loop={presentation.playback === 'loop'}
      style={fitStyle(fitMode, widthPx, heightPx)}
    />
  );
}

/** Inset + fit + overflow wrapper for host graphics and videos. */
export function VcMediaPresentation({
  kind,
  src,
  alt = '',
  presentation,
  className,
}: VcMediaPresentationProps) {
  const graphicPresentation =
    kind === 'graphic' ? (presentation as EffectiveGraphicPresentation) : undefined;
  const fitMode = presentation.fitMode;
  const widthPx = graphicPresentation?.widthPx;
  const heightPx = graphicPresentation?.heightPx;

  if (kind === 'video') {
    const videoPresentation = presentation as EffectiveVideoPresentation;
    return (
      <MediaShell presentation={presentation} fitMode={fitMode} className={className}>
        <VideoWithPlayback
          src={src}
          presentation={videoPresentation}
          fitMode={fitMode}
          widthPx={widthPx}
          heightPx={heightPx}
        />
      </MediaShell>
    );
  }

  return (
    <MediaShell
      presentation={presentation}
      fitMode={fitMode}
      overflow={graphicPresentation?.overflow}
      className={className}
    >
      <img
        className="vc-media-fit"
        src={src}
        alt={alt}
        style={fitStyle(fitMode, widthPx, heightPx)}
      />
    </MediaShell>
  );
}
