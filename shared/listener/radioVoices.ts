/**
 * Curated Radio Mode voices — only the set we have auditioned with known
 * rate/pitch. Product UI exposes this catalog (plus Random), never the full
 * OS / Chromium voice list. See documentation/web-voice-and-macos-tts.md.
 */

export type RadioVoiceId =
  | 'random'
  | 'allison'
  | 'samantha-e'
  | 'samantha-r'
  | 'moira'
  | 'daniel'
  | 'evan'
  | 'nathan';

export type RadioVoiceEngine = 'native' | 'web';

export type RadioVoiceProfile = {
  id: Exclude<RadioVoiceId, 'random'>;
  /** Short label for Settings / menus. */
  label: string;
  gender: 'female' | 'male';
  /**
   * Exact macOS `say -v` name. Enhanced entries must include "(Enhanced)" so
   * Chromium’s name-collision trap (Samantha twin) is avoided on the native path.
   */
  sayName: string;
  /** Substring match against speechSynthesis voice names (web fallback). */
  webNameHints: readonly string[];
  rate: number;
  pitch: number;
  /** Prefer native `say` when available — required for Samantha Enhanced. */
  preferredEngine: RadioVoiceEngine;
  /** Quality / fallback notes for docs and default resolution. */
  notes: string;
};

/**
 * Order of quality / preference for Random + defaults:
 * Allison (default overall / female) → Nathan (default male) → Samantha E →
 * Evan → Samantha R (default if no enhanced) → Daniel (default male no enhanced) →
 * Moira (alt female no enhanced).
 */
export const RADIO_VOICE_PROFILES: readonly RadioVoiceProfile[] = [
  {
    id: 'allison',
    label: 'Allison',
    gender: 'female',
    sayName: 'Allison (Enhanced)',
    webNameHints: ['allison'],
    rate: 0.9,
    pitch: 1.0,
    preferredEngine: 'native',
    notes: 'Default voice overall and default female (Enhanced).',
  },
  {
    id: 'nathan',
    label: 'Nathan',
    gender: 'male',
    sayName: 'Nathan (Enhanced)',
    webNameHints: ['nathan'],
    rate: 0.9,
    pitch: 0.95,
    preferredEngine: 'native',
    notes: 'Default male (Enhanced).',
  },
  {
    id: 'samantha-e',
    label: 'Samantha E',
    gender: 'female',
    sayName: 'Samantha (Enhanced)',
    webNameHints: ['samantha'],
    rate: 1.0,
    pitch: 0.9,
    preferredEngine: 'native',
    notes: 'Must use native say — Chromium always resolves to compact Samantha.',
  },
  {
    id: 'evan',
    label: 'Evan',
    gender: 'male',
    sayName: 'Evan (Enhanced)',
    webNameHints: ['evan'],
    rate: 0.8,
    pitch: 1.05,
    preferredEngine: 'native',
    notes: 'Enhanced male.',
  },
  {
    id: 'samantha-r',
    label: 'Samantha R',
    gender: 'female',
    sayName: 'Samantha',
    webNameHints: ['samantha'],
    rate: 0.85,
    pitch: 1.1,
    preferredEngine: 'web',
    notes: 'Regular Samantha — default female when Enhanced voices are unavailable.',
  },
  {
    id: 'daniel',
    label: 'Daniel',
    gender: 'male',
    sayName: 'Daniel',
    webNameHints: ['daniel'],
    rate: 0.85,
    pitch: 1.05,
    preferredEngine: 'web',
    notes: 'en-GB regular — default male when Enhanced voices are unavailable.',
  },
  {
    id: 'moira',
    label: 'Moira',
    gender: 'female',
    sayName: 'Moira',
    webNameHints: ['moira'],
    rate: 1.0,
    pitch: 0.9,
    preferredEngine: 'web',
    notes: 'en-IE regular — alternative female without Enhanced.',
  },
] as const;

export const RADIO_VOICE_SETTINGS_OPTIONS: readonly {
  id: RadioVoiceId;
  label: string;
}[] = [
  { id: 'random', label: 'Random' },
  ...RADIO_VOICE_PROFILES.map((profile) => ({
    id: profile.id,
    label: profile.label,
  })),
];

export function getRadioVoiceProfile(
  id: Exclude<RadioVoiceId, 'random'>,
): RadioVoiceProfile | undefined {
  return RADIO_VOICE_PROFILES.find((profile) => profile.id === id);
}

export function normalizeRadioVoiceId(raw: unknown): RadioVoiceId {
  if (raw === 'random') return 'random';
  if (typeof raw === 'string' && RADIO_VOICE_PROFILES.some((profile) => profile.id === raw)) {
    return raw as RadioVoiceId;
  }
  return 'allison';
}

/** Resolve Random / fixed id to a concrete profile (Random re-rolls each call). */
export function resolveRadioVoiceProfile(
  voiceId: RadioVoiceId,
  random: () => number = Math.random,
): RadioVoiceProfile {
  if (voiceId !== 'random') {
    return getRadioVoiceProfile(voiceId) ?? RADIO_VOICE_PROFILES[0];
  }
  const index = Math.min(
    RADIO_VOICE_PROFILES.length - 1,
    Math.floor(random() * RADIO_VOICE_PROFILES.length),
  );
  return RADIO_VOICE_PROFILES[index] ?? RADIO_VOICE_PROFILES[0];
}
