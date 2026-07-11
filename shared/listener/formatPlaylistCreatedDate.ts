/** Long-form created date for playlist share exports — e.g. "July 1, 2026". */
export function formatPlaylistCreatedDate(value: string | null | undefined): string {
  if (!value?.trim()) return '';
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
