/**
 * Markdown → safe HTML for compiled Song Pages and in-app previews.
 * Source is stored as markdown in drafts/manifests; HTML is generated at compile or preview time.
 */
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

marked.setOptions({
  gfm: true,
  breaks: true,
});

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    ...(sanitizeHtml.defaults.allowedTags || []),
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ['href', 'name', 'target', 'rel'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
  },
};

/** Convert markdown source to sanitized HTML safe for static pages and previews. */
export function renderMarkdownToHtml(source: string): string {
  const trimmed = source.trim();
  if (!trimmed) return '';

  const parsed = marked.parse(trimmed, { async: false });
  if (typeof parsed !== 'string') {
    return '';
  }

  return sanitizeHtml(parsed, SANITIZE_OPTIONS);
}
