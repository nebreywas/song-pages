import { useEffect } from 'react';
import { APP_THEME_OPTIONS, type AppThemeId } from '../lib/themes';

type SettingsModalProps = {
  open: boolean;
  theme: AppThemeId;
  onThemeChange: (themeId: AppThemeId) => void;
  onClose: () => void;
};

/** Simple app settings — theme picker for now. */
export function SettingsModal({ open, theme, onThemeChange, onClose }: SettingsModalProps) {
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
        className="settings-modal panel"
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
      </div>
    </div>
  );
}
