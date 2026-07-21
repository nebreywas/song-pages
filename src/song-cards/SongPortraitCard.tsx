/**
 * Song Portrait Card renderer — Cover / Information / Footer zones.
 *
 * Layout targets the vertical 230×300 reference sheet. Hosts own click/play
 * actions; this component only presents structure + chrome state.
 */

import type { CSSProperties, ReactNode } from 'react';

import type {
  CoverCornerBug,
  CoverCornerSlot,
  FooterCenterItem,
  SongCardChromeState,
  SongCardStructure,
  SongCardViewModel,
} from '@shared/songCards';

import './song-cards.css';

const CORNER_SLOTS: CoverCornerSlot[] = [
  'topLeft',
  'topRight',
  'bottomLeft',
  'bottomRight',
];

type SongPortraitCardProps = {
  structure: SongCardStructure;
  song: SongCardViewModel;
  chrome?: SongCardChromeState;
  className?: string;
  /** When true, show sample length / track # / stats when song data is empty. */
  demoFallbacks?: boolean;
};

function cornerBugNode(
  bug: CoverCornerBug,
  song: SongCardViewModel,
  structure: SongCardStructure,
  demo: boolean,
): ReactNode {
  switch (bug) {
    case 'none':
      return null;
    case 'explicit':
      if (!song.explicit && !demo) return null;
      return structure.footer.explicitFormat === 'Explicit' ? 'EXPLICIT' : 'E';
    case 'play':
      return <span className="spc-play-triangle" aria-hidden />;
    case 'like':
      if (structure.likeStyle === 'plus-circle') {
        return <span className="spc-bug-glyph" aria-hidden>⊕</span>;
      }
      if (structure.likeStyle === 'text-pill') return 'Like';
      return <span className="spc-heart" aria-hidden />;
    case 'length': {
      const label = song.lengthLabel || (demo ? '3:48' : null);
      return label;
    }
    default:
      return null;
  }
}

function footerCenterText(
  item: FooterCenterItem,
  song: SongCardViewModel,
  demo: boolean,
): string | null {
  switch (item) {
    case 'length':
      return song.lengthLabel || (demo ? '3:48' : null);
    case 'creation-date':
      return song.creationDate || (demo ? 'Apr 14, 2024' : null);
    case 'bitrate':
      return song.bitrateLabel || (demo ? 'AAC 320kbps' : null);
    case 'main-genre': {
      const g = song.genres[0];
      if (!g && !demo) return null;
      return g || 'Genre';
    }
    default:
      return null;
  }
}

function menuGlyph(style: SongCardStructure['footer']['menuStyle']): string {
  switch (style) {
    case 'dots-v':
      return '⋮';
    case 'info':
      return 'ⓘ';
    case 'hamburger':
      return '☰';
    case 'flip':
      return '↺';
    case 'dots-h':
    default:
      return '···';
  }
}

function takeFittingTags(tags: string[], max: number): string[] {
  return tags.slice(0, max);
}

/** Prefer genres; if empty, fall back to themes so pill rows still preview. */
function resolveTagList(song: SongCardViewModel, max: number): string[] {
  if (song.genres.length > 0) return takeFittingTags(song.genres, max);
  return takeFittingTags(song.themes, max);
}

export function SongPortraitCard({
  structure,
  song,
  chrome = 'default',
  className,
  demoFallbacks = false,
}: SongPortraitCardProps) {
  const design = structure.designId;
  const coverPct = Math.round(structure.coverHeightRatio * 100);
  const isLoading = chrome === 'loading';

  const tags = resolveTagList(song, 3);
  const themes = takeFittingTags(song.themes, 3);

  const subtitleText =
    structure.info.showSubtitle &&
    (song.subtitle ||
      (demoFallbacks ? 'A signal in the static.' : undefined));
  const captionText =
    structure.info.showCaption &&
    (song.caption ||
      (demoFallbacks
        ? 'Fast lane under the streetlights. No looking back.'
        : undefined));
  const quoteText =
    structure.info.showLyricQuote &&
    (song.lyricQuote ||
      (demoFallbacks
        ? 'The rain hits the window like a soft refrain, October whispers my name again…'
        : undefined));

  return (
    <article
      className={[
        'spc',
        `spc--design-${design}`,
        `spc--chrome-${chrome}`,
        structure.coverBugsPlacement === 'outside'
          ? 'spc--bugs-outside'
          : 'spc--bugs-overlay',
        structure.footer.shadeFooter ? 'spc--footer-shaded' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        {
          '--spc-cover-pct': `${coverPct}%`,
        } as CSSProperties
      }
      data-design={design}
      aria-busy={isLoading || undefined}
    >
      {/* —— Cover Zone —— */}
      <div
        className={[
          'spc-cover',
          structure.coverBorder ? 'spc-cover--border' : '',
          `spc-cover--blend-${structure.coverBlend}`,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="spc-cover-media">
          {isLoading ? (
            <div className="spc-cover-skeleton" />
          ) : song.coverUrl ? (
            <img src={song.coverUrl} alt="" className="spc-cover-img" />
          ) : (
            <div className="spc-cover-empty" aria-hidden>
              No cover
            </div>
          )}
        </div>

        {CORNER_SLOTS.map((slot) => {
          const bug = structure.corners[slot];
          const node = cornerBugNode(bug, song, structure, demoFallbacks);
          if (node == null || node === false) return null;
          const playMods =
            bug === 'play'
              ? [
                  `spc-bug--play-${structure.playSize}`,
                  `spc-bug--play-${structure.playFill}`,
                ]
              : [];
          return (
            <span
              key={slot}
              className={[
                'spc-bug',
                `spc-bug--${slot}`,
                `spc-bug--kind-${bug}`,
                ...playMods,
              ].join(' ')}
            >
              {node}
            </span>
          );
        })}
      </div>

      {/* —— Information Zone —— */}
      <div className="spc-info">
        {isLoading ? (
          <>
            <div className="spc-skel spc-skel--title" />
            <div className="spc-skel spc-skel--artist" />
          </>
        ) : (
          <>
            <h3 className="spc-title">{song.title}</h3>

            {/* Subtitle sits under title (Info + Tags reference order). */}
            {subtitleText ? (
              <p className="spc-subtitle">{subtitleText}</p>
            ) : null}

            <p className="spc-artist">{song.artistName}</p>

            {/* Alternate Art: accent rule between identity and caption. */}
            {design === 6 && captionText ? (
              <hr className="spc-info-rule" />
            ) : null}

            {captionText ? <p className="spc-caption">{captionText}</p> : null}

            {quoteText ? (
              <blockquote
                className={[
                  'spc-lyric-quote',
                  `spc-lyric-quote--${structure.info.lyricQuoteOverflow}`,
                ].join(' ')}
              >
                <span className="spc-lyric-mark spc-lyric-mark--open" aria-hidden>
                  “
                </span>
                <span className="spc-lyric-quote-text">{quoteText}</span>
                <span className="spc-lyric-mark spc-lyric-mark--close" aria-hidden>
                  ”
                </span>
              </blockquote>
            ) : null}

            {structure.info.showGenres &&
            (tags.length > 0 ||
              (demoFallbacks && tags.length === 0)) ? (
              <div
                className={[
                  'spc-tags',
                  `spc-tags--${structure.info.genreThemeRender}`,
                ].join(' ')}
              >
                {(tags.length > 0
                  ? tags
                  : ['Mood', 'Night', 'Drive']
                ).map((g) => (
                  <span key={g} className="spc-tag">
                    {g}
                  </span>
                ))}
              </div>
            ) : null}

            {structure.info.showThemes && themes.length > 0 ? (
              <div
                className={[
                  'spc-tags',
                  'spc-tags--themes',
                  `spc-tags--${structure.info.genreThemeRender}`,
                ].join(' ')}
              >
                {themes.map((t) => (
                  <span key={t} className="spc-tag">
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* —— Footer Zone —— */}
      <footer
        className={[
          'spc-footer',
          structure.footer.showSeparator ? 'spc-footer--sep' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="spc-footer-left">
          {/* Decorative playing anim shows as chrome; animates when Playing preview. */}
          {structure.footer.playingAnim !== 'none' ? (
            <span
              className={[
                'spc-playing-anim',
                `spc-playing-anim--${structure.footer.playingAnim}`,
                chrome === 'playing' ? 'is-live' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-hidden
            />
          ) : null}
          {structure.footer.left === 'track-number' ? (
            <span className="spc-footer-meta">
              {song.trackNumber || (demoFallbacks ? '01' : '—')}
            </span>
          ) : null}
          {structure.footer.left === 'explicit' &&
          (song.explicit || demoFallbacks) ? (
            <span className="spc-footer-explicit">
              {structure.footer.explicitFormat === 'Explicit' ? 'EXPLICIT' : 'E'}
            </span>
          ) : null}
        </div>

        <div className="spc-footer-center">
          {structure.footer.center
            .map((item) => {
              const text = footerCenterText(item, song, demoFallbacks);
              if (!text) return null;
              const pill =
                item === 'main-genre' &&
                structure.info.genreThemeRender !== 'text';
              return (
                <span
                  key={item}
                  className={pill ? 'spc-footer-pill' : 'spc-footer-meta'}
                >
                  {text}
                </span>
              );
            })
            .filter(Boolean)
            .reduce<ReactNode[]>((nodes, node, index) => {
              if (index > 0) {
                nodes.push(
                  <span key={`sep-${index}`} className="spc-footer-sep" aria-hidden>
                    •
                  </span>,
                );
              }
              nodes.push(node);
              return nodes;
            }, [])}
        </div>

        <div className="spc-footer-right">
          <span className="spc-menu-bug" aria-hidden>
            {menuGlyph(structure.footer.menuStyle)}
          </span>
        </div>
      </footer>
    </article>
  );
}
