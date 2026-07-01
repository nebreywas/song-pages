import { useRef } from 'react';

import type { VisualizerSongInfo } from '@shared/visualizerMessages';

import { getVisualizer } from './registry';
import type { VisualizerSurface } from './types';
import { useVisualizerFrameLoop, VisualizerCanvasHost } from './useVisualizerFrameLoop';

type EmbeddedVisualizerHostProps = {
  pluginId: string;
  analyser: AnalyserNode | null;
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  song: VisualizerSongInfo | null;
};

/** Renders the active plugin inside the listener content panel. */
export function EmbeddedVisualizerHost({
  pluginId,
  analyser,
  frequencyData,
  timeDomainData,
  isPlaying,
  currentTime,
  duration,
  song,
}: EmbeddedVisualizerHostProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plugin = getVisualizer(pluginId);
  const surface: VisualizerSurface = 'embedded';

  const frame = useVisualizerFrameLoop({
    analyser,
    frequencyData,
    timeDomainData,
    enabled: Boolean(analyser),
  });

  if (!plugin) {
    return (
      <div className="visualizer-host visualizer-host-empty">
        <p>Unknown visualizer.</p>
      </div>
    );
  }

  const Component = plugin.component;

  return (
    <div ref={containerRef} className="visualizer-host">
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
      <div className="visualizer-host-caption">
        <strong>{plugin.name}</strong>
        <span>{surface === 'embedded' ? 'Panel mode' : ''}</span>
      </div>
    </div>
  );
}
