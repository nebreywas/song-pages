/**
 * Resolve / render listener lyrics body for plain, markdown, and Pretty Lyrics modes.
 */

import { LISTENER_DEFAULT_PRETTY_LYRICS_OPTIONS } from '@shared/listener/defaultPrettyLyricsConfig';
import type {
  ListenerLyricsDisplaySettings,
  ListenerLyricsViewMode,
} from '@shared/listener/lyricsDisplaySettings';
import {
  formatListenerLyricsDisplayText,
  looksLikeMarkdownLyrics,
} from '@shared/lyricsText';
import {
  compileLyricTypography,
  type LyricTypographyManifest,
  type PrettyLyricsCompileOptions,
} from '@shared/prettyLyrics';

import { renderLyricsMarkdownPreview } from '../lib/markdownPreview';

/** Escape text for HTML injection into guest song pages. */
export function escapeListenerLyricsHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Effective renderer after Markdown recognition.
 * Choosing Markdown without recognizable syntax falls back to plain text.
 */
export function resolveListenerLyricsViewMode(
  preferred: ListenerLyricsViewMode,
  source: string,
): ListenerLyricsViewMode {
  if (preferred === 'markdown' && !looksLikeMarkdownLyrics(source)) {
    return 'plain';
  }
  return preferred;
}

/** Plain lyrics as simple paragraphs (markdown-body compatible). */
export function renderLyricsPlainHtml(source: string, removeBrackets: boolean): string {
  const displayText = formatListenerLyricsDisplayText(source, removeBrackets);
  if (!displayText.trim()) return '';

  return displayText
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split('\n').map((line) => escapeListenerLyricsHtml(line));
      return `<p>${lines.join('<br>')}</p>`;
    })
    .join('');
}

export function compileListenerPrettyLyrics(
  source: string,
  removeBrackets: boolean,
  options: PrettyLyricsCompileOptions = LISTENER_DEFAULT_PRETTY_LYRICS_OPTIONS,
): LyricTypographyManifest | null {
  const displayText = formatListenerLyricsDisplayText(source, removeBrackets);
  if (!displayText.trim()) return null;
  return compileLyricTypography(displayText, options);
}

/**
 * Self-contained HTML for guest webviews (inline styles — guest CSS is unavailable).
 * Native song pages should prefer {@link ListenerLyricsBody} + LyricTypographyView instead.
 */
export function renderPrettyLyricsGuestHtml(
  source: string,
  removeBrackets: boolean,
  options: PrettyLyricsCompileOptions = LISTENER_DEFAULT_PRETTY_LYRICS_OPTIONS,
): string {
  const manifest = compileListenerPrettyLyrics(source, removeBrackets, options);
  if (!manifest) return '';

  const palette = manifest.palette;
  const blocks = manifest.blocks
    .map((block) => {
      const lines = block.lines
        .map((line) => {
          const tokens = line.tokens
            .map((token) => {
              if (!token.isWord) {
                return escapeListenerLyricsHtml(token.rawText);
              }
              const role = token.typography.colorRole;
              let color = palette.base;
              if (role === 'quiet') color = palette.quiet;
              else if (role.startsWith('accent-')) {
                const i = Number(role.slice('accent-'.length)) || 0;
                color = palette.accents[i % palette.accents.length] ?? palette.base;
              } else if (role.startsWith('motif-')) {
                const i = Number(role.slice('motif-'.length)) || 0;
                color = palette.motifs[i % palette.motifs.length] ?? palette.base;
              } else if (role.startsWith('underline-')) {
                const i = Number(role.slice('underline-'.length)) || 0;
                color = palette.underline[i % palette.underline.length] ?? palette.base;
              }
              const style = [
                `color:${color}`,
                `font-size:${token.typography.scale}em`,
                `font-weight:${token.typography.weight}`,
                `opacity:${token.typography.opacity}`,
                token.typography.italic ? 'font-style:italic' : '',
                token.typography.underline ? 'text-decoration:underline' : '',
              ]
                .filter(Boolean)
                .join(';');
              return `<span style="${style}">${escapeListenerLyricsHtml(token.rawText)}</span>`;
            })
            .join('');
          const lineStyle = [
            `margin:${line.layout.spaceBefore}rem 0 ${line.layout.spaceAfter}rem`,
            line.layout.offsetPct
              ? `transform:translateX(${line.layout.offsetPct}%)`
              : '',
          ]
            .filter(Boolean)
            .join(';');
          return `<div style="${lineStyle}">${tokens}</div>`;
        })
        .join('');
      const blockAlign = block.layout.align === 'center' ? 'center' : 'left';
      const blockMargin =
        blockAlign === 'center'
          ? `${block.layout.spaceBefore}rem auto ${block.layout.spaceAfter}rem`
          : `${block.layout.spaceBefore}rem 0 ${block.layout.spaceAfter}rem 0`;
      const blockStyle = [
        `max-width:${block.layout.maxWidthEm}em`,
        `margin:${blockMargin}`,
        `text-align:${blockAlign}`,
      ].join(';');
      return `<section style="${blockStyle}">${lines}</section>`;
    })
    .join('');

  // Transparent background — song page surface shows through (same as VC Pretty Lyrics).
  const rootStyle = [
    'background:transparent',
    `color:${palette.base}`,
    `font-family:${escapeListenerLyricsHtml(manifest.fontFamily || 'Georgia, serif')}`,
    `letter-spacing:${manifest.letterSpacingEm}em`,
    `word-spacing:${manifest.wordSpacingEm}em`,
    'padding:0.25rem 0 1rem',
    'line-height:1.35',
  ].join(';');

  return `<div class="listener-pretty-lyrics-guest" style="${rootStyle}">${blocks}</div>`;
}

/** HTML suitable for guest webview injection for plain/markdown/pretty. */
export function renderListenerLyricsHtml(
  source: string,
  settings: ListenerLyricsDisplaySettings,
): string {
  if (!source.trim()) return '';
  const mode = resolveListenerLyricsViewMode(settings.viewMode, source);
  if (mode === 'plain') {
    return renderLyricsPlainHtml(source, settings.removeBrackets);
  }
  if (mode === 'pretty') {
    return renderPrettyLyricsGuestHtml(source, settings.removeBrackets);
  }
  return renderLyricsMarkdownPreview(source, settings.removeBrackets);
}
