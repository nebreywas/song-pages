/**
 * Song presentation vocabularies — how vocals and ensemble are framed.
 * Stored as stable slugs; labels can evolve without rewriting payloads.
 */

export const PRIMARY_VOCAL_PRESENTATIONS = [
  'solo',
  'duet',
  'trio',
  'group_ensemble',
  'choir',
  'spoken_word',
  'instrumental',
  'other',
] as const;

export type Artist2PrimaryVocalPresentation = (typeof PRIMARY_VOCAL_PRESENTATIONS)[number];

export const PRIMARY_VOCAL_PRESENTATION_LABELS: Record<Artist2PrimaryVocalPresentation, string> = {
  solo: 'Solo',
  duet: 'Duet',
  trio: 'Trio',
  group_ensemble: 'Group / Ensemble',
  choir: 'Choir',
  spoken_word: 'Spoken Word',
  instrumental: 'Instrumental',
  other: 'Other',
};

export const MUSICAL_ENSEMBLES = [
  'solo',
  'band',
  'dj_producer',
  'duo',
  'trio',
  'quartet',
  'ensemble',
  'orchestra',
  'big_band',
  'choir_vocal_ensemble',
  'marching_band',
  'collective',
  'other',
] as const;

export type Artist2MusicalEnsemble = (typeof MUSICAL_ENSEMBLES)[number];

export const MUSICAL_ENSEMBLE_LABELS: Record<Artist2MusicalEnsemble, string> = {
  solo: 'Solo',
  band: 'Band',
  dj_producer: 'DJ / Producer',
  duo: 'Duo',
  trio: 'Trio',
  quartet: 'Quartet',
  ensemble: 'Ensemble',
  orchestra: 'Orchestra',
  big_band: 'Big Band / Jazz Orchestra',
  choir_vocal_ensemble: 'Choir / Vocal Ensemble',
  marching_band: 'Marching Band / Drum Corps',
  collective: 'Collective / Crew / Sound System',
  other: 'Other',
};

export function coercePrimaryVocalPresentation(
  raw: unknown,
): Artist2PrimaryVocalPresentation | '' {
  if (typeof raw !== 'string' || !raw.trim()) return '';
  return PRIMARY_VOCAL_PRESENTATIONS.includes(raw as Artist2PrimaryVocalPresentation)
    ? (raw as Artist2PrimaryVocalPresentation)
    : '';
}

export function coerceMusicalEnsemble(raw: unknown): Artist2MusicalEnsemble | '' {
  if (typeof raw !== 'string' || !raw.trim()) return '';
  return MUSICAL_ENSEMBLES.includes(raw as Artist2MusicalEnsemble)
    ? (raw as Artist2MusicalEnsemble)
    : '';
}
