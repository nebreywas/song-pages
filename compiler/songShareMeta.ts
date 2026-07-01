import { escapeHtmlText } from './staticSiteUtils';

export const SHARE_CARD_WIDTH = 1200;
export const SHARE_CARD_HEIGHT = 630;

export type SongShareMetaInput = {
  siteRoot: string;
  songSlug: string;
  songTitle: string;
  artistName: string;
  caption: string;
  /** Relative site path, e.g. songs/my-song/share-card.jpg */
  shareImagePath: string | null;
  shareImageWidth: number;
  shareImageHeight: number;
};

/** Join deploy site root with a relative asset path — scrapers require absolute URLs. */
export function absoluteSiteAssetUrl(siteRoot: string, relativePath: string): string {
  const base = siteRoot.replace(/\/+$/, '');
  const rel = relativePath.replace(/^\/+/, '');
  return `${base}/${rel}`;
}

/** Open Graph title — song title plus caption when present. */
export function buildShareTitle(songTitle: string, caption: string): string {
  const title = songTitle.trim();
  const cap = caption.trim();
  if (cap) return `${title} (${cap})`;
  return title;
}

/** Meta/OG description — caption first, otherwise a simple byline. */
export function buildShareDescription(caption: string, songTitle: string, artistName: string): string {
  const cap = caption.trim();
  if (cap) return cap;
  return `${songTitle.trim()} — ${artistName.trim()}`;
}

/** Open Graph + Twitter Card tags for a compiled song page `<head>`. */
export function buildSongShareMetaHtml(input: SongShareMetaInput): string {
  const canonicalUrl = absoluteSiteAssetUrl(input.siteRoot, `songs/${input.songSlug}.html`);
  const shareTitle = buildShareTitle(input.songTitle, input.caption);
  const description = buildShareDescription(input.caption, input.songTitle, input.artistName);

  const lines = [
    `<meta name="description" content="${escapeHtmlText(description)}" />`,
    `<link rel="canonical" href="${escapeHtmlText(canonicalUrl)}" />`,
    `<meta property="og:type" content="music.song" />`,
    `<meta property="og:title" content="${escapeHtmlText(shareTitle)}" />`,
    `<meta property="og:description" content="${escapeHtmlText(description)}" />`,
    `<meta property="og:url" content="${escapeHtmlText(canonicalUrl)}" />`,
    `<meta property="og:site_name" content="Song Pages" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtmlText(shareTitle)}" />`,
    `<meta name="twitter:description" content="${escapeHtmlText(description)}" />`,
  ];

  if (input.shareImagePath) {
    const imageUrl = absoluteSiteAssetUrl(input.siteRoot, input.shareImagePath);
    lines.push(
      `<meta property="og:image" content="${escapeHtmlText(imageUrl)}" />`,
      `<meta property="og:image:width" content="${String(input.shareImageWidth)}" />`,
      `<meta property="og:image:height" content="${String(input.shareImageHeight)}" />`,
      `<meta name="twitter:image" content="${escapeHtmlText(imageUrl)}" />`,
    );
  }

  return lines.map((line) => `    ${line}`).join('\n');
}
