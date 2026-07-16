/**
 * Static Pretty Lyrics renderer — no scroll-triggered recomputation.
 * Click a word to inspect evidence reasons in the lab diagnostics panel.
 *
 * Lab ornaments (italics / glow / font-mix) are applied from token typography
 * when the matching compile options are enabled.
 */

import { memo, type CSSProperties } from 'react';

import { getPrettyLyricsFont } from '@shared/prettyLyrics';
import type {
  LyricTypographyManifest,
  TypographyLine,
  TypographyPalette,
  TypographyToken,
} from '@shared/prettyLyrics';

function manifestoFont(manifest: LyricTypographyManifest): string {
  return manifest.fontFamily || 'Georgia, serif';
}

function resolveTokenColor(token: TypographyToken, palette: TypographyPalette): string {
  const role = token.typography.colorRole;
  if (role === 'quiet') return palette.quiet;
  if (role === 'base') return palette.base;
  if (role.startsWith('accent-')) {
    const i = Number(role.slice('accent-'.length)) || 0;
    return palette.accents[i % palette.accents.length] ?? palette.accents[0]!;
  }
  if (role.startsWith('motif-')) {
    const i = Number(role.slice('motif-'.length)) || 0;
    return palette.motifs[i % palette.motifs.length] ?? palette.motifs[0]!;
  }
  if (role.startsWith('underline-')) {
    const i = Number(role.slice('underline-'.length)) || 0;
    return palette.underline[i % palette.underline.length] ?? palette.underline[0]!;
  }
  return palette.base;
}

function resolveTokenFontFamily(
  token: TypographyToken,
  displayFamily: string | undefined,
  altFamily: string | undefined,
): string | undefined {
  if (token.typography.fontFace === 'display') return displayFamily;
  if (token.typography.fontFace === 'alt') return altFamily;
  return undefined;
}

const TypographyTokenView = memo(function TypographyTokenView({
  token,
  palette,
  displayFamily,
  altFamily,
  selected,
  onSelect,
}: {
  token: TypographyToken;
  palette: TypographyPalette;
  displayFamily?: string;
  altFamily?: string;
  selected: boolean;
  onSelect: (token: TypographyToken) => void;
}) {
  if (!token.isWord) {
    return <span className="pretty-lyric-sep">{token.rawText}</span>;
  }

  const color = resolveTokenColor(token, palette);
  const face = resolveTokenFontFamily(token, displayFamily, altFamily);
  const style = {
    '--token-scale': token.typography.scale,
    '--token-weight': token.typography.weight,
    '--token-opacity': token.typography.opacity,
    '--token-color': color,
    ...(face ? { fontFamily: face } : {}),
    ...(token.typography.italic ? { fontStyle: 'italic' } : {}),
  } as CSSProperties;

  return (
    <button
      type="button"
      className={[
        'pretty-lyric-token',
        `role-${token.typography.role}`,
        token.typography.underline ? 'is-underlined' : '',
        token.typography.italic ? 'is-italic' : '',
        token.typography.glow ? 'is-glow' : '',
        selected ? 'is-selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      data-token-id={token.id}
      onClick={() => onSelect(token)}
      title={token.reasons.map((r) => r.rule).join(', ') || token.typography.role}
    >
      {token.rawText}
    </button>
  );
});

const TypographyLineView = memo(function TypographyLineView({
  line,
  palette,
  displayFamily,
  altFamily,
  selectedTokenId,
  onSelectToken,
}: {
  line: TypographyLine;
  palette: TypographyPalette;
  displayFamily?: string;
  altFamily?: string;
  selectedTokenId: string | null;
  onSelectToken: (token: TypographyToken) => void;
}) {
  const style = {
    '--line-scale': line.layout.scale,
    '--space-before': `${line.layout.spaceBefore}rem`,
    '--space-after': `${line.layout.spaceAfter}rem`,
    '--line-offset-pct': line.layout.offsetPct,
  } as CSSProperties;

  return (
    <div className={`pretty-lyric-line layout-${line.layout.kind}`} style={style}>
      {line.tokens.map((token) => (
        <TypographyTokenView
          key={token.id}
          token={token}
          palette={palette}
          displayFamily={displayFamily}
          altFamily={altFamily}
          selected={selectedTokenId === token.id}
          onSelect={onSelectToken}
        />
      ))}
    </div>
  );
});

type LyricTypographyViewProps = {
  manifest: LyricTypographyManifest;
  selectedTokenId?: string | null;
  onSelectToken?: (token: TypographyToken) => void;
};

export function LyricTypographyView({
  manifest,
  selectedTokenId = null,
  onSelectToken,
}: LyricTypographyViewProps) {
  const palette = manifest.palette;
  const fontPack = getPrettyLyricsFont(manifest.fontId);
  const rootStyle = {
    '--pretty-bg': palette.background,
    '--pretty-base': palette.base,
    '--pretty-quiet': palette.quiet,
    fontFamily: manifestoFont(manifest),
    letterSpacing: `${manifest.letterSpacingEm}em`,
    wordSpacing: `${manifest.wordSpacingEm}em`,
    // Drive .is-glow halo/scale without changing which tokens are selected.
    '--pretty-glow-intensity': String(Math.max(0, Math.min(2, manifest.glowIntensity))),
  } as CSSProperties;

  return (
    <div
      className={`pretty-lyric-view font-${manifest.fontId} preset-${manifest.presetId} theme-${manifest.themeId}${
        manifest.monochrome ? ' is-monochrome' : ''
      }`}
      style={rootStyle}
      data-source-hash={manifest.sourceHash}
    >
      {manifest.blocks.map((block) => (
        <section
          key={block.id}
          className={`pretty-lyric-block shape-${block.shape} align-${block.layout.align}`}
          style={
            {
              // Keep both name families — lab CSS historically used --block-max / --block-before.
              '--block-max': `${block.layout.maxWidthEm}em`,
              '--block-max-width': `${block.layout.maxWidthEm}em`,
              '--block-before': `${block.layout.spaceBefore}rem`,
              '--block-after': `${block.layout.spaceAfter}rem`,
              '--block-space-before': `${block.layout.spaceBefore}rem`,
              '--block-space-after': `${block.layout.spaceAfter}rem`,
            } as CSSProperties
          }
        >
          {block.lines.map((line) => (
            <TypographyLineView
              key={line.id}
              line={line}
              palette={palette}
              displayFamily={fontPack.displayFamily}
              altFamily={fontPack.altFamily}
              selectedTokenId={selectedTokenId}
              onSelectToken={onSelectToken ?? (() => undefined)}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
