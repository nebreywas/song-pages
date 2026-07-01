import { useEffect, useRef, useState, type FC, type RefObject } from 'react';

import type { VisualizerFrameProps } from './types';

type UseVisualizerFrameLoopOptions = {
  analyser: AnalyserNode | null;
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  enabled: boolean;
};

/** Poll analyser each animation frame for embedded visualizers. */
export function useVisualizerFrameLoop({
  analyser,
  frequencyData,
  timeDomainData,
  enabled,
}: UseVisualizerFrameLoopOptions): number {
  const [frame, setFrame] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !analyser) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = () => {
      analyser.getByteFrequencyData(frequencyData as Uint8Array<ArrayBuffer>);
      analyser.getByteTimeDomainData(timeDomainData as Uint8Array<ArrayBuffer>);
      setFrame((value) => value + 1);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, enabled, frequencyData, timeDomainData]);

  return frame;
}

/** Track container size for canvas visualizers. */
export function useVisualizerSize(containerRef: RefObject<HTMLElement | null>): {
  width: number;
  height: number;
} {
  const [size, setSize] = useState({ width: 320, height: 200 });

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({
        width: Math.max(1, Math.floor(entry.contentRect.width)),
        height: Math.max(1, Math.floor(entry.contentRect.height)),
      });
    });

    observer.observe(node);
    setSize({
      width: Math.max(1, node.clientWidth),
      height: Math.max(1, node.clientHeight),
    });

    return () => observer.disconnect();
  }, [containerRef]);

  return size;
}

export type VisualizerRenderProps = Omit<VisualizerFrameProps, 'width' | 'height'> & {
  containerRef: RefObject<HTMLDivElement | null>;
};

/** Size-aware wrapper for a visualizer plugin component. */
export function VisualizerCanvasHost({
  containerRef,
  component: Component,
  ...props
}: VisualizerRenderProps & { component: FC<VisualizerFrameProps> }) {
  const { width, height } = useVisualizerSize(containerRef);
  return <Component {...props} width={width} height={height} />;
}
