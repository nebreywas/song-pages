import type {
  ListenerLyricsDisplaySettings,
  ListenerLyricsViewMode,
} from '@shared/listener/lyricsDisplaySettings';

type LyricsSettingsPopoverProps = {
  anchor: { x: number; y: number };
  settings: ListenerLyricsDisplaySettings;
  onRemoveBracketsChange: (value: boolean) => void;
  onViewModeChange: (value: ListenerLyricsViewMode) => void;
  onClose: () => void;
};

const VIEW_MODE_OPTIONS: { value: ListenerLyricsViewMode; label: string }[] = [
  { value: 'plain', label: 'Plain text' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'pretty', label: 'Pretty Lyrics' },
];

/** Contextual lyrics display options — anchored near the Lyrics heading. */
export function LyricsSettingsPopover({
  anchor,
  settings,
  onRemoveBracketsChange,
  onViewModeChange,
  onClose,
}: LyricsSettingsPopoverProps) {
  return (
    <>
      <button type="button" className="playlist-context-backdrop" aria-label="Dismiss lyrics settings" onClick={onClose} />
      <div
        className="lyrics-settings-popover panel"
        style={{ top: anchor.y, left: anchor.x }}
        role="dialog"
        aria-label="Lyrics display settings"
        onContextMenu={(event) => event.preventDefault()}
      >
        <p className="lyrics-settings-popover-title">Lyrics</p>
        <label className="lyrics-settings-toggle">
          <input
            type="checkbox"
            checked={settings.removeBrackets}
            onChange={(event) => onRemoveBracketsChange(event.target.checked)}
          />
          <span>Remove brackets</span>
        </label>

        <fieldset className="lyrics-settings-view-fieldset">
          <legend className="lyrics-settings-view-legend">View</legend>
          <div className="lyrics-settings-view-group" role="radiogroup" aria-label="Lyrics view">
            {VIEW_MODE_OPTIONS.map((option) => (
              <label key={option.value} className="lyrics-settings-toggle">
                <input
                  type="radio"
                  name="listener-lyrics-view-mode"
                  value={option.value}
                  checked={settings.viewMode === option.value}
                  onChange={() => onViewModeChange(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </>
  );
}
