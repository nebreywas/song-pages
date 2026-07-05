/**
 * Host Content Manager — inventory and editors for the host content catalog.
 */

import { useEffect, useMemo, useState } from 'react';

import {
  contentTypeLabel,
  createHostContentItem,
  fallbackDisplayName,
  HOST_CONTENT_TYPE_LABELS,
  HOST_FALLBACK_SLOT_IDS,
  HOST_FONT_SIZE_IDS,
  HOST_FONT_SIZE_LABELS,
  HOST_FONT_STYLE_IDS,
  HOST_FONT_STYLE_LABELS,
  listItemsByType,
  normalizeHostContentName,
  userHostContentItems,
  validateHostContentName,
  type HostContentCatalog,
  type HostContentItem,
  type HostContentType,
  type HostFallbackItem,
} from '@shared/hostContent';

import { getApp } from '../../lib/bridge';
import { HostContentPreview } from './HostContentPreview';
import { useHostContentCatalog } from './useHostContentCatalog';

type SortKey = 'name' | 'type' | 'date' | 'filesize';
type SortDirection = 'asc' | 'desc';

type ManagerSection = 'content' | 'fallbacks';

const ADD_TYPES = Object.entries(HOST_CONTENT_TYPE_LABELS) as Array<
  [Exclude<HostContentType, 'fallback'>, string]
>;

function sortContentRows(
  items: HostContentItem[],
  sortKey: SortKey,
  direction: SortDirection,
): HostContentItem[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    if (sortKey === 'type') {
      return factor * contentTypeLabel(a).localeCompare(contentTypeLabel(b));
    }
    if (sortKey === 'date') {
      return factor * a.updatedAt.localeCompare(b.updatedAt);
    }
    if (sortKey === 'filesize') {
      return factor * ((a.fileSizeBytes ?? 0) - (b.fileSizeBytes ?? 0));
    }
    return factor * a.name.localeCompare(b.name);
  });
}

function sortFallbackRows(
  items: HostFallbackItem[],
  sortKey: 'name' | 'date',
  direction: SortDirection,
): HostFallbackItem[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    if (sortKey === 'date') {
      return factor * a.updatedAt.localeCompare(b.updatedAt);
    }
    return factor * fallbackDisplayName(a).localeCompare(fallbackDisplayName(b));
  });
}

function defaultSortDirection(sortKey: SortKey): SortDirection {
  return sortKey === 'date' || sortKey === 'filesize' ? 'desc' : 'asc';
}

function InventorySortHeader({
  label,
  column,
  sortKey,
  sortDirection,
  onToggle,
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onToggle: (column: SortKey) => void;
}) {
  const active = sortKey === column;
  return (
    <button
      type="button"
      className={`hc-sort-btn${active ? ' is-active' : ''}`}
      aria-sort={active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
      onClick={() => onToggle(column)}
    >
      {label}
    </button>
  );
}

function orderedFallbackRows(catalog: HostContentCatalog): HostFallbackItem[] {
  const bySlot = new Map(
    catalog.items
      .filter((item): item is HostFallbackItem => item.type === 'fallback')
      .map((item) => [item.slotId, item]),
  );
  return HOST_FALLBACK_SLOT_IDS.map((slotId) => bySlot.get(slotId)).filter(
    (item): item is HostFallbackItem => item != null,
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DeleteListIcon() {
  return (
    <svg className="hc-delete-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 7h18" />
      <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
      <path d="M6 7h12l-1 12.5a1 1 0 0 1-1 .9H8a1 1 0 0 1-1-.9L6 7Z" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

function HostContentTypePicker({
  onPick,
  onClose,
}: {
  onPick: (type: Exclude<HostContentType, 'fallback'>) => void;
  onClose: () => void;
}) {
  return (
    <div className="hc-type-picker-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="hc-type-picker panel"
        role="dialog"
        aria-modal="true"
        aria-label="Choose content type"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="hc-type-picker-header">
          <h3>Add content type…</h3>
          <button type="button" className="vc-region-popover-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <ul className="hc-type-picker-list">
          {ADD_TYPES.map(([type, label]) => (
            <li key={type}>
              <button type="button" className="btn hc-type-picker-option" onClick={() => onPick(type)}>
                {label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function HostContentEditor({
  item,
  catalog,
  onChange,
}: {
  item: HostContentItem;
  catalog: HostContentCatalog;
  onChange: (patch: Partial<HostContentItem>) => void;
}) {
  const [importError, setImportError] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState(item.name);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    setNameDraft(item.name);
    setNameError(null);
  }, [item.id, item.name]);

  const pickMedia = async () => {
    if (item.type !== 'graphic' && item.type !== 'video') return;
    setImportError(null);
    const result = await getApp()?.hostContent?.pickAndImportMedia({
      kind: item.type === 'video' ? 'video' : 'graphic',
      itemId: item.id,
    });
    if (!result?.ok) {
      if (!result?.canceled) setImportError(result?.error ?? 'Import failed.');
      return;
    }
    onChange({
      mediaPath: result.mediaPath,
      widthPx: result.widthPx,
      heightPx: result.heightPx,
      fileSizeBytes: result.fileSizeBytes,
    });
  };

  const commitName = () => {
    const validationError = validateHostContentName(nameDraft);
    if (validationError) {
      setNameError(validationError);
      return;
    }
    const normalized = normalizeHostContentName(nameDraft);
    const duplicate = catalog.items.some(
      (entry) => entry.id !== item.id && entry.name === normalized,
    );
    if (duplicate) {
      setNameError('That name is already in use.');
      return;
    }
    setNameError(null);
    setNameDraft(normalized);
    if (normalized !== item.name) onChange({ name: normalized });
  };

  const nameField =
    item.type === 'fallback' ? null : (
      <label className="vc-field">
        <span>Name</span>
        <input
          type="text"
          className="hc-name-input"
          value={nameDraft}
          maxLength={24}
          onChange={(e) => {
            setNameDraft(e.target.value);
            setNameError(null);
          }}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitName();
            }
          }}
        />
        {nameError ? <p className="error hc-name-error">{nameError}</p> : null}
      </label>
    );

  if (item.type === 'fallback') {
    const isTextSlot =
      item.slotId === 'artist-name' ||
      item.slotId === 'song-title' ||
      item.slotId === 'main-genre' ||
      item.slotId === 'additional-genres';

    return (
      <div className="hc-editor-fields">
        <label className="vc-field vc-field-inline">
          <input
            type="checkbox"
            checked={item.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
          />
          <span>Use fallback when song data is missing</span>
        </label>
        <label className="vc-field vc-field-inline">
          <input
            type="checkbox"
            checked={item.resetToSystemDefault}
            onChange={(e) => onChange({ resetToSystemDefault: e.target.checked })}
          />
          <span>Reset to system default</span>
        </label>
        {isTextSlot ? (
          item.textFields?.map((value, index) => (
            <label key={index} className="vc-field">
              <span>Option {index + 1}</span>
              <input
                type="text"
                value={value}
                maxLength={item.slotId === 'additional-genres' ? 64 : 36}
                onChange={(e) => {
                  const next = [...(item.textFields ?? ['', '', '', ''])] as HostContentItem & {
                    textFields: [string, string, string, string];
                  }['textFields'];
                  next[index] = e.target.value;
                  onChange({ textFields: next });
                }}
              />
            </label>
          ))
        ) : (
          <label className="vc-field">
            <span>Linked content</span>
            <select
              value={item.linkedContentId ?? ''}
              onChange={(e) => onChange({ linkedContentId: e.target.value || null })}
            >
              <option value="">—</option>
              {listItemsByType(
                catalog,
                item.slotId === 'video-cover' ? 'video' : item.slotId === 'lyrics' || item.slotId === 'about-song' ? 'area-text' : 'graphic',
              ).map((linked) => (
                <option key={linked.id} value={linked.id}>
                  {linked.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    );
  }

  return (
    <div className="hc-editor-fields">
      {nameField}
      {importError ? <p className="error hc-import-error">{importError}</p> : null}

      {(item.type === 'graphic' || item.type === 'video') && (
        <button type="button" className="btn" onClick={() => void pickMedia()}>
          {item.mediaPath ? 'Replace file…' : 'Choose file…'}
        </button>
      )}

      {item.type === 'title-text' || item.type === 'area-text' ? (
        <>
          <label className="vc-field">
            <span>Text</span>
            <textarea
              value={item.text}
              maxLength={item.type === 'title-text' ? 36 : 1000}
              rows={item.type === 'area-text' ? 8 : 3}
              onChange={(e) => onChange({ text: e.target.value })}
            />
          </label>
          <div className="hc-text-style-row">
            <label className="vc-field hc-compact-field">
              <span>Font style</span>
              <select
                value={item.fontStyle}
                onChange={(e) => onChange({ fontStyle: e.target.value as typeof item.fontStyle })}
              >
                {HOST_FONT_STYLE_IDS.map((styleId) => (
                  <option key={styleId} value={styleId}>
                    {HOST_FONT_STYLE_LABELS[styleId]}
                  </option>
                ))}
              </select>
            </label>
            <label className="vc-field hc-compact-field">
              <span>Font size</span>
              <select
                value={item.fontSize}
                onChange={(e) => onChange({ fontSize: e.target.value as typeof item.fontSize })}
              >
                {HOST_FONT_SIZE_IDS.map((sizeId) => (
                  <option key={sizeId} value={sizeId}>
                    {HOST_FONT_SIZE_LABELS[sizeId]}
                  </option>
                ))}
              </select>
            </label>
            <label className="vc-field hc-compact-field hc-color-field">
              <span>Color</span>
              <input type="color" value={item.color} onChange={(e) => onChange({ color: e.target.value })} />
            </label>
          </div>
          {item.type === 'title-text' ? (
            <label className="vc-field vc-field-inline">
              <input type="checkbox" checked={item.allCaps} onChange={(e) => onChange({ allCaps: e.target.checked })} />
              <span>All caps</span>
            </label>
          ) : (
            <label className="vc-field vc-field-inline">
              <input
                type="checkbox"
                checked={!item.markdownSource}
                onChange={(e) => onChange({ markdownSource: !e.target.checked })}
              />
              <span>Always plain text</span>
            </label>
          )}
        </>
      ) : null}

      {item.type === 'graphics-group' ? (
        <div className="hc-group-members">
          <p className="hc-group-hint">Select graphics in this group:</p>
          {listItemsByType(catalog, 'graphic').map((graphic) => {
            const checked = item.memberIds.includes(graphic.id);
            return (
              <label key={graphic.id} className="hc-group-member">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const memberIds = e.target.checked
                      ? [...item.memberIds, graphic.id]
                      : item.memberIds.filter((id) => id !== graphic.id);
                    onChange({ memberIds });
                  }}
                />
                <span>{graphic.name}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function HostContentManager() {
  const { catalog, loading, selectedId, selectedItem, setSelectedId, replaceCatalog, updateItem } =
    useHostContentCatalog();
  const [section, setSection] = useState<ManagerSection>('content');
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const toggleSort = (column: SortKey) => {
    if (sortKey === column) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(column);
    setSortDirection(defaultSortDirection(column));
  };

  const contentRows = useMemo(
    () => sortContentRows(userHostContentItems(catalog), sortKey, sortDirection),
    [catalog, sortKey, sortDirection],
  );

  const fallbackRows = useMemo(() => {
    const rows = orderedFallbackRows(catalog);
    if (sortKey === 'date') return sortFallbackRows(rows, 'date', sortDirection);
    if (sortKey === 'name') return sortFallbackRows(rows, 'name', sortDirection);
    return rows;
  }, [catalog, sortKey, sortDirection]);

  const displayRows = section === 'content' ? contentRows : fallbackRows;

  const userItems = useMemo(() => userHostContentItems(catalog), [catalog]);

  const selectedForSection =
    selectedItem &&
    (section === 'content'
      ? selectedItem.type !== 'fallback'
      : selectedItem.type === 'fallback')
      ? selectedItem
      : null;

  const openFallbacks = () => {
    setSection('fallbacks');
    setTypePickerOpen(false);
    if (selectedItem?.type !== 'fallback') {
      setSelectedId(fallbackRows[0]?.id ?? null);
    }
  };

  const openContent = () => {
    setSection('content');
    setTypePickerOpen(false);
    if (selectedItem?.type === 'fallback') {
      setSelectedId(null);
    }
  };

  const addItem = (type: Exclude<HostContentType, 'fallback'>) => {
    const names = new Set(catalog.items.map((item) => item.name));
    const item = createHostContentItem(type, names);
    replaceCatalog((current) => ({
      ...current,
      items: [...current.items, item],
    }));
    setSelectedId(item.id);
    setTypePickerOpen(false);
  };

  const deleteItem = async (item: HostContentItem) => {
    if (item.type === 'fallback') return;
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    if ((item.type === 'graphic' || item.type === 'video') && item.mediaPath) {
      await getApp()?.hostContent?.deleteMedia(item.mediaPath);
    }
    replaceCatalog((current) => ({
      ...current,
      items: current.items.filter((entry) => entry.id !== item.id),
    }));
    if (selectedId === item.id) setSelectedId(null);
  };

  if (loading) {
    return <div className="hc-manager-loading">Loading host content…</div>;
  }

  return (
    <div className="hc-manager">
      <div className="hc-manager-toolbar">
        <div className="hc-manager-toolbar-actions">
          <button
            type="button"
            className="btn hc-primary-action-btn"
            onClick={() => {
              if (section === 'content') setTypePickerOpen(true);
              else openContent();
            }}
          >
            {section === 'content' ? 'Add content…' : 'Content'}
          </button>
          <button
            type="button"
            className={`btn${section === 'fallbacks' ? ' is-active' : ''}`}
            aria-pressed={section === 'fallbacks'}
            onClick={openFallbacks}
          >
            Fallbacks
          </button>
        </div>
        <p className="hc-manager-meta">
          {section === 'content'
            ? `${userItems.length} custom item(s)`
            : `${fallbackRows.length} fallback slot(s)`}
        </p>
      </div>

      <div className="hc-inventory-wrap">
        <table className="hc-inventory">
          <thead>
            <tr>
              <th>
                <InventorySortHeader
                  label="Name"
                  column="name"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onToggle={toggleSort}
                />
              </th>
              {section === 'content' ? (
                <>
                  <th>
                    <InventorySortHeader
                      label="Type"
                      column="type"
                      sortKey={sortKey}
                      sortDirection={sortDirection}
                      onToggle={toggleSort}
                    />
                  </th>
                  <th>
                    <InventorySortHeader
                      label="Date"
                      column="date"
                      sortKey={sortKey}
                      sortDirection={sortDirection}
                      onToggle={toggleSort}
                    />
                  </th>
                  <th>
                    <InventorySortHeader
                      label="Filesize"
                      column="filesize"
                      sortKey={sortKey}
                      sortDirection={sortDirection}
                      onToggle={toggleSort}
                    />
                  </th>
                  <th aria-label="Actions" />
                </>
              ) : (
                <>
                  <th>Type</th>
                  <th>
                    <InventorySortHeader
                      label="Date"
                      column="date"
                      sortKey={sortKey}
                      sortDirection={sortDirection}
                      onToggle={toggleSort}
                    />
                  </th>
                  <th aria-label="Actions" />
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 ? (
              <tr>
                <td colSpan={section === 'content' ? 5 : 4} className="hc-inventory-empty">
                  {section === 'content'
                    ? 'No custom content yet. Use Add content… to create your first item.'
                    : 'No fallback slots found.'}
                </td>
              </tr>
            ) : (
              displayRows.map((item) => {
                const selected = item.id === selectedId;
                const displayName =
                  item.type === 'fallback' ? fallbackDisplayName(item) : item.name;
                return (
                  <tr
                    key={item.id}
                    className={selected ? 'is-selected' : undefined}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <td>{displayName}</td>
                    {section === 'content' ? (
                      <>
                        <td>{contentTypeLabel(item)}</td>
                        <td>{formatDate(item.updatedAt)}</td>
                        <td>{formatFileSize(item.fileSizeBytes)}</td>
                        <td>
                          <button
                            type="button"
                            className="hc-delete-btn"
                            aria-label={`Delete ${item.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              void deleteItem(item);
                            }}
                          >
                            <DeleteListIcon />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{contentTypeLabel(item)}</td>
                        <td>{formatDate(item.updatedAt)}</td>
                        <td />
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="hc-workspace">
        <div className="hc-pane-column">
          <h3 className="hc-pane-title">Settings</h3>
          <div className="hc-edit-pane">
            {selectedForSection ? (
              <HostContentEditor
                item={selectedForSection}
                catalog={catalog}
                onChange={(patch) => void updateItem(selectedForSection.id, patch)}
              />
            ) : (
              <p className="hc-pane-empty">
                {section === 'content'
                  ? 'Select an item from the list to edit.'
                  : 'Select a fallback slot to edit.'}
              </p>
            )}
          </div>
        </div>
        <div className="hc-pane-column">
          <h3 className="hc-pane-title">Preview</h3>
          <div className="hc-preview-pane">
            {selectedForSection ? (
              <HostContentPreview item={selectedForSection} catalog={catalog} />
            ) : (
              <p className="hc-pane-empty">
                {section === 'content'
                  ? 'Select an item from the list to preview.'
                  : 'Select a fallback slot to preview.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {section === 'content' && typePickerOpen ? (
        <HostContentTypePicker onPick={addItem} onClose={() => setTypePickerOpen(false)} />
      ) : null}
    </div>
  );
}
