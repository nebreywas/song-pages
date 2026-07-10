/** Format playlist added-at timestamps for the song table. */
export function formatPlaylistDateAdded(value: string | null | undefined): string {
  if (!value?.trim()) return '—';
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
