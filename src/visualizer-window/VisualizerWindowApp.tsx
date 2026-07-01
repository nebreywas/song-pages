import { useMemo } from 'react';

import { DEFAULT_VISUALIZER_ID } from '@shared/visualizerMessages';

import { defaultVisualizerForSurface, getVisualizer, visualizerSupportsSurface } from '../visualizers/registry';
import { VisualizerPluginHost } from '../visualizers/VisualizerPluginHost';
import { useVisualizerIpcStream } from '../visualizers/useVisualizerStream';

/** Projection window — display-only; FFT arrives via IPC from the main window. */
export function VisualizerWindowApp() {
  const { stream, connected } = useVisualizerIpcStream();

  const pluginId = useMemo(() => {
    if (!stream) return DEFAULT_VISUALIZER_ID;
    const plugin = getVisualizer(stream.pluginId);
    if (plugin && visualizerSupportsSurface(plugin, 'window')) {
      return stream.pluginId;
    }
    return defaultVisualizerForSurface('window').id;
  }, [stream]);

  if (!connected) {
    return (
      <div className="visualizer-window-shell visualizer-window-waiting">
        <p>Connecting to Song Pages…</p>
        <p className="visualizer-window-hint">Play a song in the main window, then open projection.</p>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="visualizer-window-shell visualizer-window-waiting">
        <p>Connected — waiting for audio…</p>
        <p className="visualizer-window-hint">Start playback in the main window.</p>
      </div>
    );
  }

  return (
    <div className="visualizer-window-shell">
      <VisualizerPluginHost
        surface="window"
        pluginId={pluginId}
        analyser={null}
        frequencyData={stream.frequencyData}
        timeDomainData={stream.timeDomainData}
        isPlaying={stream.isPlaying}
        currentTime={stream.currentTime}
        duration={stream.duration}
        song={stream.song}
        frame={stream.frame}
      />
    </div>
  );
}
