import { useRef, useState } from 'react';
import {
  firstGrapheme,
  KUDOS_PARTICLE_ELEMENT_MAX,
  KUDOS_PARTICLE_ELEMENT_MIN,
  setCompactElementSlot,
  type ParticleElement,
} from '@shared/kudos';

import { KudoElementSlotGrid } from './KudoElementSlotGrid';

type KudoEmojiElementsEditorProps = {
  elements: ParticleElement[];
  onChange: (elements: ParticleElement[]) => void;
};

function emojiValues(elements: ParticleElement[]): string[] {
  return elements
    .filter((el): el is { type: 'emoji'; value: string } => el.type === 'emoji')
    .map((el) => el.value)
    .slice(0, KUDOS_PARTICLE_ELEMENT_MAX);
}

function toEmojiElements(values: string[]): ParticleElement[] {
  return values.map((value) => ({ type: 'emoji', value }));
}

/** Up to four OS emoji slots — grapheme-safe, random-mixed at spawn (spec §3.2). */
export function KudoEmojiElementsEditor({ elements, onChange }: KudoEmojiElementsEditorProps) {
  const slots = emojiValues(elements);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingClickIndex, setPendingClickIndex] = useState<number | null>(null);
  const [inputAnchor, setInputAnchor] = useState<DOMRect | null>(null);

  const commitGrapheme = (clickIndex: number, raw: string) => {
    const grapheme = firstGrapheme(raw);
    if (!grapheme) return;
    const next = setCompactElementSlot(slots, clickIndex, grapheme, KUDOS_PARTICLE_ELEMENT_MAX);
    onChange(toEmojiElements(next));
  };

  const openEmojiInput = (clickIndex: number, anchor: HTMLElement) => {
    setPendingClickIndex(clickIndex);
    setInputAnchor(anchor.getBoundingClientRect());
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.value = '';
      input.focus();
    });
  };

  const clearAt = (index: number) => {
    if (slots.length <= KUDOS_PARTICLE_ELEMENT_MIN) return;
    onChange(toEmojiElements(slots.filter((_, i) => i !== index)));
  };

  return (
    <div className="vc-kudos-emoji-elements">
      <input
        ref={inputRef}
        type="text"
        className="vc-kudos-emoji-picker-input"
        aria-label="Choose character"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        style={
          inputAnchor
            ? {
                left: inputAnchor.left,
                top: inputAnchor.top,
                width: inputAnchor.width,
                height: inputAnchor.height,
              }
            : undefined
        }
        onChange={(event) => {
          if (pendingClickIndex == null) return;
          commitGrapheme(pendingClickIndex, event.target.value);
          event.target.value = '';
          setPendingClickIndex(null);
          setInputAnchor(null);
          event.target.blur();
        }}
        onBlur={() => {
          setPendingClickIndex(null);
          setInputAnchor(null);
        }}
      />
      <KudoElementSlotGrid
        label="Emoji + Type"
        hint="Each slot is one character — emoji, letter, or number. Particles pick randomly."
        filledCount={slots.length}
        canClear={slots.length > KUDOS_PARTICLE_ELEMENT_MIN}
        onActivate={(clickIndex, anchor) => openEmojiInput(clickIndex, anchor)}
        onClear={clearAt}
        renderFilled={(index) => <span className="vc-kudos-element-slot-emoji">{slots[index]}</span>}
      />
    </div>
  );
}
