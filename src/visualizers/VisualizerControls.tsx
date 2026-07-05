import {
  defaultVisualizerForSurface,
  getVisualizer,
  listVisualizers,
  visualizerSupportsSurface,
} from './registry';

type VisualizerControlsProps = {
  embeddedActive: boolean;
  activeExperienceId: string;
  windowOpen: boolean;
  windowFullscreen: boolean;
  canVisualize: boolean;
  vcModeActive?: boolean;
  onToggleEmbedded: () => void;
  onSelectExperience: (experienceId: string) => void;
  onOpenWindow: () => void;
  onCloseWindow: () => void;
  onToggleFullscreen: () => void;
};

/** Toolbar for embedded toggle, experience picker, and projection window controls. */
export function VisualizerControls({
  embeddedActive,
  activeExperienceId,
  windowOpen,
  windowFullscreen,
  canVisualize,
  vcModeActive,
  onToggleEmbedded,
  onSelectExperience,
  onOpenWindow,
  onCloseWindow,
  onToggleFullscreen,
}: VisualizerControlsProps) {
  const activeExperience = getVisualizer(activeExperienceId);

  const embeddedOptions = listVisualizers().filter((experience) =>
    visualizerSupportsSurface(experience, 'embedded'),
  );
  const windowOptions = listVisualizers().filter((experience) =>
    visualizerSupportsSurface(experience, 'window'),
  );

  const handleEmbeddedExperienceChange = (experienceId: string) => {
    const experience = getVisualizer(experienceId);
    if (experience && visualizerSupportsSurface(experience, 'embedded')) {
      onSelectExperience(experienceId);
    }
  };

  const handleWindowExperienceChange = (experienceId: string) => {
    const experience = getVisualizer(experienceId);
    if (experience && visualizerSupportsSurface(experience, 'window')) {
      onSelectExperience(experienceId);
    }
  };

  const openWindowWithDefault = () => {
    if (!activeExperience || !visualizerSupportsSurface(activeExperience, 'window')) {
      onSelectExperience(defaultVisualizerForSurface('window').id);
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
                activeExperience && visualizerSupportsSurface(activeExperience, 'embedded')
                  ? activeExperienceId
                  : defaultVisualizerForSurface('embedded').id
              }
              onChange={(event) => handleEmbeddedExperienceChange(event.target.value)}
            >
              {embeddedOptions.map((experience) => (
                <option key={experience.id} value={experience.id}>
                  {experience.name}
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
                  activeExperience && visualizerSupportsSurface(activeExperience, 'window')
                    ? activeExperienceId
                    : defaultVisualizerForSurface('window').id
                }
                onChange={(event) => handleWindowExperienceChange(event.target.value)}
              >
                {windowOptions.map((experience) => (
                  <option key={experience.id} value={experience.id}>
                    {experience.name}
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
