/**
 * Compact Rectangle (landscape) Song Card renderer.
 *
 * Cover left or right + information column + full-width footer.
 * Skins live on `.scc--design-N`; structure chooses side / bugs / content.
 */

import type { ReactNode } from 'react';

import type { CompactRectangleStructure } from '@shared/songCards';
import type {
  SongCardChromeState,
  SongCardViewModel,
} from '@shared/songCards';

import './song-cards.css';

type SongCompactRectangleCardProps = {
  structure: CompactRectangleStructure;
  song: SongCardViewModel;
  chrome?: SongCardChromeState;
  className?: string;
  demoFallbacks?: boolean;
};

function footerCenterText(
  item: CompactRectangleStructure['footer']['center'][number],
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
    case 'main-genre':
      return song.genres[0] || (demo ? 'Genre' : null);
    default:
      return null;
  }
}

function menuGlyph(style: CompactRectangleStructure['footer']['menuStyle']): string {
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

function takeTags(song: SongCardViewModel, max: number): string[] {
  if (song.genres.length > 0) return song.genres.slice(0, max);
  return song.themes.slice(0, max);
}

export function SongCompactRectangleCard({
  structure,
  song,
  chrome = 'default',
  className,
  demoFallbacks = false,
}: SongCompactRectangleCardProps) {
  const design = structure.designId;
  const isLoading = chrome === 'loading';
  const tags = takeTags(song, 4);
  const themes = song.themes.slice(0, 3);

  const album =
    song.albumName?.trim() ||
    (demoFallbacks ? song.subtitle || 'Collection' : song.subtitle) ||
    null;

  const captionText =
    structure.info.showCaption &&
    (song.caption ||
      (demoFallbacks
        ? 'A late night drive, no destination, just the long way home.'
        : undefined));

  const quoteText =
    structure.info.showLyricQuote &&
    (song.lyricQuote ||
      (demoFallbacks
        ? 'A signal in the static. A voice from the other side. Calling out across the midnight tide.'
        : undefined));

  const lengthOnCover =
    structure.coverBugs.length &&
    (song.lengthLabel || (demoFallbacks ? '3:48' : null));

  const showExplicitOnCover =
    structure.coverBugs.explicit && (song.explicit || demoFallbacks);

  const coverNode = (
    <div
      className={[
        'scc-cover',
        structure.coverBorder ? 'scc-cover--border' : '',
        `scc-cover--blend-${structure.coverBlend}`,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="scc-cover-media">
        {isLoading ? (
          <div className="scc-cover-skeleton" />
        ) : song.coverUrl ? (
          <img src={song.coverUrl} alt="" className="scc-cover-img" />
        ) : (
          <div className="scc-cover-empty" aria-hidden>
            No cover
          </div>
        )}
      </div>

      {structure.playPlacement !== 'none' ? (
        <span
          className={`scc-play scc-play--${structure.playPlacement}`}
          aria-hidden
        >
          <span className="scc-play-triangle" />
        </span>
      ) : null}

      {structure.coverBugs.like ? (
        <span className="scc-cover-bug scc-cover-bug--like" aria-hidden>
          ♡
        </span>
      ) : null}

      {lengthOnCover ? (
        <span className="scc-cover-bug scc-cover-bug--length">{lengthOnCover}</span>
      ) : null}

      {showExplicitOnCover ? (
        <span className="scc-cover-bug scc-cover-bug--explicit">
          {structure.footer.explicitFormat === 'Explicit' ? 'EXPLICIT' : 'E'}
        </span>
      ) : null}
    </div>
  );

  const infoNode = (
    <div className="scc-info">
      {isLoading ? (
        <>
          <div className="scc-skel scc-skel--title" />
          <div className="scc-skel scc-skel--meta" />
        </>
      ) : (
        <>
          <div className="scc-info-top">
            <div className="scc-info-heading">
              <h3 className="scc-title">{song.title}</h3>
              <p className="scc-byline">
                <span className="scc-artist">{song.artistName}</span>
                {structure.info.showAlbum && album ? (
                  <>
                    <span className="scc-byline-sep" aria-hidden>
                      •
                    </span>
                    <span className="scc-album">{album}</span>
                  </>
                ) : null}
              </p>
              {structure.info.showSubtitle && song.subtitle ? (
                <p className="scc-subtitle">{song.subtitle}</p>
              ) : null}
            </div>
            {structure.info.showHeaderActions ? (
              <div className="scc-info-actions" aria-hidden>
                <span className="scc-action-like">♡</span>
                <span className="scc-action-menu">
                  {menuGlyph(structure.footer.menuStyle)}
                </span>
              </div>
            ) : null}
          </div>

          {captionText ? <p className="scc-caption">{captionText}</p> : null}

          {quoteText ? (
            <blockquote
              className={[
                'scc-lyric-quote',
                `scc-lyric-quote--${structure.info.lyricQuoteOverflow}`,
              ].join(' ')}
            >
              <span className="scc-lyric-mark" aria-hidden>
                “
              </span>
              <span className="scc-lyric-quote-text">{quoteText}</span>
              <span className="scc-lyric-mark scc-lyric-mark--close" aria-hidden>
                ”
              </span>
            </blockquote>
          ) : null}

          {structure.info.showGenres &&
          (tags.length > 0 || demoFallbacks) ? (
            <div
              className={[
                'scc-tags',
                `scc-tags--${structure.info.genreThemeRender}`,
              ].join(' ')}
            >
              {(tags.length > 0 ? tags : ['Country Noir', 'Story Song']).map(
                (g) => (
                  <span key={g} className="scc-tag">
                    {g}
                  </span>
                ),
              )}
            </div>
          ) : null}

          {structure.info.showThemes && themes.length > 0 ? (
            <div
              className={[
                'scc-tags',
                'scc-tags--themes',
                `scc-tags--${structure.info.genreThemeRender}`,
              ].join(' ')}
            >
              {themes.map((t) => (
                <span key={t} className="scc-tag">
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );

  const centerNodes = structure.footer.center
    .map((item) => {
      const text = footerCenterText(item, song, demoFallbacks);
      if (!text) return null;
      return (
        <span key={item} className="scc-footer-meta">
          {text}
        </span>
      );
    })
    .filter(Boolean)
    .reduce<ReactNode[]>((nodes, node, index) => {
      if (index > 0) {
        nodes.push(
          <span key={`sep-${index}`} className="scc-footer-sep" aria-hidden>
            •
          </span>,
        );
      }
      nodes.push(node);
      return nodes;
    }, []);

  return (
    <article
      className={[
        'scc',
        `scc--design-${design}`,
        `scc--chrome-${chrome}`,
        `scc--cover-${structure.coverSide}`,
        structure.footer.shadeFooter ? 'scc--footer-shaded' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-design={design}
      aria-busy={isLoading || undefined}
    >
      <div className="scc-body">
        {structure.coverSide === 'left' ? (
          <>
            {coverNode}
            {infoNode}
          </>
        ) : (
          <>
            {infoNode}
            {coverNode}
          </>
        )}
      </div>

      <footer
        className={[
          'scc-footer',
          structure.footer.showSeparator ? 'scc-footer--sep' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="scc-footer-left">
          {structure.footer.playingAnim !== 'none' ? (
            <span
              className={[
                'scc-playing-anim',
                `scc-playing-anim--${structure.footer.playingAnim}`,
                chrome === 'playing' ? 'is-live' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-hidden
            />
          ) : null}
          {structure.footer.left === 'track-number' ? (
            <span className="scc-footer-track">
              {song.trackNumber || (demoFallbacks ? '01' : '—')}
            </span>
          ) : null}
          {structure.footer.left === 'explicit' &&
          (song.explicit || demoFallbacks) ? (
            <span className="scc-footer-explicit">
              {structure.footer.explicitFormat === 'Explicit' ? 'E' : 'E'}
            </span>
          ) : null}
        </div>

        <div className="scc-footer-center">{centerNodes}</div>

        <div className="scc-footer-right">
          {structure.footer.showPlayLink ? (
            <span className="scc-footer-play-link" aria-hidden>
              ▶ Play Song
            </span>
          ) : null}
          {structure.footer.showLikeAction ? (
            <span className="scc-footer-action" aria-hidden>
              ♡
            </span>
          ) : null}
          {structure.footer.showAddAction ? (
            <span className="scc-footer-action" aria-hidden>
              ⊕
            </span>
          ) : null}
          <span className="scc-menu-bug" aria-hidden>
            {menuGlyph(structure.footer.menuStyle)}
          </span>
        </div>
      </footer>
    </article>
  );
}
