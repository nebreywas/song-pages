import type { SortColumn, SortDirection } from './sortPlaylist';

type SortableColumnHeaderProps = {
  label: string;
  column: SortColumn;
  activeColumn: SortColumn;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
  className?: string;
};

/** Clickable playlist column header — toggles asc/desc on repeat clicks. */
export function SortableColumnHeader({
  label,
  column,
  activeColumn,
  direction,
  onSort,
  className,
}: SortableColumnHeaderProps) {
  const isActive = column === activeColumn;
  const ariaSort = isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none';

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
