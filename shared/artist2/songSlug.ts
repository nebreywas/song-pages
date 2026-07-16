/**
 * Song URL slug — derived from the public label; manual override is opt-in.
 */

export function slugifySongName(name: string): string {
  const slug = String(name ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'song';
}

/** Effective compile/catalog slug for a Song. */
export function resolveSongSlug(input: {
  name: string;
  slug?: string | null;
}): string {
  const explicit = input.slug?.trim();
  if (explicit) return explicit.slice(0, 80);
  return slugifySongName(input.name);
}
