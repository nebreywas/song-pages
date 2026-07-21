/**
 * Adapted Work & Provenance — catalog provenance for covers, remixes,
 * arrangements, public-domain adaptations, etc.
 *
 * Cataloging only — not a copyright-law model. See
 * documentation/Additional-fields-adaptive-works.md.
 */

export type Artist2AdaptationType =
  | 'cover'
  | 'remix'
  | 'arrangement'
  | 'rework'
  | 'translation'
  | 'mashup'
  | 'medley'
  | 'parody'
  | 'other';

export type Artist2AdaptedPartyRole = 'me' | 'someone_else';

export type Artist2SourceMaterialKind =
  | 'existing_music'
  | 'existing_performance'
  | 'existing_lyrics';

export type Artist2OriginalCopyrightStatus =
  | 'public_domain'
  | 'copyrighted'
  | 'licensed'
  | 'unknown';

/**
 * Nested on `Artist2SongPayload.adaptedWork`.
 * When `enabled` is false, the rest of the fields are ignored by UI (kept for
 * when the author re-enables the section).
 */
export type Artist2AdaptedWork = {
  /** Master toggle — “This song is adapted from a pre-existing work”. */
  enabled: boolean;
  /** Freeform title of the original work (catalog link deferred). */
  originalWorkName?: string;
  adaptationType?: Artist2AdaptationType | '';
  adaptedBy?: Artist2AdaptedPartyRole | '';
  /** Shown when adaptedBy === 'someone_else'. */
  adapterName?: string;
  originalCreator?: Artist2AdaptedPartyRole | '';
  /** Multi-select — which elements of the original were used. */
  sourceMaterial?: Artist2SourceMaterialKind[];
  /** Year or full date of the original publication. */
  originalPublicationDate?: string;
  /** Multi-select copyright status flags (author-declared). */
  originalCopyrightStatus?: Artist2OriginalCopyrightStatus[];
  // —— Provenance ——
  originalPerformers?: string;
  /** Composer(s) / musical creator(s). */
  originalMusic?: string;
  /** Lyricist(s) / author(s). */
  originalWords?: string;
  originalCopyrightHolder?: string;
  /** Primary online reference URL. */
  primaryProvenanceLink?: string;
  /**
   * Optional research file pointer (absolute path for now — same as recordings).
   * Managed `provenance-materials/` copy is deferred with the assets filesystem.
   */
  provenanceFilePath?: string | null;
  /** Catch-all notes about the original work. */
  provenanceNotes?: string;
  /** Freeform description of creative changes in this adaptation. */
  changesMade?: string;
};

export const ADAPTATION_TYPES: readonly Artist2AdaptationType[] = [
  'cover',
  'remix',
  'arrangement',
  'rework',
  'translation',
  'mashup',
  'medley',
  'parody',
  'other',
] as const;

export const ADAPTATION_TYPE_LABELS: Record<Artist2AdaptationType, string> = {
  cover: 'Cover',
  remix: 'Remix',
  arrangement: 'Arrangement',
  rework: 'Rework',
  translation: 'Translation',
  mashup: 'Mashup',
  medley: 'Medley',
  parody: 'Parody',
  other: 'Other',
};

export const ADAPTED_PARTY_ROLES: readonly Artist2AdaptedPartyRole[] = [
  'me',
  'someone_else',
] as const;

export const ADAPTED_PARTY_ROLE_LABELS: Record<Artist2AdaptedPartyRole, string> = {
  me: 'Me',
  someone_else: 'Someone Else',
};

export const SOURCE_MATERIAL_KINDS: readonly Artist2SourceMaterialKind[] = [
  'existing_music',
  'existing_performance',
  'existing_lyrics',
] as const;

export const SOURCE_MATERIAL_LABELS: Record<Artist2SourceMaterialKind, string> = {
  existing_music: 'Existing Music',
  existing_performance: 'Existing Performance',
  existing_lyrics: 'Existing Lyrics',
};

export const SOURCE_MATERIAL_HELP: Record<Artist2SourceMaterialKind, string> = {
  existing_music: 'The underlying composition or musical material, independent of a specific recording.',
  existing_performance: 'An existing recording or performance used directly or sampled.',
  existing_lyrics: 'The written lyrical content.',
};

export const ORIGINAL_COPYRIGHT_STATUSES: readonly Artist2OriginalCopyrightStatus[] = [
  'public_domain',
  'copyrighted',
  'licensed',
  'unknown',
] as const;

export const ORIGINAL_COPYRIGHT_STATUS_LABELS: Record<
  Artist2OriginalCopyrightStatus,
  string
> = {
  public_domain: 'Public Domain',
  copyrighted: 'Copyrighted',
  licensed: 'Licensed',
  unknown: 'Unknown',
};

export function emptyAdaptedWork(): Artist2AdaptedWork {
  return { enabled: false };
}

export function songAdaptedWork(
  payload: { adaptedWork?: Artist2AdaptedWork | null },
): Artist2AdaptedWork {
  return payload.adaptedWork ?? emptyAdaptedWork();
}

/** Shallow-merge a patch onto the current adapted-work blob. */
export function patchAdaptedWork(
  current: Artist2AdaptedWork | null | undefined,
  patch: Partial<Artist2AdaptedWork>,
): Artist2AdaptedWork {
  return { ...(current ?? emptyAdaptedWork()), ...patch };
}

/** Toggle a value in a multi-select list (source material / copyright status). */
export function toggleAdaptedWorkListValue<T extends string>(
  list: readonly T[] | undefined,
  value: T,
  checked: boolean,
): T[] {
  const set = new Set(list ?? []);
  if (checked) set.add(value);
  else set.delete(value);
  return [...set];
}
