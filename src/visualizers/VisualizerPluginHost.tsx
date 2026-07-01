import { useEffect, useRef } from 'react';

import { getVisualizer, visualizerSupportsSurface } from './registry';
import type { VisualizerFrameProps, VisualizerSurface } from './types';
import { useVisualizerFrameLoop, VisualizerCanvasHost } from './useVisualizerFrameLoop';

type VisualizerPluginHostProps = Omit<VisualizerFrameProps, 'width' | 'height'> & {
  surface: VisualizerSurface;
  pluginId: string;
};

/** Shared host for embedded or window surfaces. */
export function VisualizerPluginHost({
  surface,
  pluginId,
  analyser,
  frequencyData,
  timeDomainData,
  isPlaying,
  currentTime,
  duration,
  song,
  frame: externalFrame,
}: VisualizerPluginHostProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plugin = getVisualizer(pluginId);

  const internalFrame = useVisualizerFrameLoop({
    analyser,
    frequencyData,
    timeDomainData,
    enabled: Boolean(analyser),
  });
  const frame = analyser ? internalFrame : externalFrame;

  useEffect(() => {
    if (!plugin) return;
    if (!visualizerSupportsSurface(plugin, surface)) {
      // Window may receive an embedded-only id briefly during switch — parent should reconcile.
    }
  }, [plugin, surface]);

  if (!plugin) {
    return (
      <div className="visualizer-host visualizer-host-empty">
        <p>Unknown visualizer: {pluginId}</p>
      </div>
    );
  }

  if (!visualizerSupportsSurface(plugin, surface)) {
    return (
      <div className="visualizer-host visualizer-host-empty">
        <p>{plugin.name} is not available in this surface.</p>
      </div>
    );
  }

  const Component = surface === 'window' ? (plugin.windowComponent ?? plugin.component) : plugin.component;

  return (
    <div ref={containerRef} className="visualizer-host visualizer-host-window">
      <VisualizerCanvasHost
        containerRef={containerRef}
        component={Component}
        analyser={analyser}
        frequencyData={frequencyData}
        timeDomainData={timeDomainData}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        song={song}
        frame={frame}
      />
    </div>
  );
}
