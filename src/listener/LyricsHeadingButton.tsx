import { useCallback, useRef, useState } from 'react';

import type {
  ListenerLyricsDisplaySettings,
  ListenerLyricsViewMode,
} from '@shared/listener/lyricsDisplaySettings';

import { LyricsSettingsPopover } from './LyricsSettingsPopover';

type LyricsHeadingButtonProps = {
  settings: ListenerLyricsDisplaySettings;
  onRemoveBracketsChange: (value: boolean) => void;
  onViewModeChange: (value: ListenerLyricsViewMode) => void;
  className?: string;
};

/** Clickable Lyrics section title — opens display settings popover. */
export function LyricsHeadingButton({
  settings,
  onRemoveBracketsChange,
  onViewModeChange,
  className,
}: LyricsHeadingButtonProps) {
  const headingRef = useRef<HTMLButtonElement>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ x: number; y: number } | null>(null);

  const openPopover = useCallback(() => {
    const rect = headingRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPopoverAnchor({ x: rect.left, y: rect.bottom + 4 });
  }, []);

  const closePopover = useCallback(() => {
    setPopoverAnchor(null);
  }, []);

  return (
    <>
      <button
        ref={headingRef}
        type="button"
        className={className ?? 'lyrics-heading-btn'}
        aria-haspopup="dialog"
        aria-expanded={popoverAnchor != null}
        onClick={openPopover}
      >
        Lyrics
      </button>
      {popoverAnchor ? (
        <LyricsSettingsPopover
          anchor={popoverAnchor}
          settings={settings}
          onRemoveBracketsChange={onRemoveBracketsChange}
          onViewModeChange={onViewModeChange}
          onClose={closePopover}
        />
      ) : null}
    </>
  );
}
