import {
  defaultVisualizerForSurface,
  getVisualizer,
  listVisualizers,
  visualizerSupportsSurface,
} from './registry';

type VisualizerControlsProps = {
  embeddedActive: boolean;
  activePluginId: string;
  windowOpen: boolean;
  windowFullscreen: boolean;
  canVisualize: boolean;
  vcModeActive?: boolean;
  onToggleEmbedded: () => void;
  onSelectPlugin: (pluginId: string) => void;
  onOpenWindow: () => void;
  onCloseWindow: () => void;
  onToggleFullscreen: () => void;
};

/** Toolbar for embedded toggle, plugin picker, and projection window controls. */
export function VisualizerControls({
  embeddedActive,
  activePluginId,
  windowOpen,
  windowFullscreen,
  canVisualize,
  vcModeActive,
  onToggleEmbedded,
  onSelectPlugin,
  onOpenWindow,
  onCloseWindow,
  onToggleFullscreen,
}: VisualizerControlsProps) {
  const activePlugin = getVisualizer(activePluginId);

  const embeddedOptions = listVisualizers().filter((plugin) =>
    visualizerSupportsSurface(plugin, 'embedded'),
  );
  const windowOptions = listVisualizers().filter((plugin) => visualizerSupportsSurface(plugin, 'window'));

  const handleEmbeddedPluginChange = (pluginId: string) => {
    const plugin = getVisualizer(pluginId);
    if (plugin && visualizerSupportsSurface(plugin, 'embedded')) {
      onSelectPlugin(pluginId);
    }
  };

  const handleWindowPluginChange = (pluginId: string) => {
    const plugin = getVisualizer(pluginId);
    if (plugin && visualizerSupportsSurface(plugin, 'window')) {
      onSelectPlugin(pluginId);
    }
  };

  const openWindowWithDefault = () => {
    if (!activePlugin || !visualizerSupportsSurface(activePlugin, 'window')) {
      onSelectPlugin(defaultVisualizerForSurface('window').id);
    }
    onOpenWindow();
  };

  return (
    <div className="visualizer-controls">
      {vcModeActive ? (
        <p className="visualizer-controls-hint">Visualizer controls disabled while VC Mode is live.</p>
      ) : (
        <>
      <div className="visualizer-controls-group">
        <button
          type="button"
          className={`btn visualizer-toggle${embeddedActive ? ' active' : ''}`}
          disabled={!canVisualize || windowOpen}
          onClick={onToggleEmbedded}
          title={
            windowOpen
              ? 'Close projection to use panel visualizer'
              : embeddedActive
                ? 'Show song page / artist info'
                : 'Show panel visualizer'
          }
        >
          {embeddedActive ? 'Page' : 'Visualizer'}
        </button>

        {embeddedActive ? (
          <label className="visualizer-select-wrap">
            <span className="sr-only">Panel visualizer</span>
            <select
              value={
                activePlugin && visualizerSupportsSurface(activePlugin, 'embedded')
                  ? activePluginId
                  : defaultVisualizerForSurface('embedded').id
              }
              onChange={(event) => handleEmbeddedPluginChange(event.target.value)}
            >
              {embeddedOptions.map((plugin) => (
                <option key={plugin.id} value={plugin.id}>
                  {plugin.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="visualizer-controls-group">
        {!windowOpen ? (
          <button
            type="button"
            className="btn"
            disabled={!canVisualize}
            onClick={openWindowWithDefault}
            title="Open projection window"
          >
            Open projection
          </button>
        ) : (
          <>
            <label className="visualizer-select-wrap">
              <span className="sr-only">Projection visualizer</span>
              <select
                value={
                  activePlugin && visualizerSupportsSurface(activePlugin, 'window')
                    ? activePluginId
                    : defaultVisualizerForSurface('window').id
                }
                onChange={(event) => handleWindowPluginChange(event.target.value)}
              >
                {windowOptions.map((plugin) => (
                  <option key={plugin.id} value={plugin.id}>
                    {plugin.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn" onClick={onToggleFullscreen}>
              {windowFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            </button>
            <button type="button" className="btn" onClick={onCloseWindow}>
              Close projection
            </button>
          </>
        )}
      </div>

      <p className="visualizer-controls-hint">
        Panel or projection — one at a time.
        {windowOpen ? ' Projection active.' : embeddedActive ? ' Panel visualizer active.' : ''}
      </p>
        </>
      )}
    </div>
  );
}
