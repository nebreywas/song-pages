import type { SortColumn, SortDirection } from './sortPlaylist';

type SortableColumnHeaderProps = {
  label: string;
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
  column,
  activeColumn,
  direction,
  onSort,
  className,
  disabled = false,
}: SortableColumnHeaderProps) {
  const isActive = column === activeColumn;
  const ariaSort = isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none';

  if (disabled) {
    return (
      <th className={`${className ?? ''} is-disabled`.trim()} aria-sort="none">
        <span className="sort-header-label sort-header-label-disabled">{label}</span>
      </th>
    );
  }

  return (
    <th className={className} aria-sort={ariaSort}>
      <button
        type="button"
        className={`sort-header-btn${isActive ? ' active' : ''}`}
        onClick={() => onSort(column)}
      >
        {label}
      </button>
    </th>
  );
}
