import { Suspense, lazy, useEffect, useState } from 'react';
import { APP_THEME_OPTIONS, type AppThemeId } from '../lib/themes';
import './settingsModal.css';

const KeyBindingsPanel = lazy(() =>
  import('../commands/KeyBindingsPanel').then((module) => ({ default: module.KeyBindingsPanel })),
);

type SettingsTab = 'theme' | 'keybindings';

type SettingsModalProps = {
  open: boolean;
  theme: AppThemeId;
  onThemeChange: (themeId: AppThemeId) => void;
  onClose: () => void;
};

/** App settings — theme + key bindings tabs. */
export function SettingsModal({ open, theme, onThemeChange, onClose }: SettingsModalProps) {
  const [tab, setTab] = useState<SettingsTab>('theme');

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="settings-backdrop" role="presentation" onClick={onClose}>
      <div
        className="settings-modal panel settings-modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="settings-header">
          <h2 id="settings-title">Settings</h2>
          <button type="button" className="btn settings-close" onClick={onClose} aria-label="Close settings">
            ×
          </button>
        </div>

        <nav className="settings-tabs" aria-label="Settings sections">
          <button
            type="button"
            className={`settings-tab${tab === 'theme' ? ' is-active' : ''}`}
            onClick={() => setTab('theme')}
          >
            Theme
          </button>
          <button
            type="button"
            className={`settings-tab${tab === 'keybindings' ? ' is-active' : ''}`}
            onClick={() => setTab('keybindings')}
          >
            Key Bindings & Controls
          </button>
        </nav>

        {tab === 'theme' ? (
          <section className="settings-section">
            <h3>Theme</h3>
            <div className="theme-grid" role="radiogroup" aria-label="App theme">
              {APP_THEME_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={theme === option.id}
                  className={`theme-option${theme === option.id ? ' active' : ''}`}
                  data-theme-preview={option.id}
                  onClick={() => onThemeChange(option.id)}
                >
                  <span className="theme-option-emoji" aria-hidden="true">
                    {option.emoji}
                  </span>
                  <span className="theme-option-label">{option.label}</span>
                  <span className="theme-option-desc">{option.description}</span>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="settings-section">
            <Suspense fallback={<p className="keybindings-loading">Loading key bindings…</p>}>
              <KeyBindingsPanel />
            </Suspense>
          </section>
        )}
      </div>
    </div>
  );
}
