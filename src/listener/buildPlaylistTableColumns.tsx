import type { ColumnDef } from '@tanstack/react-table';

import {
  MIN_PLAYLIST_COLUMN_PX,
  type PlaylistColumnId,
  type PlaylistLayoutProfile,
} from '@shared/listener/playlistColumnLayout';
import { isSongSkipped } from '@shared/listener/playlistKinds';
import type { SongRow } from '../types/app';
import { formatTime } from './formatTime';
import { LikedSongIndicator } from './LikedSongIndicator';
import { playlistColumnClassName } from './playlistColumnClasses';
import { PlaylistSongSourceCell } from './PlaylistSongSourceCell';
import { SkippedSongMarker } from './SkippedSongMarker';
import type { SortColumn, SortDirection } from './sortPlaylist';
import { SortableColumnHeader } from './SortableColumnHeader';
import type { usePlaylistDragReorder } from './usePlaylistDragReorder';

type PlaylistDrag = ReturnType<typeof usePlaylistDragReorder>;

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
  playlistDrag: PlaylistDrag;
};

function songDurationLabel(song: SongRow, runtimeSeconds: number | undefined): string {
  if (song.unavailable === 1) return '';
  const seconds = song.duration_seconds ?? runtimeSeconds;
  return seconds != null && seconds > 0 ? formatTime(seconds) : '—';
}

function UnavailableLengthMarker() {
  return (
    <span className="unavailable-length-marker" aria-label="Unavailable" title="Unavailable">
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
            {isSongSkipped(row.original) ? <SkippedSongMarker /> : null}
            <span className="playlist-order-index">
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
          <span className="playlist-custom-index">
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
        cell: ({ row }) => (
          <span className="song-title-cell">
            {!ctx.isLikedPlaylist && row.original.id > 0 && ctx.likedSongIds.has(row.original.id) ? (
              <LikedSongIndicator />
            ) : null}
            <span
              className={`song-title-text${
                row.original.unavailable === 1 || isSongSkipped(row.original)
                  ? ' unavailable-title'
                  : ''
              }`}
              title={row.original.title}
            >
              {row.original.title}
            </span>
          </span>
        ),
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
          <span title={row.original.artist_name || undefined}>{row.original.artist_name || '—'}</span>
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
          <span title={row.original.album || undefined}>{row.original.album || '—'}</span>
        ),
      };
    case 'year':
      return {
        ...base,
        header: () => (
          <SortableColumnHeader
            label="Year"
            column="year"
            activeColumn={ctx.sortColumn}
            direction={ctx.sortDirection}
            onSort={ctx.onSort}
          />
        ),
        cell: ({ row }) => row.original.year || '—',
      };
    case 'source':
      return {
        ...base,
        header: () => (
          <>
            <span className="playlist-source-heading playlist-source-heading--short">Src</span>
            <span className="playlist-source-heading playlist-source-heading--long">Source</span>
          </>
        ),
        cell: ({ row }) => <PlaylistSongSourceCell song={row.original} />,
        enableSorting: false,
      };
    case 'duration':
      return {
        ...base,
        header: () => (
          <SortableColumnHeader
            label="Length"
            column="length"
            activeColumn={ctx.sortColumn}
            direction={ctx.sortDirection}
            onSort={ctx.onSort}
          />
        ),
        cell: ({ row }) =>
          row.original.unavailable === 1 ? (
            <UnavailableLengthMarker />
          ) : (
            songDurationLabel(row.original, ctx.runtimeDurations[row.original.id])
          ),
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
