/**
 * Human-readable cover filenames for managed / imported artwork.
 * Pattern: `{slug}-COVER.{ext}` then `{slug}-COVER-2.{ext}`, …
 */

/** Slugify for filenames — keeps names Finder-readable. */
export function slugifyForCoverFilename(name: string): string {
  const slug = String(name ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'untitled';
}

function normalizeExt(ext: string): string {
  const trimmed = String(ext || '').trim();
  if (!trimmed) return '.jpeg';
  return trimmed.startsWith('.') ? trimmed.toLowerCase() : `.${trimmed.toLowerCase()}`;
}

/**
 * Build a unique cover basename in a directory.
 * `occupiedNames` are basenames already present (lowercase compare).
 */
export function buildCoverFilename(
  objectName: string,
  ext: string,
  occupiedBasenames: Iterable<string> = [],
): string {
  const slug = slugifyForCoverFilename(objectName);
  const extension = normalizeExt(ext);
  const occupied = new Set(
    [...occupiedBasenames].map((name) => name.toLowerCase()),
  );

  const first = `${slug}-COVER${extension}`;
  if (!occupied.has(first.toLowerCase())) return first;

  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${slug}-COVER-${n}${extension}`;
    if (!occupied.has(candidate.toLowerCase())) return candidate;
  }

  return `${slug}-COVER-${Date.now()}${extension}`;
}

/** True when basename already matches our cover naming pattern for this object. */
export function isAlreadyCoverNamed(basename: string, objectName: string): boolean {
  const slug = slugifyForCoverFilename(objectName);
  const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${escaped}-COVER(-\\d+)?\\.[^.]+$`, 'i');
  return re.test(basename);
}
