import type { ListenerLyricsDisplaySettings } from '@shared/listener/lyricsDisplaySettings';

type LyricsSettingsPopoverProps = {
  anchor: { x: number; y: number };
  settings: ListenerLyricsDisplaySettings;
  onRemoveBracketsChange: (value: boolean) => void;
  onClose: () => void;
};

/** Contextual lyrics display options — anchored near the Lyrics heading. */
export function LyricsSettingsPopover({
  anchor,
  settings,
  onRemoveBracketsChange,
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
      </div>
    </>
  );
};
