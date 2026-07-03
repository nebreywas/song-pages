import { useMemo } from 'react';

import { DEFAULT_VISUALIZER_ID } from '@shared/visualizerMessages';

import { SongPageWebview } from '../listener/SongPageWebview';
import { defaultVisualizerForSurface, getVisualizer, visualizerSupportsSurface } from '../visualizers/registry';
import { VisualizerPluginHost } from '../visualizers/VisualizerPluginHost';
import { useVisualizerIpcStream } from '../visualizers/useVisualizerStream';

/** Projection window — song page webview or FFT visualizer streamed from the main window. */
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
        <p>Connected — waiting for playback…</p>
        <p className="visualizer-window-hint">Start playback in the main window.</p>
      </div>
    );
  }

  if (stream.projectionMode === 'page') {
    if (!stream.pageUrl) {
      return (
        <div className="visualizer-window-shell visualizer-window-waiting">
          <p>No song page loaded</p>
          <p className="visualizer-window-hint">Select a song in the main window, then open projection.</p>
        </div>
      );
    }

    return (
      <div className="visualizer-window-shell visualizer-window-page">
        <SongPageWebview url={stream.pageUrl} />
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
        canvasFrame={stream.canvasFrame}
      />
    </div>
  );
}
