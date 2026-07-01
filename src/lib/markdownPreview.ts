/**
 * Markdown preview for the Electron renderer — uses DOMPurify (browser-safe).
 * Node compile path uses shared/markdown.ts with sanitize-html instead.
 */
import DOMPurify from 'dompurify';
import { marked } from 'marked';

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
