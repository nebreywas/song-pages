import type { ReactNode } from 'react';

import type { SortColumn, SortDirection } from './sortPlaylist';

type SortableColumnHeaderProps = {
  label?: string;
  children?: ReactNode;
  ariaLabel?: string;
  column: SortColumn;
  activeColumn: SortColumn;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
  className?: string;
  /** Non-interactive header (e.g. * before a personal order exists). */
  disabled?: boolean;
};

/** Clickable playlist column header — toggles asc/desc on repeat clicks. */
export function SortableColumnHeader({
  label,
  children,
  ariaLabel,
  column,
  activeColumn,
  direction,
  onSort,
  disabled = false,
  className = '',
}: SortableColumnHeaderProps) {
  const isActive = column === activeColumn;
  const ariaSort = isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none';
  const content = children ?? label;
  const accessibleName = ariaLabel ?? label ?? '';

  if (disabled) {
    return (
      <span className={`sort-header-label sort-header-label-disabled${className ? ` ${className}` : ''}`}>
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`sort-header-btn${isActive ? ' active' : ''}${className ? ` ${className}` : ''}`}
      aria-sort={ariaSort}
      aria-label={children ? accessibleName : undefined}
      onClick={() => onSort(column)}
    >
      {content}
    </button>
  );
}
