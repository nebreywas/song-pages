/**
 * Song audio attachments — format variants of the same cut (mp3 / wav / bitrate),
 * not parallel creative mixes (those stay sister Songs).
 *
 * Compile / publish use the single recording marked `published`.
 */

export type Artist2SongRecording = {
  id: string;
  audioPath?: string | null;
  /** Editor label only — not a creative version title. */
  label?: string;
  /**
   * Per-recording availability flag. Freely togglable and independent of
   * `primary` — any number of recordings may be published at once.
   */
  published?: boolean;
  /**
   * Exactly one primary per song. The primary is the canonical cut used for
   * compile / site audio. Independent of `published`.
   */
  primary?: boolean;
};

export type SongRecordingsPayloadSlice = {
  recordings?: Artist2SongRecording[];
  recording?: {
    audioPath?: string | null;
    label?: string;
  };
};

/** Stable-enough ids for editor rows (not catalog object ids). */
export function newSongRecordingId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `rec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Ensure exactly one primary when any recordings exist; prefer an entry that is
 * already primary, then one that has a path. `published` is left untouched — it
 * is an independent, per-recording flag.
 */
export function ensureSinglePrimary(
  recordings: Artist2SongRecording[],
): Artist2SongRecording[] {
  if (recordings.length === 0) return [];
  const primaryIdx = recordings.findIndex((r) => r.primary);
  let keepIdx = primaryIdx;
  if (keepIdx < 0) {
    keepIdx = recordings.findIndex((r) => Boolean(r.audioPath?.trim()));
    if (keepIdx < 0) keepIdx = 0;
  }
  return recordings.map((r, i) => ({ ...r, primary: i === keepIdx }));
}

/**
 * Canonical list for editors / compile.
 * Migrates legacy single `recording` into a one-item `recordings` array.
 */
export function normalizeSongRecordings(
  payload: SongRecordingsPayloadSlice | null | undefined,
): Artist2SongRecording[] {
  if (!payload) return [];

  if (Array.isArray(payload.recordings) && payload.recordings.length > 0) {
    return ensureSinglePrimary(
      payload.recordings.map((raw) => ({
        id: typeof raw?.id === 'string' && raw.id.trim() ? raw.id : newSongRecordingId(),
        audioPath: raw?.audioPath ?? null,
        label: typeof raw?.label === 'string' ? raw.label : undefined,
        published: Boolean(raw?.published),
        // Back-compat: a pre-existing single `published` recording becomes primary.
        primary: Boolean(raw?.primary ?? raw?.published),
      })),
    );
  }

  const legacy = payload.recording;
  if (legacy && (legacy.audioPath || legacy.label)) {
    return [
      {
        id: newSongRecordingId(),
        audioPath: legacy.audioPath ?? null,
        label: legacy.label || 'Main',
        published: true,
        primary: true,
      },
    ];
  }

  return [];
}

/** The canonical (primary) recording used for compile / site audio. */
export function publishedSongRecording(
  payload: SongRecordingsPayloadSlice | null | undefined,
): Artist2SongRecording | null {
  const list = normalizeSongRecordings(payload);
  return list.find((r) => r.primary) ?? list.find((r) => r.published) ?? list[0] ?? null;
}

export function publishedSongAudioPath(
  payload: SongRecordingsPayloadSlice | null | undefined,
): string | null {
  const path = publishedSongRecording(payload)?.audioPath?.trim();
  return path || null;
}

/** Keep deprecated `recording` mirror in sync for older readers (uses the primary cut). */
export function legacyRecordingFromList(
  recordings: Artist2SongRecording[],
): NonNullable<SongRecordingsPayloadSlice['recording']> {
  const primary = recordings.find((r) => r.primary) ?? recordings[0];
  if (!primary) {
    return { audioPath: null, label: 'Main Recording' };
  }
  return {
    audioPath: primary.audioPath ?? null,
    label: primary.label || 'Main Recording',
  };
}
