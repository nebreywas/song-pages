import { useEffect, useMemo, useState } from 'react';

import { resolveExperienceCredits, getExperienceCreditTitle } from '../../credits/resolveCredits';
import { listExperiences, getExperience } from '../../core/registry/catalog';
import { defaultSettingsFromSchema } from '../../core/settings/schema/defaults';
import type { VisualizerSettingsValues } from '../../core/settings/schema/types';
import { loadExperienceSettings, saveExperienceSettings } from '../persistence/store';
import { SettingsFieldRenderer } from './SettingsFieldRenderer';

type VisualizerSettingsDialogProps = {
  open: boolean;
  selectedExperienceId: string;
  canLaunch: boolean;
  onSelectExperience: (experienceId: string) => void;
  onClose: () => void;
  onLaunch: () => void;
};

/** Schema-driven visualizer picker + settings — long-press opens without toggling activation. */
export function VisualizerSettingsDialog({
  open,
  selectedExperienceId,
  canLaunch,
  onSelectExperience,
  onClose,
  onLaunch,
}: VisualizerSettingsDialogProps) {
  const experiences = listExperiences();
  const activeExperience = getExperience(selectedExperienceId) ?? experiences[0];
  const [values, setValues] = useState<VisualizerSettingsValues>({});
  const [showCredits, setShowCredits] = useState(false);
  const [busy, setBusy] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState('');

  const filteredExperiences = useMemo(() => {
    const query = catalogFilter.trim().toLowerCase();
    if (!query) return experiences;
    return experiences.filter(
      (experience) =>
        experience.name.toLowerCase().includes(query) ||
        experience.description.toLowerCase().includes(query) ||
        experience.id.toLowerCase().includes(query),
    );
  }, [catalogFilter, experiences]);

  useEffect(() => {
    if (!open) {
      setCatalogFilter('');
    }
  }, [open]);

  useEffect(() => {
    if (!open || !activeExperience) return;

    setShowCredits(false);
    setBusy(true);
    void loadExperienceSettings(activeExperience.id, activeExperience.settings).then((loaded) => {
      setValues(loaded);
      setBusy(false);
    });
  }, [activeExperience, open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      // Field changes already autosave — dismiss without a second flush.
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (!open || !activeExperience) return null;

  const handleFieldChange = (key: string, value: boolean | number | string) => {
    setValues((current) => {
      const next = { ...current, [key]: value };
      // Persist immediately so toggles (esp. Meyda bass drive) survive song changes
      // without requiring an explicit Save click.
      void saveExperienceSettings(activeExperience.id, activeExperience.settings, next);
      return next;
    });
  };

  const handleSave = async () => {
    await saveExperienceSettings(activeExperience.id, activeExperience.settings, values);
    onClose();
  };

  const handleLaunch = async () => {
    await saveExperienceSettings(activeExperience.id, activeExperience.settings, values);
    onLaunch();
    onClose();
  };

  const handleClose = async () => {
    // Flush current dialog values on dismiss (backdrop / ×) so nothing is lost.
    await saveExperienceSettings(activeExperience.id, activeExperience.settings, values);
    onClose();
  };

  const handleReset = () => {
    const defaults = defaultSettingsFromSchema(activeExperience.settings);
    setValues(defaults);
    void saveExperienceSettings(activeExperience.id, activeExperience.settings, defaults);
  };

  const credits = resolveExperienceCredits(activeExperience.id);

  return (
    <div className="viz-settings-backdrop" role="presentation" onClick={() => void handleClose()}>
      <div
        className="viz-settings-modal panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="viz-settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="viz-settings-header">
          <h2 id="viz-settings-title">Visualizer Settings</h2>
          <button
            type="button"
            className="btn icon-btn"
            onClick={() => void handleClose()}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="viz-settings-body">
          <aside className="viz-settings-catalog" aria-label="Visualizer experiences">
            <div className="viz-settings-catalog-search">
              <input
                type="search"
                className="viz-settings-search-input"
                placeholder="Filter visualizers…"
                value={catalogFilter}
                onChange={(event) => setCatalogFilter(event.target.value)}
                aria-label="Filter visualizer list"
              />
              <p className="viz-settings-catalog-count">
                {filteredExperiences.length} of {experiences.length}
              </p>
            </div>
            <ul className="viz-settings-experience-list">
              {filteredExperiences.map((experience) => (
                <li key={experience.id}>
                  <button
                    type="button"
                    className={`viz-settings-experience-btn${
                      experience.id === activeExperience.id ? ' active' : ''
                    }`}
                    onClick={() => onSelectExperience(experience.id)}
                  >
                    <span className="viz-settings-experience-name">{experience.name}</span>
                    {experience.implementation !== 'butterchurn' ? (
                      <span className="viz-settings-experience-desc">{experience.description}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className="viz-settings-panel" aria-label="Experience settings">
            {showCredits ? (
              <div className="viz-settings-credits">
                <h3>Credits — {getExperienceCreditTitle(activeExperience.id)}</h3>
                {credits.length === 0 ? (
                  <p className="viz-settings-empty">Song Pages native visualizer — no third-party credits.</p>
                ) : (
                  <ul>
                    {credits.map((credit) => (
                      <li key={credit.id}>
                        <strong>{credit.name}</strong>
                        {credit.description ? <p>{credit.description}</p> : null}
                        {credit.license ? <p>License: {credit.license}</p> : null}
                        {credit.url ? (
                          <p>
                            <a href={credit.url} target="_blank" rel="noreferrer">
                              {credit.url}
                            </a>
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" className="btn" onClick={() => setShowCredits(false)}>
                  Back to settings
                </button>
              </div>
            ) : (
              <>
                <div className="viz-settings-fields">
                  {activeExperience.settings.length === 0 ? (
                    <p className="viz-settings-empty">This visualizer has no adjustable settings.</p>
                  ) : (
                    activeExperience.settings.map((field) => (
                      <SettingsFieldRenderer
                        key={field.key}
                        field={field}
                        value={values[field.key] ?? field.default}
                        onChange={handleFieldChange}
                      />
                    ))
                  )}
                </div>

                <div className="viz-settings-actions">
                  <button type="button" className="btn" onClick={() => setShowCredits(true)}>
                    Credits
                  </button>
                  <button type="button" className="btn" onClick={handleReset} disabled={busy}>
                    Reset to Defaults
                  </button>
                  <button type="button" className="btn" onClick={() => void handleSave()} disabled={busy}>
                    Save
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void handleLaunch()}
                    disabled={busy || !canLaunch}
                    title={canLaunch ? undefined : 'Play a song to launch the visualizer'}
                  >
                    Launch
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
