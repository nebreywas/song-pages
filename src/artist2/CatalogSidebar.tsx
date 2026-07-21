/**
 * Left catalog library — flat column table with top filter/sort and expandable albums.
 */

import { useMemo, useState, type ReactNode } from 'react';

import type {
  Artist2AlbumTrackSummaries,
  Artist2CatalogObject,
  Artist2LibraryFilter,
  Artist2LibraryFilterKey,
  Artist2TrackSummary,
} from '@shared/artist2';

import {
  catalogObjectHasRecording,
  catalogTypeLabel,
  filterCatalogObjects,
  formatCatalogAddedDate,
  nextSortKeyForColumn,
  sortCatalogObjects,
  sortColumnFromKey,
  toggleLibraryFilter,
  type CatalogSortColumn,
  type CatalogSortKey,
} from './catalogSidebarUtils';
import {
  canInsertObject,
  insertActionLabel,
  type InsertContext,
} from './insertContext';

type CatalogCreateKind = 'song' | 'album' | 'playlist' | 'image' | 'text' | 'video' | 'audio';

type CatalogSidebarProps = {
  objects: Artist2CatalogObject[];
  objectById: Map<string, Artist2CatalogObject>;
  albumTrackSummaries: Artist2AlbumTrackSummaries;
  selectedId: string | null;
  filter: Artist2LibraryFilter;
  search: string;
  insertContext: InsertContext;
  /** Highlights Artist Profile when the artist editor is open. */
  artistProfileActive: boolean;
  createMenuOpen: boolean;
  onFilterChange: (filter: Artist2LibraryFilter) => void;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  onInsert: (object: Artist2CatalogObject) => void;
  onOpenArtistProfile: () => void;
  onOpenDeletedItems: () => void;
  onToggleCreateMenu: () => void;
  onCreate: (kind: CatalogCreateKind) => void;
};

/** Clickable catalog column header — toggles sort and shows the active direction. */
function SortHeader({
  column,
  label,
  className,
  activeColumn,
  direction,
  onSort,
}: {
  column: CatalogSortColumn;
  label: string;
  className: string;
  activeColumn: CatalogSortColumn;
  direction: 'asc' | 'desc';
  onSort: (column: CatalogSortColumn) => void;
}) {
  const active = activeColumn === column;
  return (
    <button
      type="button"
      role="columnheader"
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`a2-catalog-col-sort ${className}${active ? ' is-active' : ''}`}
      onClick={() => onSort(column)}
      title={`Sort by ${label}`}
    >
      <span className="a2-catalog-sort-label">{label}</span>
      <span className="a2-catalog-sort-arrow" aria-hidden="true">
        {active ? (direction === 'asc' ? '▲' : '▼') : ''}
      </span>
    </button>
  );
}

function CatalogTableRow({
  name,
  typeLabel,
  hasRecording,
  addedLabel,
  selected,
  canInsert,
  insertLabel,
  nested,
  expandSlot,
  onSelect,
  onInsert,
}: {
  name: string;
  typeLabel: string;
  hasRecording: boolean;
  addedLabel: string;
  selected: boolean;
  canInsert: boolean;
  insertLabel: string;
  nested?: boolean;
  expandSlot?: ReactNode;
  onSelect: () => void;
  onInsert?: () => void;
}) {
  return (
    <div
      className={`a2-catalog-table-row${selected ? ' is-selected' : ''}${nested ? ' is-nested' : ''}`}
    >
      <div className="a2-catalog-col-expand">{expandSlot ?? null}</div>
      <button type="button" className="a2-catalog-col-name" onClick={onSelect}>
        {name}
      </button>
      <span className="a2-catalog-col-type">{typeLabel}</span>
      <span
        className="a2-catalog-col-recording"
        title={hasRecording ? 'Has recording' : undefined}
        aria-label={hasRecording ? 'Has recording' : undefined}
      >
        {hasRecording ? '♫' : ''}
      </span>
      <span className="a2-catalog-col-added">{addedLabel}</span>
      <div className="a2-catalog-col-insert">
        {canInsert && onInsert ? (
          <button
            type="button"
            className="a2-insert-arrow"
            title={insertLabel}
            aria-label={insertLabel}
            onClick={onInsert}
          >
            →
          </button>
        ) : null}
      </div>
    </div>
  );
}

function NestedTrackRow({
  track,
  objectById,
  selectedId,
  insertContext,
  onSelect,
  onInsert,
}: {
  track: Artist2TrackSummary;
  objectById: Map<string, Artist2CatalogObject>;
  selectedId: string | null;
  insertContext: InsertContext;
  onSelect: (id: string) => void;
  onInsert: (object: Artist2CatalogObject) => void;
}) {
  const song = objectById.get(track.id);
  const memberKind = track.kind === 'album' || song?.kind === 'album' ? 'album' : 'song';
  const pseudoObject = (song ?? {
    id: track.id,
    kind: memberKind,
    name: track.name,
    createdAt: '',
  }) as Artist2CatalogObject;
  const canInsert = canInsertObject(pseudoObject, insertContext);

  return (
    <CatalogTableRow
      name={track.name}
      typeLabel={memberKind === 'album' ? 'Album' : 'Song'}
      hasRecording={catalogObjectHasRecording(song)}
      addedLabel={formatCatalogAddedDate(song?.createdAt)}
      selected={selectedId === track.id}
      canInsert={canInsert}
      insertLabel={insertActionLabel(pseudoObject, insertContext)}
      nested
      onSelect={() => onSelect(track.id)}
      onInsert={() => onInsert(pseudoObject)}
    />
  );
}

export function CatalogSidebar({
  objects,
  objectById,
  albumTrackSummaries,
  selectedId,
  filter,
  search,
  insertContext,
  artistProfileActive,
  createMenuOpen,
  onFilterChange,
  onSearchChange,
  onSelect,
  onInsert,
  onOpenArtistProfile,
  onOpenDeletedItems,
  onToggleCreateMenu,
  onCreate,
}: CatalogSidebarProps) {
  const [sortKey, setSortKey] = useState<CatalogSortKey>('name-asc');
  const [expandedAlbumIds, setExpandedAlbumIds] = useState<Set<string>>(() => new Set());

  const visibleRows = useMemo(() => {
    // Kind filter first, then name search within that subset.
    const filtered = filterCatalogObjects(objects, filter, search);
    return sortCatalogObjects(filtered, sortKey);
  }, [objects, filter, search, sortKey]);

  function handleFilterToggle(key: Artist2LibraryFilterKey) {
    onFilterChange(toggleLibraryFilter(filter, key));
  }

  const activeSort = sortColumnFromKey(sortKey);

  function handleSortColumn(column: CatalogSortColumn) {
    setSortKey((prev) => nextSortKeyForColumn(column, prev));
  }

  function toggleContainer(containerId: string) {
    setExpandedAlbumIds((prev) => {
      const next = new Set(prev);
      if (next.has(containerId)) next.delete(containerId);
      else next.add(containerId);
      return next;
    });
  }

  function renderObjectRow(obj: Artist2CatalogObject) {
    const canInsert = canInsertObject(obj, insertContext);
    const insertLabel = insertActionLabel(obj, insertContext);
    const isContainer = obj.kind === 'album' || obj.kind === 'playlist';
    const expanded = isContainer && expandedAlbumIds.has(obj.id);
    const containerWord = obj.kind === 'playlist' ? 'playlist' : 'album';

    return (
      <li key={obj.id} className="a2-catalog-item">
        <CatalogTableRow
          name={obj.name}
          typeLabel={catalogTypeLabel(obj)}
          hasRecording={catalogObjectHasRecording(obj)}
          addedLabel={formatCatalogAddedDate(obj.createdAt)}
          selected={selectedId === obj.id}
          canInsert={canInsert}
          insertLabel={insertLabel}
          expandSlot={
            isContainer ? (
              <button
                type="button"
                className="a2-album-expand"
                aria-expanded={expanded}
                aria-label={expanded ? `Collapse ${containerWord}` : `Expand ${containerWord}`}
                onClick={() => toggleContainer(obj.id)}
              >
                {expanded ? '▾' : '▸'}
              </button>
            ) : null
          }
          onSelect={() => onSelect(obj.id)}
          onInsert={() => onInsert(obj)}
        />
        {isContainer && expanded ? (
          <ul className="a2-nested-list">
            {(albumTrackSummaries[obj.id] ?? []).length === 0 ? (
              <li className="a2-nested-empty">
                No {obj.kind === 'playlist' ? 'music' : 'tracks'} in this {containerWord} yet.
              </li>
            ) : (
              (albumTrackSummaries[obj.id] ?? []).map((track) => (
                <li key={`${obj.id}-${track.id}`}>
                  <NestedTrackRow
                    track={track}
                    objectById={objectById}
                    selectedId={selectedId}
                    insertContext={insertContext}
                    onSelect={onSelect}
                    onInsert={onInsert}
                  />
                </li>
              ))
            )}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <aside className="a2-sidebar">
      {/* Catalog-scoped actions live above search so the top bar stays artist/compile only. */}
      <div className="a2-sidebar-actions">
        <button
          type="button"
          className={artistProfileActive ? 'is-active' : undefined}
          onClick={onOpenArtistProfile}
        >
          Artist Profile
        </button>
        <button type="button" onClick={onOpenDeletedItems}>
          Deleted Items
        </button>
        <div className="a2-create-wrap">
          <button type="button" onClick={onToggleCreateMenu}>
            Add…
          </button>
          {createMenuOpen ? (
            <div className="a2-create-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => onCreate('song')}>
                Song
              </button>
              <button type="button" role="menuitem" onClick={() => onCreate('album')}>
                Container · Album
              </button>
              <button type="button" role="menuitem" onClick={() => onCreate('playlist')}>
                Container · Playlist
              </button>
              <button type="button" role="menuitem" onClick={() => onCreate('image')}>
                Content · Image
              </button>
              <button type="button" role="menuitem" onClick={() => onCreate('video')}>
                Content · Video
              </button>
              <button type="button" role="menuitem" onClick={() => onCreate('audio')}>
                Content · Audio
              </button>
              <button type="button" role="menuitem" onClick={() => onCreate('text')}>
                Content · Text
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="a2-sidebar-controls">
        <div className="a2-sidebar-filter-toggles" role="group" aria-label="Catalog filter">
          {(
            [
              ['all', 'All'],
              ['songs', 'Songs'],
              ['containers', 'Containers'],
              ['content', 'Content'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={filter[key] ? 'is-active' : undefined}
              aria-pressed={filter[key]}
              onClick={() => handleFilterToggle(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="search"
          className="a2-sidebar-search-input"
          placeholder="Search catalog…"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="Search catalog"
        />
      </div>

      <div className="a2-catalog-table">
        {/* Column headers double as sort toggles (click to sort, click again to flip). */}
        <div className="a2-catalog-table-head" role="row">
          <span className="a2-catalog-col-expand" />
          <SortHeader
            column="name"
            label="Name"
            className="a2-catalog-col-name"
            activeColumn={activeSort.column}
            direction={activeSort.direction}
            onSort={handleSortColumn}
          />
          <SortHeader
            column="type"
            label="Type"
            className="a2-catalog-col-type"
            activeColumn={activeSort.column}
            direction={activeSort.direction}
            onSort={handleSortColumn}
          />
          <span className="a2-catalog-col-recording" title="Recording">
            R
          </span>
          <SortHeader
            column="added"
            label="Added"
            className="a2-catalog-col-added"
            activeColumn={activeSort.column}
            direction={activeSort.direction}
            onSort={handleSortColumn}
          />
          <span className="a2-catalog-col-insert" />
        </div>

        <div className="a2-catalog-list">
          {visibleRows.length === 0 ? (
            <p className="a2-empty-hint a2-catalog-empty">Nothing in this catalog yet.</p>
          ) : (
            <ul>{visibleRows.map((obj) => renderObjectRow(obj))}</ul>
          )}
        </div>
      </div>
    </aside>
  );
}
