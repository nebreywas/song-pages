import { segmentGraphemes } from './graphemes';

const EMOJI_GRAPHEME = /\p{Extended_Pictographic}/u;

/** True when a grapheme should use OS emoji rendering (spec §10.1). */
export function isEmojiGrapheme(grapheme: string): boolean {
  return EMOJI_GRAPHEME.test(grapheme);
}

export type PhraseSegment = {
  kind: 'text' | 'emoji';
  value: string;
};

/** Group adjacent graphemes into styled text runs vs emoji runs. */
export function segmentPhrase(value: string): PhraseSegment[] {
  const graphemes = segmentGraphemes(value);
  const segments: PhraseSegment[] = [];

  for (const grapheme of graphemes) {
    const kind: PhraseSegment['kind'] = isEmojiGrapheme(grapheme) ? 'emoji' : 'text';
    const last = segments[segments.length - 1];
    if (last && last.kind === kind) {
      last.value += grapheme;
    } else {
      segments.push({ kind, value: grapheme });
    }
  }

  return segments;
}

/** Phrase includes at least one OS emoji grapheme. */
export function phraseIncludesEmoji(value: string): boolean {
  return segmentGraphemes(value).some((grapheme) => isEmojiGrapheme(grapheme));
}
