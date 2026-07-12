import { canonicalizeFlowInput } from '../providers/flow/canonicalize.ts';
import { canonicalizeSoundcloudInput } from '../providers/soundcloud/canonicalize.ts';
import { canonicalizeSunoInput } from '../providers/suno/canonicalize.ts';
import { canonicalizeYoutubeInput } from '../providers/youtube/canonicalize.ts';

export type ExternalSongProvider = 'youtube' | 'soundcloud' | 'flow' | 'suno';

export type DetectExternalSongProviderResult =
  | { ok: true; provider: ExternalSongProvider }
  | { ok: false; error: string };

export const SUPPORTED_EXTERNAL_SONG_SERVICES =
  'YouTube, SoundCloud, Google Flow, and Suno';

export const EXTERNAL_SONG_INTAKE_PLACEHOLDER =
  'Paste a YouTube, SoundCloud, Google Flow, or Suno link…';

type ProviderProbe = {
  provider: ExternalSongProvider;
  probe: (input: string) => { ok: boolean };
  mismatchHint: string;
};

const PROVIDER_PROBES: ProviderProbe[] = [
  {
    provider: 'youtube',
    probe: (input) => canonicalizeYoutubeInput(input),
    mismatchHint: 'YouTube links must be a watch URL or 11-character video ID.',
  },
  {
    provider: 'soundcloud',
    probe: (input) => canonicalizeSoundcloudInput(input),
    mismatchHint: 'SoundCloud links must be a public track URL — not a profile or playlist.',
  },
  {
    provider: 'flow',
    probe: (input) => canonicalizeFlowInput(input),
    mismatchHint: 'Google Flow links must be a public flowmusic.app song page or clip UUID.',
  },
  {
    provider: 'suno',
    probe: (input) => canonicalizeSunoInput(input),
    mismatchHint: 'Suno links must be a suno.com/s/… or suno.com/song/… share URL, or a clip UUID.',
  },
];

function looksLikeUrl(input: string): boolean {
  return /^https?:\/\//i.test(input) || /^www\./i.test(input) || input.includes('.com/');
}

/**
 * Pick the first provider whose canonicalizer accepts the input.
 * Used for instant UI feedback — main process re-validates on submit.
 */
export function detectExternalSongProvider(input: string): DetectExternalSongProviderResult {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Paste a link or ID to add a song.' };
  }

  for (const { provider, probe } of PROVIDER_PROBES) {
    if (probe(trimmed).ok) {
      return { ok: true, provider };
    }
  }

  if (looksLikeUrl(trimmed)) {
    return {
      ok: false,
      error: `That service is not supported. Song Pages accepts ${SUPPORTED_EXTERNAL_SONG_SERVICES} links only.`,
    };
  }

  return {
    ok: false,
    error: `Unrecognized input. Paste a supported link (${SUPPORTED_EXTERNAL_SONG_SERVICES}).`,
  };
}
