import { useMemo } from 'react';

import type { ListenerLyricsDisplaySettings } from '@shared/listener/lyricsDisplaySettings';

import { LyricTypographyView } from '../pretty-lyrics/LyricTypographyView';
import {
  compileListenerPrettyLyrics,
  renderLyricsPlainHtml,
  resolveListenerLyricsViewMode,
} from './renderListenerLyrics';
import { renderLyricsMarkdownPreview } from '../lib/markdownPreview';

type ListenerLyricsBodyProps = {
  lyrics: string;
  settings: ListenerLyricsDisplaySettings;
  className?: string;
  emptyLabel?: string;
};

/**
 * Listener song-page lyrics body — plain, markdown, or Pretty Lyrics
 * based on the Lyrics heading popover setting.
 */
export function ListenerLyricsBody({
  lyrics,
  settings,
  className = 'suno-demo-song-lyrics-body',
  emptyLabel = 'No lyrics available for this clip.',
}: ListenerLyricsBodyProps) {
  const mode = resolveListenerLyricsViewMode(settings.viewMode, lyrics);

  const plainOrMarkdownHtml = useMemo(() => {
    if (!lyrics.trim() || mode === 'pretty') return '';
    if (mode === 'plain') {
      return renderLyricsPlainHtml(lyrics, settings.removeBrackets);
    }
    return renderLyricsMarkdownPreview(lyrics, settings.removeBrackets);
  }, [lyrics, mode, settings.removeBrackets]);

  const prettyManifest = useMemo(() => {
    if (!lyrics.trim() || mode !== 'pretty') return null;
    return compileListenerPrettyLyrics(lyrics, settings.removeBrackets);
  }, [lyrics, mode, settings.removeBrackets]);

  if (!lyrics.trim()) {
    return <p className="suno-demo-song-muted">{emptyLabel}</p>;
  }

  if (mode === 'pretty' && prettyManifest) {
    return (
      <div className={`${className} listener-pretty-lyrics`}>
        <LyricTypographyView manifest={prettyManifest} />
      </div>
    );
  }

  if (plainOrMarkdownHtml) {
    return (
      <div className={className} dangerouslySetInnerHTML={{ __html: plainOrMarkdownHtml }} />
    );
  }

  return <p className="suno-demo-song-muted">{emptyLabel}</p>;
}
