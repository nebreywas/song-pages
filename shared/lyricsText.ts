/**
 * Lyrics display helpers — shared across VC Mode, static pages, and the editor.
 *
 * @see documentation/shared-utilities.md — catalog and reuse guidance
 */

const BRACKETED_SEGMENT = /\[[^\]]*\]/g;

/** Collapse runs of three or more line breaks (including whitespace-only lines) to a single blank line. */
export function collapseLyricsBlankLines(lyrics: string): string {
  const normalized = lyrics.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Whitespace-only lines count as blank lines before measuring runs.
  const withoutWhitespaceLines = normalized.replace(/\n[ \t]+(?=\n)/g, '\n');
  return withoutWhitespaceLines.replace(/\n{3,}/g, '\n\n');
}

/** Remove leading/trailing blank lines after bracket-only lines were dropped. */
export function trimLyricsEdgeBlankLines(lyrics: string): string {
  return lyrics.replace(/^\n+/, '').replace(/\n+$/, '');
}

/** Matches empty markdown paragraphs (whitespace, nbsp, or lone <br>). */
const EMPTY_PARAGRAPH = /<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi;

/**
 * Trim excess vertical spacing in lyrics HTML (empty paragraphs, long <br> runs).
 * Call after markdown render when displaying in the listener song page.
 */
export function collapseLyricsHtmlSpacing(html: string): string {
  return html
    .replace(EMPTY_PARAGRAPH, '')
    .replace(/(?:<br\s*\/?>\s*){3,}/gi, '<br><br>');
}

/**
 * Listener song-page lyrics — optional bracket strip, always capped at double newlines.
 * Source lyrics data is unchanged; call at display/render time only.
 */
export function formatListenerLyricsDisplayText(lyrics: string, removeBrackets: boolean): string {
  if (removeBrackets) return stripBracketedLyricsText(lyrics);
  return collapseLyricsBlankLines(lyrics);
}

/**
 * Remove square-bracket annotations from lyrics (e.g. [Chorus], [Verse 2]).
 * Source lyrics data is unchanged; call this at display/render time only.
 */
export function stripBracketedLyricsText(lyrics: string): string {
  const stripped = lyrics
    .split('\n')
    .map((line) => {
      const withoutBrackets = line.replace(BRACKETED_SEGMENT, '').replace(/  +/g, ' ');
      // Drop lines that were only bracket comments.
      if (line.trim().length > 0 && withoutBrackets.trim().length === 0) return '';
      return withoutBrackets.trimEnd();
    })
    .join('\n');

  // Removing annotation-only lines can leave runs of blank lines — cap at one empty line.
  return trimLyricsEdgeBlankLines(collapseLyricsBlankLines(stripped));
}

/**
 * Basic Markdown syntax removal for ALARE plain-text normalization.
 *
 * Regex-oriented — not a full Markdown parser. Sufficient for Phase 1 because
 * current demo songs/playlists do not use Markdown in lyrics. If richer
 * Markdown appears later, revisit or pipe through a plain-text extractor.
 *
 * Source lyrics data is unchanged; call at display/analysis time only.
 */
export function stripMarkdownLyricsText(lyrics: string): string {
  const lines = lyrics.split('\n').map((line) => {
    let s = line;
    // Block prefixes (line start).
    s = s.replace(/^#{1,6}\s+/, '');
    s = s.replace(/^>\s?/, '');
    s = s.replace(/^[-*+]\s+/, '');
    s = s.replace(/^\d+\.\s+/, '');
    // Horizontal rule lines.
    if (/^[-*_]{3,}\s*$/.test(s.trim())) return '';
    return s;
  });

  return lines
    .join('\n')
    // Images → alt text (often empty).
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Links → visible label.
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Emphasis / code (non-greedy, single-line friendly).
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

/**
 * ALARE derived lyric text: bracket strip, then basic Markdown strip.
 * Original stored lyrics remain unchanged.
 */
export function normalizeAlareLyricsText(lyrics: string): string {
  const lineEndings = lyrics.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return stripMarkdownLyricsText(stripBracketedLyricsText(lineEndings));
}
