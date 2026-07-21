import { useRef, type ReactNode } from 'react';

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
  /**
   * Optional double-click / double-tap action (Year↔Plays). When set:
   * - single click → sort (after a short delay)
   * - fast double-click → column mode flip (sort is cancelled)
   * - click, pause, click → two separate sorts (e.g. asc then desc)
   */
  onDoubleClickAction?: () => void;
  doubleClickTitle?: string;
};

/** Long enough that a deliberate pause between taps is two sorts, not a mode flip. */
const DOUBLE_CLICK_SORT_DELAY_MS = 320;

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
  onDoubleClickAction,
  doubleClickTitle,
}: SortableColumnHeaderProps) {
  const isActive = column === activeColumn;
  const ariaSort = isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none';
  const content = children ?? label;
  const accessibleName = ariaLabel ?? label ?? '';
  const pendingSortTimerRef = useRef<number | null>(null);

  if (disabled) {
    return (
      <span className={`sort-header-label sort-header-label-disabled${className ? ` ${className}` : ''}`}>
        {content}
      </span>
    );
  }

  const clearPendingSort = () => {
    if (pendingSortTimerRef.current != null) {
      window.clearTimeout(pendingSortTimerRef.current);
      pendingSortTimerRef.current = null;
    }
  };

  return (
    <button
      type="button"
      className={`sort-header-btn${isActive ? ' active' : ''}${className ? ` ${className}` : ''}`}
      aria-sort={ariaSort}
      aria-label={children ? accessibleName : undefined}
      title={doubleClickTitle}
      onClick={(event) => {
        if (!onDoubleClickAction) {
          onSort(column);
          return;
        }
        // detail > 1 is the 2nd click of a double-tap — never schedule sort for it.
        if (event.detail > 1) {
          clearPendingSort();
          return;
        }
        clearPendingSort();
        pendingSortTimerRef.current = window.setTimeout(() => {
          pendingSortTimerRef.current = null;
          onSort(column);
        }, DOUBLE_CLICK_SORT_DELAY_MS);
      }}
      onDoubleClick={(event) => {
        if (!onDoubleClickAction) return;
        event.preventDefault();
        clearPendingSort();
        onDoubleClickAction();
      }}
    >
      {content}
    </button>
  );
}
