/**
 * Host fallback resolution helpers.
 *
 * Multi-field text fallbacks (artist name, song title, genres):
 * - Exactly one non-empty field → always use that value.
 * - More than one non-empty field → pick uniformly at random among them.
 * - No non-empty fields → null (caller falls through to system default).
 */

import type { HostFallbackTextFields } from './types';

export function nonEmptyFallbackFields(fields: HostFallbackTextFields | undefined): string[] {
  if (!fields) return [];
  return fields.map((value) => value.trim()).filter((value) => value.length > 0);
}

/**
 * Resolve a multi-field host text fallback.
 * @param random - inject for tests; defaults to Math.random.
 */
export function resolveMultiFieldFallback(
  fields: HostFallbackTextFields | undefined,
  random: () => number = Math.random,
): string | null {
  const filled = nonEmptyFallbackFields(fields);
  if (filled.length === 0) return null;
  if (filled.length === 1) return filled[0];
  const index = Math.floor(random() * filled.length);
  return filled[index] ?? filled[0];
}
