import type { ColumnDef } from '@tanstack/react-table';

import {
  MIN_PLAYLIST_COLUMN_PX,
  type PlaylistColumnId,
  type PlaylistLayoutProfile,
} from '@shared/listener/playlistColumnLayout';
import { isSongSkipped, isSongSkippedForPlaylist } from '@shared/listener/playlistKinds';
import type { PlaylistLengthSettings } from '@shared/listener/playlistLengthSettings';
import { isSongLongerThanMinutes } from '@shared/listener/songDuration';
import type { SongRow } from '../types/app';
import { formatTime } from '@shared/listener/formatTime';
import { AnimatedSpeakerEmoji } from './AnimatedSpeakerEmoji';
import { LikedSongIndicator } from './LikedSongIndicator';
import { IconClock } from './PlayerIcons';
import { playlistColumnClassName } from './playlistColumnClasses';
import { PlaylistSongSourceCell } from './PlaylistSongSourceCell';
import { SkippedSongMarker } from './SkippedSongMarker';
import type { PlaylistYearColumnMode } from '@shared/listener/playlistTableView';
import type { SortColumn, SortDirection } from './sortPlaylist';
import { SortableColumnHeader } from './SortableColumnHeader';
import type { usePlaylistDragReorder } from './usePlaylistDragReorder';

type PlaylistDrag = ReturnType<typeof usePlaylistDragReorder>;
type PlaylistDragHandles = Pick<PlaylistDrag, 'startDrag' | 'setRowRef'>;

export type PlaylistTableColumnContext = {
  profile: PlaylistLayoutProfile;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  hasCustomOrder: boolean;
  isLikedPlaylist: boolean;
  likedSongIds: Set<number>;
  catalogOrderBySongId: Map<number, number>;
  customOrderBySongId: Map<number, number>;
  runtimeDurations: Record<number, number>;
  playlistDrag: PlaylistDragHandles;
  playlistLengthSettings: PlaylistLengthSettings;
  sessionSkippedIds: ReadonlySet<number>;
  playingSongId: number | null;
  /** True when transport is actually outputting audio (not just queued). */
  isPlaying: boolean;
  /** Song id currently queued as On Deck (yellow title prefix in playlist). */
  onDeckSongId: number | null;
  /** Year column slot shows Year or Plays (same grid width). */
  yearColumnMode: PlaylistYearColumnMode;
  /** songId → display play count for the Plays mode. */
  playCountsBySongId: ReadonlyMap<number, number>;
  onToggleYearPlaysColumn: () => void;
};

function skippedValueClass(song: SongRow, sessionSkippedIds: ReadonlySet<number>): string {
  return isSongSkippedForPlaylist(song, sessionSkippedIds) ? ' playlist-skipped-value' : '';
}

function isLongSongCaution(song: SongRow, ctx: PlaylistTableColumnContext): boolean {
  if (!ctx.playlistLengthSettings.cautionLongSongsEnabled) return false;
  if (song.unavailable === 1) return false;
  return isSongLongerThanMinutes(
    song,
    ctx.playlistLengthSettings.cautionMinutes,
    ctx.runtimeDurations,
  );
}

function songDurationLabel(song: SongRow, runtimeSeconds: number | undefined): string {
  if (song.unavailable === 1) return '';
  const seconds = song.duration_seconds ?? runtimeSeconds;
  return seconds != null && seconds > 0 ? formatTime(seconds) : '—';
}

function UnavailableLengthMarker() {
  return (
    <span
      className="unavailable-length-marker"
      aria-label="Unavailable"
      title="Unavailable — source could not be reached"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </span>
  );
}

function buildColumn(
  id: PlaylistColumnId,
  ctx: PlaylistTableColumnContext,
): ColumnDef<SongRow> {
  const className = playlistColumnClassName(id);
  const minSize = MIN_PLAYLIST_COLUMN_PX[id];

  const base = {
    id,
    minSize,
    meta: { className },
  };

  switch (id) {
    case 'order':
      return {
        ...base,
        header: () => (
          <SortableColumnHeader
            label="#"
            column="order"
            activeColumn={ctx.sortColumn}
            direction={ctx.sortDirection}
            onSort={ctx.onSort}
          />
        ),
        cell: ({ row }) => (
          <span className="playlist-order-cell">
            <button
              type="button"
              className="playlist-drag-handle"
              aria-label={`Drag to reorder ${row.original.title}`}
              onPointerDown={(event) => {
                event.stopPropagation();
                ctx.playlistDrag.startDrag(row.original.id, row.index, event.pointerId);
              }}
            >
              <span aria-hidden="true">⋮⋮</span>
            </button>
            {isSongSkippedForPlaylist(row.original, ctx.sessionSkippedIds) ? <SkippedSongMarker /> : null}
            <span className={`playlist-order-index${skippedValueClass(row.original, ctx.sessionSkippedIds)}`}>
              {ctx.catalogOrderBySongId.get(row.original.id) ?? '—'}
            </span>
          </span>
        ),
      };
    case 'custom':
      return {
        ...base,
        header: () => (
          <SortableColumnHeader
            label="*"
            column="custom"
            activeColumn={ctx.sortColumn}
            direction={ctx.sortDirection}
            onSort={ctx.onSort}
            disabled={!ctx.hasCustomOrder}
          />
        ),
        cell: ({ row }) => (
          <span className={`playlist-custom-index${skippedValueClass(row.original, ctx.sessionSkippedIds)}`}>
            {ctx.customOrderBySongId.get(row.original.id) ?? '—'}
          </span>
        ),
      };
    case 'title':
      return {
        ...base,
        header: () => (
          <SortableColumnHeader
            label="Title"
            column="title"
            activeColumn={ctx.sortColumn}
            direction={ctx.sortDirection}
            onSort={ctx.onSort}
          />
        ),
        cell: ({ row }) => {
          const isNowPlaying = ctx.playingSongId != null && row.original.id === ctx.playingSongId;
          const isOnDeck = ctx.onDeckSongId != null && row.original.id === ctx.onDeckSongId;
          return (
            <span className="song-title-cell">
              {!ctx.isLikedPlaylist && row.original.id > 0 && ctx.likedSongIds.has(row.original.id) ? (
                <LikedSongIndicator />
              ) : null}
              <span
                className={`song-title-text${
                  row.original.unavailable === 1 ? ' unavailable-title' : ''
                }${skippedValueClass(row.original, ctx.sessionSkippedIds)}`}
                title={row.original.title}
              >
                {isOnDeck ? (
                  <>
                    <span className="playlist-on-deck-badge">On Deck</span>
                    {'\u00A0'}
                  </>
                ) : null}
                {isNowPlaying ? (
                  <>
                    <AnimatedSpeakerEmoji
                      className="now-playing-speaker-emoji"
                      animating={ctx.isPlaying}
                    />
                    {'\u00A0'}
                  </>
                ) : null}
                {row.original.title}
              </span>
            </span>
          );
        },
      };
    case 'artist':
      return {
        ...base,
        header: () => (
          <SortableColumnHeader
            label="Artist"
            column="artist"
            activeColumn={ctx.sortColumn}
            direction={ctx.sortDirection}
            onSort={ctx.onSort}
          />
        ),
        cell: ({ row }) => (
          <span
            className={skippedValueClass(row.original, ctx.sessionSkippedIds).trim() || undefined}
            title={row.original.artist_name || undefined}
          >
            {row.original.artist_name || '—'}
          </span>
        ),
      };
    case 'album':
      return {
        ...base,
        header: () => (
          <SortableColumnHeader
            label="Album"
            column="album"
            activeColumn={ctx.sortColumn}
            direction={ctx.sortDirection}
            onSort={ctx.onSort}
          />
        ),
        cell: ({ row }) => (
          <span
            className={skippedValueClass(row.original, ctx.sessionSkippedIds).trim() || undefined}
            title={row.original.album || undefined}
          >
            {row.original.album || '—'}
          </span>
        ),
      };
    case 'year': {
      const playsMode = ctx.yearColumnMode === 'plays';
      return {
        ...base,
        header: () => (
          <SortableColumnHeader
            label={playsMode ? 'Plays' : 'Year'}
            column={playsMode ? 'plays' : 'year'}
            activeColumn={ctx.sortColumn}
            direction={ctx.sortDirection}
            onSort={ctx.onSort}
            onDoubleClickAction={ctx.onToggleYearPlaysColumn}
            doubleClickTitle={
              playsMode ? 'Double-click to show Year' : 'Double-click to show Plays'
            }
          />
        ),
        cell: ({ row }) => {
          const skipped = skippedValueClass(row.original, ctx.sessionSkippedIds).trim() || undefined;
          if (playsMode) {
            const count = ctx.playCountsBySongId.get(row.original.id) ?? 0;
            return (
              <span className={skipped} title={`${count} plays`}>
                {count > 0 ? String(count) : '—'}
              </span>
            );
          }
          return (
            <span className={skipped}>{row.original.year || '—'}</span>
          );
        },
      };
    }
    case 'source':
      return {
        ...base,
        header: () => (
          <SortableColumnHeader
            label="SRC"
            ariaLabel="Source"
            column="source"
            activeColumn={ctx.sortColumn}
            direction={ctx.sortDirection}
            onSort={ctx.onSort}
            className="playlist-source-heading"
          />
        ),
        cell: ({ row }) => <PlaylistSongSourceCell song={row.original} />,
      };
    case 'duration':
      return {
        ...base,
        header: () => (
          <SortableColumnHeader
            column="length"
            activeColumn={ctx.sortColumn}
            direction={ctx.sortDirection}
            onSort={ctx.onSort}
            ariaLabel="Length"
          >
            <IconClock className="playlist-duration-header-icon" />
          </SortableColumnHeader>
        ),
        cell: ({ row }) => {
          if (row.original.unavailable === 1) {
            return <UnavailableLengthMarker />;
          }

          const label = songDurationLabel(row.original, ctx.runtimeDurations[row.original.id]);
          const caution = isLongSongCaution(row.original, ctx);

          return (
            <span
              className={`playlist-duration-value${caution ? ' playlist-duration-caution' : ''}${skippedValueClass(row.original, ctx.sessionSkippedIds)}`}
            >
              {label}
            </span>
          );
        },
      };
    default:
      return {
        ...base,
        header: () => null,
        cell: () => null,
      };
  }
}

/** TanStack column definitions for the active playlist layout profile. */
export function buildPlaylistTableColumns(ctx: PlaylistTableColumnContext): ColumnDef<SongRow>[] {
  const { profile } = ctx;
  const order: PlaylistColumnId[] =
    profile === 'catalog'
      ? ['order', 'custom', 'title', 'album', 'year', 'duration']
      : profile === 'virtual'
        ? ['order', 'custom', 'title', 'artist', 'album', 'year', 'duration']
        : ['order', 'custom', 'title', 'artist', 'album', 'year', 'source', 'duration'];

  return order.map((id) => buildColumn(id, ctx));
}
