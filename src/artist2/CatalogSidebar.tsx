/**
 * Left catalog library — flat column table with top filter/sort and expandable albums.
 */

import { useMemo, useState, type ReactNode } from 'react';

import type {
  Artist2AlbumTrackSummaries,
  Artist2CatalogObject,
  Artist2LibraryFilter,
  Artist2TrackSummary,
} from '@shared/artist2';

import {
  catalogTypeLabel,
  filterCatalogObjects,
  formatCatalogAddedDate,
  sortCatalogObjects,
  type CatalogSortKey,
} from './catalogSidebarUtils';
import {
  canInsertObject,
  insertActionLabel,
  type InsertContext,
} from './insertContext';

type CatalogSidebarProps = {
  objects: Artist2CatalogObject[];
  objectById: Map<string, Artist2CatalogObject>;
  albumTrackSummaries: Artist2AlbumTrackSummaries;
  selectedId: string | null;
  filter: Artist2LibraryFilter;
  search: string;
  insertContext: InsertContext;
  onFilterChange: (filter: Artist2LibraryFilter) => void;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  onInsert: (object: Artist2CatalogObject) => void;
};

function CatalogTableRow({
  name,
  typeLabel,
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
  const pseudoObject = (song ?? {
    id: track.id,
    kind: 'song',
    name: track.name,
    createdAt: '',
  }) as Artist2CatalogObject;
  const canInsert = canInsertObject(pseudoObject, insertContext);

  return (
    <CatalogTableRow
      name={track.name}
      typeLabel="Song"
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
  onFilterChange,
  onSearchChange,
  onSelect,
  onInsert,
}: CatalogSidebarProps) {
  const [sortKey, setSortKey] = useState<CatalogSortKey>('name-asc');
  const [expandedAlbumIds, setExpandedAlbumIds] = useState<Set<string>>(() => new Set());

  const visibleRows = useMemo(() => {
    const filtered = filterCatalogObjects(objects, filter);
    return sortCatalogObjects(filtered, sortKey);
  }, [objects, filter, sortKey]);

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
              <li className="a2-nested-empty">No tracks in this {containerWord} yet.</li>
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
      <div className="a2-sidebar-controls">
        <input
          type="search"
          className="a2-sidebar-search-input"
          placeholder="Search catalog…"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="Search catalog"
        />
        <div className="a2-sidebar-control-row">
          <label className="a2-sidebar-control">
            <span>Filter</span>
            <select value={filter} onChange={(event) => onFilterChange(event.target.value as Artist2LibraryFilter)}>
              <option value="all">All</option>
              <option value="songs">Songs</option>
              <option value="containers">Containers</option>
              <option value="content">Content</option>
            </select>
          </label>
          <label className="a2-sidebar-control">
            <span>Sort</span>
            <select value={sortKey} onChange={(event) => setSortKey(event.target.value as CatalogSortKey)}>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
              <option value="added-desc">Added (newest)</option>
              <option value="added-asc">Added (oldest)</option>
              <option value="type-asc">Type</option>
            </select>
          </label>
        </div>
      </div>

      <div className="a2-catalog-table">
        <div className="a2-catalog-table-head" aria-hidden="true">
          <span className="a2-catalog-col-expand" />
          <span className="a2-catalog-col-name">Name</span>
          <span className="a2-catalog-col-type">Type</span>
          <span className="a2-catalog-col-added">Added</span>
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
