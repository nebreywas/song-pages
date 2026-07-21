/**
 * Song Editor section with a chevron toggle beside the heading.
 * Collapse state is owned by the parent (persisted per-song via settings).
 */

import type { ReactNode } from 'react';

type CollapsibleSectionProps = {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
  /** Extra controls on the header row (e.g. Lyrics Write/Preview); hidden when collapsed. */
  headerTrailing?: ReactNode;
  /** Optional class on the h3 (e.g. white Lyrics label). */
  titleClassName?: string;
};

export function CollapsibleSection({
  title,
  collapsed,
  onToggle,
  children,
  className,
  headerTrailing,
  titleClassName,
}: CollapsibleSectionProps) {
  const sectionClass = [
    'a2-section',
    className,
    collapsed ? 'is-collapsed' : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={sectionClass}>
      <div className="a2-section-head">
        <button
          type="button"
          className="a2-section-toggle"
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          {/* CSS rotates this marker when open so it reads as a disclosure arrow. */}
          <span
            className={`a2-section-chevron${collapsed ? '' : ' is-open'}`}
            aria-hidden="true"
          >
            ›
          </span>
          <h3 className={titleClassName}>{title}</h3>
        </button>
        {!collapsed && headerTrailing ? (
          <div className="a2-section-head-trailing">{headerTrailing}</div>
        ) : null}
      </div>
      {!collapsed ? <div className="a2-section-body">{children}</div> : null}
    </section>
  );
}
