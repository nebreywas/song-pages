/**
 * Song Chip renderer — six families from the Song Chips design spec.
 *
 * Each type is a distinct layout family; themes recolor without changing structure.
 */

import type {
  SongChipChromeState,
  SongChipMetaField,
  SongChipStructure,
  SongChipViewModel,
} from '@shared/songChips';

import './song-chips.css';

type SongChipProps = {
  structure: SongChipStructure;
  song: SongChipViewModel;
  chrome?: SongChipChromeState;
  className?: string;
  demoFallbacks?: boolean;
  /** When set, Inline Mention is shown inside this sentence (use {chip} placeholder). */
  inlineSentence?: string;
};

function metaText(
  field: SongChipMetaField,
  song: SongChipViewModel,
  demo: boolean,
): string | null {
  switch (field) {
    case 'none':
      return null;
    case 'artist':
      return song.artistName || (demo ? 'Artist' : null);
    case 'length':
      return song.lengthLabel || (demo ? '3:48' : null);
    case 'genre':
      return song.primaryGenre || (demo ? 'Country Noir' : null);
    case 'date':
      return song.creationDate || (demo ? 'Apr 14, 2024' : null);
    case 'album':
      return song.albumName || (demo ? 'Collection' : null);
    default:
      return null;
  }
}

function Cover({
  structure,
  song,
  demo,
}: {
  structure: SongChipStructure;
  song: SongChipViewModel;
  demo: boolean;
}) {
  if (structure.coverShape === 'none') return null;
  const sizeClass = `schip-cover--${structure.artworkSize}`;
  const shapeClass = `schip-cover--${structure.coverShape}`;
  return (
    <span className={`schip-cover ${shapeClass} ${sizeClass}`}>
      {song.coverUrl ? (
        <img src={song.coverUrl} alt="" />
      ) : (
        <span className="schip-cover-empty" aria-hidden>
          {demo ? '♪' : ''}
        </span>
      )}
    </span>
  );
}

function PlayBtn({
  structure,
  className,
}: {
  structure: SongChipStructure;
  className?: string;
}) {
  if (!structure.showPlay || structure.playStyle === 'none') return null;
  return (
    <span
      className={[
        'schip-play',
        `schip-play--${structure.playStyle}`,
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    >
      <span className="schip-play-triangle" />
    </span>
  );
}

export function SongChip({
  structure,
  song,
  chrome = 'default',
  className,
  demoFallbacks = false,
  inlineSentence = 'That night, {chip} changed everything.',
}: SongChipProps) {
  const type = structure.typeId;
  const title = song.title || 'Untitled';
  const meta = metaText(structure.metaField, song, demoFallbacks);
  const length = song.lengthLabel || (demoFallbacks ? '3:48' : null);
  const artist = song.artistName || (demoFallbacks ? 'Artist' : null);

  const rootClass = [
    'schip',
    `schip--type-${type}`,
    `schip--theme-${structure.themeId}`,
    `schip--surface-${structure.surface}`,
    `schip--chrome-${chrome}`,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  if (type === 'inline-mention') {
    const chip = (
      <span className={`${rootClass} schip-inline`}>
        <span className="schip-title">{title}</span>
        <PlayBtn structure={structure} className="schip-play--inline" />
      </span>
    );
    const parts = inlineSentence.split('{chip}');
    return (
      <p className="schip-inline-sentence">
        {parts[0]}
        {chip}
        {parts[1] ?? ''}
      </p>
    );
  }

  if (type === 'mention-badge') {
    return (
      <span className={rootClass}>
        <span className="schip-note" aria-hidden>
          ♪
        </span>
        <span className="schip-title">{title}</span>
      </span>
    );
  }

  if (type === 'play') {
    return (
      <span className={rootClass}>
        <PlayBtn structure={structure} className="schip-play--lg" />
        <span className="schip-info">
          <span className="schip-title">{title}</span>
          {structure.showArtist && artist ? (
            <span className="schip-meta">{artist}</span>
          ) : null}
        </span>
        {structure.showLength && length ? (
          <>
            <span className="schip-divider" aria-hidden />
            <span className="schip-length">{length}</span>
          </>
        ) : null}
      </span>
    );
  }

  if (type === 'artwork') {
    return (
      <span className={rootClass}>
        <Cover structure={structure} song={song} demo={demoFallbacks} />
        <span className="schip-info">
          <span className="schip-title">{title}</span>
          {structure.showArtist && artist ? (
            <span className="schip-meta">{artist}</span>
          ) : null}
        </span>
      </span>
    );
  }

  if (type === 'row') {
    return (
      <span className={rootClass}>
        <PlayBtn structure={structure} />
        <Cover structure={structure} song={song} demo={demoFallbacks} />
        <span className="schip-info">
          <span className="schip-title">{title}</span>
          {structure.showArtist && artist ? (
            <span className="schip-meta">{artist}</span>
          ) : null}
        </span>
        {structure.showExplicit && (song.explicit || demoFallbacks) ? (
          <span className="schip-explicit">E</span>
        ) : null}
        {structure.showLike ? (
          <span className="schip-like" aria-hidden>
            ♡
          </span>
        ) : null}
        {structure.showLength && length ? (
          <span className="schip-length">{length}</span>
        ) : null}
        {structure.showMenu ? (
          <span className="schip-menu" aria-hidden>
            ⋮
          </span>
        ) : null}
      </span>
    );
  }

  // compact (default)
  return (
    <span className={rootClass}>
      <Cover structure={structure} song={song} demo={demoFallbacks} />
      <span className="schip-info">
        <span className="schip-title">{title}</span>
        {meta ? (
          <span className="schip-meta">
            {structure.metaField === 'genre' ? (
              <span className="schip-genre-pill">{meta}</span>
            ) : (
              meta
            )}
          </span>
        ) : null}
      </span>
      <PlayBtn structure={structure} />
    </span>
  );
}
