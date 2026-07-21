/**
 * Wide Song Card renderer — Cover · Information · Highlights · Tail.
 *
 * Optimized for stacking in albums / playlists / queues. Skins live on
 * `.swc--design-N`; structure chooses highlight feature and density.
 */

import type {
  FooterCenterItem,
  SongCardChromeState,
  SongCardViewModel,
} from '@shared/songCards';
import type { WideSongCardStructure } from '@shared/songCards';

import './song-cards.css';

type SongWideCardProps = {
  structure: WideSongCardStructure;
  song: SongCardViewModel;
  chrome?: SongCardChromeState;
  className?: string;
  demoFallbacks?: boolean;
};

function metaLabel(item: FooterCenterItem): string {
  switch (item) {
    case 'length':
      return 'Length';
    case 'creation-date':
      return 'Released';
    case 'bitrate':
      return 'Format';
    case 'main-genre':
      return 'Genre';
    default:
      return item;
  }
}

function metaValue(
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
    case 'main-genre':
      return song.genres[0] || (demo ? 'Country Noir' : null);
    default:
      return null;
  }
}

function menuGlyph(style: WideSongCardStructure['tail']['menuStyle']): string {
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

export function SongWideCard({
  structure,
  song,
  chrome = 'default',
  className,
  demoFallbacks = false,
}: SongWideCardProps) {
  const design = structure.designId;
  const isLoading = chrome === 'loading';
  const tags = takeTags(song, 3);
  const themes = song.themes.slice(0, 3);

  const album =
    song.albumName?.trim() ||
    (demoFallbacks ? song.subtitle || 'Midnight Miles' : song.subtitle) ||
    null;

  const captionText =
    structure.info.showCaption &&
    (song.caption ||
      (demoFallbacks
        ? 'A late night drive with no destination — just the long way home.'
        : undefined));

  const subtitleText =
    structure.info.showSubtitle &&
    (song.subtitle ||
      (demoFallbacks ? 'A signal in the static…' : undefined));

  const quoteText =
    (structure.info.showLyricQuote ||
      structure.highlights.feature === 'lyric-quote') &&
    (song.lyricQuote ||
      (demoFallbacks
        ? 'The rain hits the window like a soft refrain…'
        : undefined));

  const trackNo = song.trackNumber || (demoFallbacks ? String(design).padStart(2, '0') : null);

  return (
    <article
      className={[
        'swc',
        `swc--design-${design}`,
        `swc--chrome-${chrome}`,
        `swc--cover-${structure.coverSize}`,
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-design={design}
      aria-busy={isLoading || undefined}
    >
      {/* —— Cover —— */}
      <div
        className={[
          'swc-cover',
          structure.coverBorder ? 'swc-cover--border' : '',
          `swc-cover--blend-${structure.coverBlend}`,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="swc-cover-media">
          {isLoading ? (
            <div className="swc-cover-skeleton" />
          ) : song.coverUrl ? (
            <img src={song.coverUrl} alt="" className="swc-cover-img" />
          ) : (
            <div className="swc-cover-empty" aria-hidden>
              No cover
            </div>
          )}
        </div>
        {structure.playPlacement === 'center' ||
        structure.playPlacement === 'lower-right' ? (
          <span
            className={`swc-play swc-play--${structure.playPlacement}`}
            aria-hidden
          >
            <span className="swc-play-triangle" />
          </span>
        ) : null}
      </div>

      {/* —— Information —— */}
      <div className="swc-info">
        {isLoading ? (
          <>
            <div className="swc-skel swc-skel--title" />
            <div className="swc-skel swc-skel--meta" />
          </>
        ) : (
          <>
            <div className="swc-title-row">
              {structure.showTrackNumber && trackNo ? (
                <span className="swc-track-no">{trackNo}</span>
              ) : null}
              <h3 className="swc-title">{song.title}</h3>
              {structure.info.showExplicitBug &&
              (song.explicit || demoFallbacks) ? (
                <span className="swc-explicit">
                  {structure.tail.explicitFormat === 'E' ? 'E' : 'EXPLICIT'}
                </span>
              ) : null}
            </div>

            {subtitleText ? (
              <p className="swc-subtitle">{subtitleText}</p>
            ) : null}

            <p className="swc-byline">
              <span className="swc-artist">{song.artistName}</span>
              {structure.info.showAlbum && album ? (
                <>
                  <span className="swc-byline-sep" aria-hidden>
                    •
                  </span>
                  <span className="swc-album">{album}</span>
                </>
              ) : null}
            </p>

            {captionText ? <p className="swc-caption">{captionText}</p> : null}

            {structure.info.showLyricQuote &&
            structure.highlights.feature !== 'lyric-quote' &&
            quoteText ? (
              <p className="swc-inline-quote">“{quoteText}”</p>
            ) : null}

            {structure.info.showGenres &&
            (tags.length > 0 || demoFallbacks) ? (
              <div
                className={[
                  'swc-tags',
                  `swc-tags--${structure.info.genreThemeRender}`,
                ].join(' ')}
              >
                {(tags.length > 0
                  ? tags
                  : ['Country Noir', 'Story Song', 'Road']
                ).map((g) => (
                  <span key={g} className="swc-tag">
                    {g}
                  </span>
                ))}
              </div>
            ) : null}

            {structure.info.showThemes && themes.length > 0 ? (
              <div
                className={[
                  'swc-tags',
                  'swc-tags--themes',
                  `swc-tags--${structure.info.genreThemeRender}`,
                ].join(' ')}
              >
                {themes.map((t) => (
                  <span key={t} className="swc-tag">
                    {t}
                  </span>
                ))}
              </div>
            ) : null}

            {(structure.tail.showPlayNext ||
              structure.tail.showAddToPlaylist) &&
            design === 1 ? (
              <div className="swc-info-links" aria-hidden>
                {structure.tail.showPlayNext ? (
                  <span className="swc-text-link">Play Next</span>
                ) : null}
                {structure.tail.showAddToPlaylist ? (
                  <span className="swc-text-link">+ Add to Playlist</span>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* —— Track Highlights —— */}
      <div className="swc-highlights">
        {structure.highlights.feature === 'waveform' ? (
          <div className="swc-waveform" aria-hidden>
            <span className="swc-waveform-bars" />
            {structure.tail.showLength || demoFallbacks ? (
              <span className="swc-waveform-len">
                {song.lengthLabel || '3:48'}
              </span>
            ) : null}
          </div>
        ) : null}

        {structure.highlights.feature === 'lyric-quote' && quoteText ? (
          <div className="swc-lyric-block">
            <p className="swc-lyric-label">Lyrics preview</p>
            <blockquote
              className={`swc-lyric-quote swc-lyric-quote--${structure.info.lyricQuoteOverflow}`}
            >
              <span className="swc-lyric-mark" aria-hidden>
                “
              </span>
              <span className="swc-lyric-text">{quoteText}</span>
              <span className="swc-lyric-mark swc-lyric-mark--close" aria-hidden>
                ”
              </span>
            </blockquote>
          </div>
        ) : null}

        {structure.highlights.feature === 'metadata-grid' ? (
          <div className="swc-meta-grid">
            {structure.highlights.metadata.map((item) => {
              const value = metaValue(item, song, demoFallbacks);
              if (!value) return null;
              return (
                <div key={item} className="swc-meta-cell">
                  <span className="swc-meta-label">{metaLabel(item)}</span>
                  <span className="swc-meta-value">{value}</span>
                </div>
              );
            })}
          </div>
        ) : null}

        {structure.highlights.feature === 'meta-inline' ? (
          <div className="swc-meta-inline">
            {structure.highlights.metadata.map((item) => {
              const value = metaValue(item, song, demoFallbacks);
              if (!value) return null;
              return (
                <span key={item} className="swc-meta-chip">
                  {value}
                </span>
              );
            })}
          </div>
        ) : null}

        {structure.highlights.feature === 'engagement' ? (
          <div className="swc-engagement" aria-label="Engagement">
            <div className="swc-eng-cell">
              <span className="swc-eng-label">Plays</span>
              <span className="swc-eng-value">3,215</span>
            </div>
            <div className="swc-eng-cell">
              <span className="swc-eng-label">Likes</span>
              <span className="swc-eng-value">218</span>
            </div>
            <div className="swc-eng-cell">
              <span className="swc-eng-label">Added</span>
              <span className="swc-eng-value">143</span>
            </div>
          </div>
        ) : null}

        {/* Artwork Emphasis: thin waveform under the grid */}
        {design === 3 && structure.highlights.feature === 'metadata-grid' ? (
          <div className="swc-waveform swc-waveform--thin" aria-hidden>
            <span className="swc-waveform-bars" />
          </div>
        ) : null}
      </div>

      {/* —— Tail —— */}
      <div className="swc-tail">
        <div className="swc-tail-meta">
          {structure.tail.showDate ? (
            <span>
              {song.creationDate || (demoFallbacks ? 'Apr 14, 2024' : null)}
            </span>
          ) : null}
          {structure.tail.showLength &&
          structure.highlights.feature !== 'waveform' ? (
            <span>
              {song.lengthLabel || (demoFallbacks ? '3:48' : null)}
            </span>
          ) : null}
          {structure.tail.showBitrate ? (
            <span>
              {song.bitrateLabel || (demoFallbacks ? 'AAC · 320kbps' : null)}
            </span>
          ) : null}
          {design === 4 && (song.explicit || demoFallbacks) ? (
            <span className="swc-tail-explicit">E</span>
          ) : null}
        </div>

        <div className="swc-tail-actions">
          {structure.playPlacement === 'tail' ? (
            <span className="swc-play swc-play--tail" aria-hidden>
              <span className="swc-play-triangle" />
            </span>
          ) : null}
          {structure.tail.showAdd ? (
            <span className="swc-tail-icon" aria-hidden>
              ⊕
            </span>
          ) : null}
          {structure.tail.showLike ? (
            <span className="swc-tail-icon" aria-hidden>
              ♡
            </span>
          ) : null}
          <span className="swc-tail-icon swc-tail-menu" aria-hidden>
            {menuGlyph(structure.tail.menuStyle)}
          </span>
        </div>
      </div>
    </article>
  );
}
