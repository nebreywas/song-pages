import { memo, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type Table,
} from '@tanstack/react-table';

import {
  playlistColumnResizeLabel,
  playlistGridCssVariables,
  playlistGridSlots,
  playlistGridTemplateColumns,
  type PlaylistColumnId,
  type PlaylistGridSlot,
  type PlaylistLayoutProfile,
} from '@shared/listener/playlistColumnLayout';
import { isSongSkippedForPlaylist } from '@shared/listener/playlistKinds';
import type { PlaylistLengthSettings } from '@shared/listener/playlistLengthSettings';
import { isSongLongerThanMinutes } from '@shared/listener/songDuration';
import type { SongRow } from '../types/app';
import { buildPlaylistTableColumns } from './buildPlaylistTableColumns';
import { PlaylistColumnResizeHandle } from './PlaylistColumnResizeHandle';
import { playlistColumnClassName } from './playlistColumnClasses';
import { IconClock } from './PlayerIcons';
import { SortableColumnHeader } from './SortableColumnHeader';
import type { SortColumn, SortDirection } from './sortPlaylist';
import type { usePlaylistDragReorder } from './usePlaylistDragReorder';

type PlaylistDrag = ReturnType<typeof usePlaylistDragReorder>;

type PlaylistTableProps = {
  songs: SongRow[];
  emptyMessage: string;
  profile: PlaylistLayoutProfile;
  columnOrder: PlaylistColumnId[];
  columnWidths: Record<string, number>;
  isResizing: boolean;
  isDragging: boolean;
  hasArtistCol: boolean;
  hasSourceCol: boolean;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  hasCustomOrder: boolean;
  resizeBetween: (
    leftId: PlaylistColumnId,
    rightId: PlaylistColumnId,
  ) => (event: React.PointerEvent<HTMLDivElement>) => void;
  playingSongId: number | null;
  previewSongId: number | null;
  scrollToSongId?: number | null;
  likedSongIds: Set<number>;
  isLikedPlaylist: boolean;
  catalogOrderBySongId: Map<number, number>;
  customOrderBySongId: Map<number, number>;
  runtimeDurations: Record<number, number>;
  playlistLengthSettings: PlaylistLengthSettings;
  sessionSkippedIds: ReadonlySet<number>;
  playlistDrag: PlaylistDrag;
  onRowClick: (song: SongRow) => void;
  onRowDoubleClick: (song: SongRow) => void;
  onRowContextMenu: (event: React.MouseEvent, song: SongRow) => void;
};

type PlaylistTableBodyProps = {
  table: Table<SongRow>;
  emptyMessage: string;
  gridStyle: CSSProperties;
  gridSlots: PlaylistGridSlot[];
  playingSongId: number | null;
  previewSongId: number | null;
  scrollToSongId?: number | null;
  playlistLengthSettings: PlaylistLengthSettings;
  sessionSkippedIds: ReadonlySet<number>;
  runtimeDurations: Record<number, number>;
  playlistDrag: PlaylistDrag;
  onRowClick: (song: SongRow) => void;
  onRowDoubleClick: (song: SongRow) => void;
  onRowContextMenu: (event: React.MouseEvent, song: SongRow) => void;
};

function playlistBodyPropsEqual(prev: PlaylistTableBodyProps, next: PlaylistTableBodyProps): boolean {
  return (
    prev.table.options.data === next.table.options.data &&
    prev.emptyMessage === next.emptyMessage &&
    prev.gridStyle.gridTemplateColumns === next.gridStyle.gridTemplateColumns &&
    prev.playingSongId === next.playingSongId &&
    prev.previewSongId === next.previewSongId &&
    prev.playlistLengthSettings === next.playlistLengthSettings &&
    prev.sessionSkippedIds === next.sessionSkippedIds &&
    prev.runtimeDurations === next.runtimeDurations &&
    prev.playlistDrag.draggingSongId === next.playlistDrag.draggingSongId &&
    prev.onRowClick === next.onRowClick &&
    prev.onRowDoubleClick === next.onRowDoubleClick &&
    prev.onRowContextMenu === next.onRowContextMenu
  );
}

const PlaylistTableBody = memo(function PlaylistTableBody({
  table,
  emptyMessage,
  gridStyle,
  gridSlots,
  playingSongId,
  previewSongId,
  playlistLengthSettings,
  sessionSkippedIds,
  runtimeDurations,
  playlistDrag,
  onRowClick,
  onRowDoubleClick,
  onRowContextMenu,
}: PlaylistTableBodyProps) {
  const rows = table.getRowModel().rows;

  if (!rows.length) {
    return <div className="playlist-grid-empty">{emptyMessage}</div>;
  }

  return (
    <div className="playlist-grid-body">
      {rows.map((row) => {
        const song = row.original;
        const dragClassName = playlistDrag.rowDragClassName(song.id, row.index);
        const cellsById = new Map(
          row.getVisibleCells().map((cell) => [cell.column.id as PlaylistColumnId, cell]),
        );

        const longSongCaution =
          playlistLengthSettings.cautionLongSongsEnabled &&
          song.unavailable !== 1 &&
          isSongLongerThanMinutes(song, playlistLengthSettings.cautionMinutes, runtimeDurations);

        return (
          <div
            key={row.id}
            data-song-id={song.id}
            ref={(node) => playlistDrag.setRowRef(row.index, node)}
            className={`playlist-grid-row song-row${song.id === playingSongId ? ' playing-row' : ''}${
              song.id === previewSongId ? ' selected-row' : ''
            }${song.unavailable === 1 ? ' unavailable-row' : ''}${
              isSongSkippedForPlaylist(song, sessionSkippedIds) ? ' skipped-row' : ''
            }${longSongCaution ? ' long-song-caution-row' : ''}${dragClassName ? ` ${dragClassName}` : ''}`}
            style={gridStyle}
            onClick={() => onRowClick(song)}
            onDoubleClick={() => onRowDoubleClick(song)}
            onContextMenu={(event) => onRowContextMenu(event, song)}
          >
            {gridSlots.map((slot) => {
              if (slot.kind === 'gutter') {
                return (
                  <div
                    key={`gutter-${slot.left}-${slot.right}`}
                    className="playlist-grid-gutter"
                    aria-hidden="true"
                  />
                );
              }

              const cell = cellsById.get(slot.id);
              const className =
                (cell?.column.columnDef.meta as { className?: string } | undefined)?.className ??
                playlistColumnClassName(slot.id);

              return (
                <div key={slot.id} className={`playlist-grid-cell ${className}`}>
                  {cell ? flexRender(cell.column.columnDef.cell, cell.getContext()) : null}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}, playlistBodyPropsEqual);

function renderHeaderCell(
  columnId: PlaylistColumnId,
  props: Pick<PlaylistTableProps, 'sortColumn' | 'sortDirection' | 'onSort' | 'hasCustomOrder'>,
) {
  switch (columnId) {
    case 'order':
      return (
        <SortableColumnHeader
          label="#"
          column="order"
          activeColumn={props.sortColumn}
          direction={props.sortDirection}
          onSort={props.onSort}
        />
      );
    case 'custom':
      return (
        <SortableColumnHeader
          label="*"
          column="custom"
          activeColumn={props.sortColumn}
          direction={props.sortDirection}
          onSort={props.onSort}
          disabled={!props.hasCustomOrder}
        />
      );
    case 'title':
      return (
        <SortableColumnHeader
          label="Title"
          column="title"
          activeColumn={props.sortColumn}
          direction={props.sortDirection}
          onSort={props.onSort}
        />
      );
    case 'artist':
      return (
        <SortableColumnHeader
          label="Artist"
          column="artist"
          activeColumn={props.sortColumn}
          direction={props.sortDirection}
          onSort={props.onSort}
        />
      );
    case 'album':
      return (
        <SortableColumnHeader
          label="Album"
          column="album"
          activeColumn={props.sortColumn}
          direction={props.sortDirection}
          onSort={props.onSort}
        />
      );
    case 'year':
      return (
        <SortableColumnHeader
          label="Year"
          column="year"
          activeColumn={props.sortColumn}
          direction={props.sortDirection}
          onSort={props.onSort}
        />
      );
    case 'source':
      return (
        <SortableColumnHeader
          label="SRC"
          ariaLabel="Source"
          column="source"
          activeColumn={props.sortColumn}
          direction={props.sortDirection}
          onSort={props.onSort}
          className="playlist-source-heading"
        />
      );
    case 'duration':
      return (
        <SortableColumnHeader
          column="length"
          activeColumn={props.sortColumn}
          direction={props.sortDirection}
          onSort={props.onSort}
          ariaLabel="Length"
        >
          <IconClock className="playlist-duration-header-icon" />
        </SortableColumnHeader>
      );
    default:
      return null;
  }
}

/** Playlist grid — TanStack for cells, dedicated gutter columns for resize handles. */
export function PlaylistTable({
  songs,
  emptyMessage,
  profile,
  columnOrder,
  columnWidths,
  isResizing,
  isDragging,
  hasArtistCol,
  hasSourceCol,
  sortColumn,
  sortDirection,
  onSort,
  hasCustomOrder,
  resizeBetween,
  playingSongId,
  previewSongId,
  scrollToSongId = null,
  likedSongIds,
  isLikedPlaylist,
  catalogOrderBySongId,
  customOrderBySongId,
  runtimeDurations,
  playlistLengthSettings,
  sessionSkippedIds,
  playlistDrag,
  onRowClick,
  onRowDoubleClick,
  onRowContextMenu,
}: PlaylistTableProps) {
  const { startDrag, setRowRef } = playlistDrag;
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollToSongId == null) return;
    const row = gridRef.current?.querySelector(`[data-song-id="${scrollToSongId}"]`);
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [scrollToSongId, songs]);

  const columns = useMemo(
    () =>
      buildPlaylistTableColumns({
        profile,
        sortColumn,
        sortDirection,
        onSort,
        hasCustomOrder,
        isLikedPlaylist,
        likedSongIds,
        catalogOrderBySongId,
        customOrderBySongId,
        runtimeDurations,
        playlistDrag: { startDrag, setRowRef },
        playlistLengthSettings,
        sessionSkippedIds,
      }),
    [
      profile,
      sortColumn,
      sortDirection,
      onSort,
      hasCustomOrder,
      isLikedPlaylist,
      likedSongIds,
      catalogOrderBySongId,
      customOrderBySongId,
      runtimeDurations,
      playlistLengthSettings,
      sessionSkippedIds,
      startDrag,
      setRowRef,
    ],
  );

  const table = useReactTable({
    data: songs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
  });

  const gridSlots = useMemo(() => playlistGridSlots(columnOrder), [columnOrder]);
  const gridStyle = useMemo(
    () => ({
      gridTemplateColumns: playlistGridTemplateColumns(
        columnOrder,
        columnWidths as Record<PlaylistColumnId, number>,
      ),
      ...playlistGridCssVariables(columnOrder, columnWidths as Record<PlaylistColumnId, number>),
    }),
    [columnOrder, columnWidths],
  );

  return (
    <div
      ref={gridRef}
      className={`playlist-grid${isDragging ? ' is-dragging-playlist' : ''}${
        isResizing ? ' is-resizing-columns' : ''
      }${hasArtistCol ? ' has-artist-col' : ' no-artist-col'}${hasSourceCol ? ' has-source-col' : ''}`}
      role="table"
    >
      <div className="playlist-grid-header" style={gridStyle} role="row">
        {gridSlots.map((slot) => {
          if (slot.kind === 'gutter') {
            return (
              <div
                key={`gutter-${slot.left}-${slot.right}`}
                className="playlist-grid-gutter"
                role="separator"
                aria-orientation="vertical"
              >
                <PlaylistColumnResizeHandle
                  label={playlistColumnResizeLabel(slot.left, slot.right)}
                  onPointerDown={resizeBetween(slot.left, slot.right)}
                />
              </div>
            );
          }

          const className = playlistColumnClassName(slot.id);
          return (
            <div
              key={slot.id}
              className={`playlist-grid-cell playlist-grid-header-cell ${className}${
                slot.id === 'custom' && !hasCustomOrder ? ' is-disabled' : ''
              }`}
              role="columnheader"
            >
              {renderHeaderCell(slot.id, {
                sortColumn,
                sortDirection,
                onSort,
                hasCustomOrder,
              })}
            </div>
          );
        })}
      </div>
      <PlaylistTableBody
        table={table}
        emptyMessage={emptyMessage}
        gridStyle={gridStyle}
        gridSlots={gridSlots}
        playingSongId={playingSongId}
        previewSongId={previewSongId}
        playlistLengthSettings={playlistLengthSettings}
        sessionSkippedIds={sessionSkippedIds}
        runtimeDurations={runtimeDurations}
        playlistDrag={playlistDrag}
        onRowClick={onRowClick}
        onRowDoubleClick={onRowDoubleClick}
        onRowContextMenu={onRowContextMenu}
      />
    </div>
  );
}
