import { Suspense, lazy, useEffect, useState } from 'react';
import {
  MAX_CAUTION_MINUTES,
  MIN_CAUTION_MINUTES,
  type PlaylistLengthSettings,
} from '@shared/listener/playlistLengthSettings';
import { APP_THEME_OPTIONS, type AppThemeId } from '../lib/themes';
import './settingsModal.css';

const KeyBindingsPanel = lazy(() =>
  import('../commands/KeyBindingsPanel').then((module) => ({ default: module.KeyBindingsPanel })),
);

type SettingsTab = 'main' | 'theme' | 'keybindings';

type SettingsModalProps = {
  open: boolean;
  theme: AppThemeId;
  onThemeChange: (themeId: AppThemeId) => void;
  playlistLengthSettings: PlaylistLengthSettings;
  onPlaylistLengthSettingsChange: (settings: PlaylistLengthSettings) => void;
  onClose: () => void;
};

/** App settings — main, theme, and key bindings tabs. */
export function SettingsModal({
  open,
  theme,
  onThemeChange,
  playlistLengthSettings,
  onPlaylistLengthSettingsChange,
  onClose,
}: SettingsModalProps) {
  const [tab, setTab] = useState<SettingsTab>('main');

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
            className={`settings-tab${tab === 'main' ? ' is-active' : ''}`}
            onClick={() => setTab('main')}
          >
            Main
          </button>
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

        {tab === 'main' ? (
          <section className="settings-section">
            <h3>Playlists</h3>
            <div className="settings-checkbox-row">
              <label className="settings-checkbox-label">
                <input
                  type="checkbox"
                  checked={playlistLengthSettings.cautionLongSongsEnabled}
                  onChange={(event) =>
                    onPlaylistLengthSettingsChange({
                      ...playlistLengthSettings,
                      cautionLongSongsEnabled: event.target.checked,
                    })
                  }
                />
                <span>
                  Caution flag songs longer than{' '}
                  <input
                    type="number"
                    className="settings-minutes-input"
                    min={MIN_CAUTION_MINUTES}
                    max={MAX_CAUTION_MINUTES}
                    step={1}
                    value={playlistLengthSettings.cautionMinutes}
                    disabled={!playlistLengthSettings.cautionLongSongsEnabled}
                    onChange={(event) =>
                      onPlaylistLengthSettingsChange({
                        ...playlistLengthSettings,
                        cautionMinutes: Number.parseInt(event.target.value, 10),
                      })
                    }
                  />{' '}
                  minutes
                </span>
              </label>
            </div>
            <p className="settings-hint">
              Flagged rows stay playable but get a brighter highlight and a yellow length badge so you can
              spot long tracks before they start — useful for VC sessions and party playlists.
            </p>
          </section>
        ) : null}

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
        ) : null}

        {tab === 'keybindings' ? (
          <section className="settings-section">
            <Suspense fallback={<p className="keybindings-loading">Loading key bindings…</p>}>
              <KeyBindingsPanel />
            </Suspense>
          </section>
        ) : null}
      </div>
    </div>
  );
}
