import type { CSSProperties } from 'react';

import { segmentPhrase } from '@shared/kudos';

type KudoPhraseContentProps = {
  phrase: string;
  textStyle: CSSProperties;
  /** When true, emoji graphemes skip text color/outline (spec §10.1). */
  preserveEmojiColors: boolean;
};

const EMOJI_FONT_STACK = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

/** Render a mixed words+emoji phrase as one composed line. */
export function KudoPhraseContent({ phrase, textStyle, preserveEmojiColors }: KudoPhraseContentProps) {
  const segments = segmentPhrase(phrase);

  return (
    <>
      {segments.map((segment, index) => {
        if (preserveEmojiColors && segment.kind === 'emoji') {
          return (
            <span
              key={index}
              className="vc-kudo-phrase-emoji"
              style={{
                fontFamily: EMOJI_FONT_STACK,
                fontSize: textStyle.fontSize,
                lineHeight: textStyle.lineHeight,
              }}
            >
              {segment.value}
            </span>
          );
        }

        return (
          <span key={index} style={textStyle}>
            {segment.value}
          </span>
        );
      })}
    </>
  );
}
