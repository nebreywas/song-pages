/**
 * Markdown preview for the Electron renderer — uses DOMPurify (browser-safe).
 * Node compile path uses shared/markdown.ts with sanitize-html instead.
 */
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import {
  collapseLyricsHtmlSpacing,
  formatListenerLyricsDisplayText,
} from '@shared/lyricsText';

marked.setOptions({
  gfm: true,
  breaks: true,
});

/** Convert markdown to sanitized HTML for in-app previews. */
export function renderMarkdownPreview(source: string): string {
  const trimmed = source.trim();
  if (!trimmed) return '';

  const parsed = marked.parse(trimmed, { async: false });
  if (typeof parsed !== 'string') return '';

  return DOMPurify.sanitize(parsed, {
    USE_PROFILES: { html: true },
  });
}

/** Listener lyrics — cap blank lines in source, then trim excess spacing in rendered HTML. */
export function renderLyricsMarkdownPreview(
  source: string,
  removeBrackets: boolean,
): string {
  const displayText = formatListenerLyricsDisplayText(source, removeBrackets);
  if (!displayText.trim()) return '';
  return collapseLyricsHtmlSpacing(renderMarkdownPreview(displayText));
}
