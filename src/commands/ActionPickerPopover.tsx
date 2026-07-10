import { useMemo, useState } from 'react';

import type { CommandDefinition } from '@shared/commands';

import { CommandDisplayLabel } from './CommandDisplayLabel';

type ActionPickerPopoverProps = {
  commands: CommandDefinition[];
  selectedCommandId?: string;
  onAssign: (command: CommandDefinition) => void;
  heading?: string;
};

/** Scrollable action catalog — single click previews, double click assigns. */
export function ActionPickerPopover({
  commands,
  selectedCommandId,
  onAssign,
  heading = 'Choose action',
}: ActionPickerPopoverProps) {
  const [previewId, setPreviewId] = useState(selectedCommandId ?? commands[0]?.id ?? '');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (row) =>
        row.label.toLowerCase().includes(q) ||
        row.id.toLowerCase().includes(q) ||
        row.category.toLowerCase().includes(q),
    );
  }, [commands, query]);

  const preview = filtered.find((row) => row.id === previewId) ?? filtered[0];

  return (
    <div className="action-picker">
      <div className="action-picker-header">
        <h4 className="action-picker-title">{heading}</h4>
        <input
          type="search"
          className="action-picker-search"
          placeholder="Search actions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <ul className="action-picker-list" role="listbox" aria-label="Actions">
        {filtered.map((command) => (
          <li key={command.id}>
            <button
              type="button"
              role="option"
              aria-selected={preview?.id === command.id}
              className={`action-picker-item${preview?.id === command.id ? ' is-selected' : ''}`}
              onClick={() => setPreviewId(command.id)}
              onDoubleClick={() => onAssign(command)}
            >
              <span className="action-picker-item-label">
                <CommandDisplayLabel label={command.label} />
              </span>
              <span className="action-picker-item-meta">{command.category}</span>
            </button>
          </li>
        ))}
        {filtered.length === 0 ? <li className="action-picker-empty">No matching actions.</li> : null}
      </ul>

      {preview ? (
        <div className="action-picker-about">
          <strong>
            <CommandDisplayLabel label={preview.label} />
          </strong>
          <p>{preview.description ?? 'No description provided for this action yet.'}</p>
          <p className="action-picker-about-id">{preview.id}</p>
          <p className="action-picker-hint">Double-click an action to assign it.</p>
        </div>
      ) : null}
    </div>
  );
}
