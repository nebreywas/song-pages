import type {
  SidebarLibrarySortColumn,
  SidebarLibrarySortDirection,
} from '@shared/listener/sidebarLibraryOrder';

type LibrarySortHeaderProps = {
  label: string;
  column: SidebarLibrarySortColumn;
  activeColumn: SidebarLibrarySortColumn;
  direction: SidebarLibrarySortDirection;
  onSort: (column: SidebarLibrarySortColumn) => void;
  className?: string;
  align?: 'left' | 'right';
};

/** Clickable sidebar library column label — toggles asc/desc on repeat clicks. */
export function LibrarySortHeader({
  label,
  column,
  activeColumn,
  direction,
  onSort,
  className,
  align = 'left',
}: LibrarySortHeaderProps) {
  const isActive = column === activeColumn;

  return (
    <button
      type="button"
      className={`library-sort-header-btn${className ? ` ${className}` : ''}${isActive ? ' active' : ''}${align === 'right' ? ' align-right' : ''}`}
      aria-sort={isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      onClick={() => onSort(column)}
    >
      {label}
    </button>
  );
}
