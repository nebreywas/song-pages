import {
  sidebarEntryTypeLabelLong,
  sidebarEntryTypeLabelShort,
  type SidebarEntryType,
} from './sidebarEntry';

/** Type column cell — short/long labels toggled via column container queries in CSS. */
export function LibraryEntryTypeCell({ type }: { type: SidebarEntryType }) {
  if (type === 'liked') {
    return null;
  }

  const long = sidebarEntryTypeLabelLong(type);
  const short = sidebarEntryTypeLabelShort(type);

  return (
    <>
      <span className="sr-only">{long}</span>
      <span className="library-type library-type--short" title={long} aria-hidden="true">
        {short}
      </span>
      <span className="library-type library-type--long" aria-hidden="true">
        {long}
      </span>
    </>
  );
}
