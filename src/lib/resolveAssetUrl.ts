/** Resolve a song-page asset reference (often relative) against a base page URL. */
export function resolveAssetUrl(
  baseUrl: string | null | undefined,
  reference: string | null | undefined,
): string | null {
  const trimmed = reference?.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('data:')) return null;
  if (/^(?:mailto:|tel:|javascript:)/i.test(trimmed)) return null;

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return trimmed;
  }

  if (!baseUrl?.trim()) return trimmed;

  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
}
