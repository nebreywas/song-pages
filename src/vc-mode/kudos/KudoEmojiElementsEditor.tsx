import { KUDOS_PARTICLE_ELEMENT_MAX, KUDOS_PARTICLE_ELEMENT_MIN } from '@shared/kudos';
import type { ParticleElement } from '@shared/kudos';
import { firstGrapheme } from '@shared/kudos';

type KudoEmojiElementsEditorProps = {
  elements: ParticleElement[];
  onChange: (elements: ParticleElement[]) => void;
};

function emojiValues(elements: ParticleElement[]): string[] {
  const values = elements
    .filter((el): el is { type: 'emoji'; value: string } => el.type === 'emoji')
    .map((el) => el.value);
  while (values.length < KUDOS_PARTICLE_ELEMENT_MIN) {
    values.push('🔥');
  }
  return values.slice(0, KUDOS_PARTICLE_ELEMENT_MAX);
}

/** Up to four OS emoji slots — grapheme-safe, random-mixed at spawn (spec §3.2). */
export function KudoEmojiElementsEditor({ elements, onChange }: KudoEmojiElementsEditorProps) {
  const slots = emojiValues(elements);

  const setSlot = (index: number, raw: string) => {
    const grapheme = firstGrapheme(raw);
    if (!grapheme) return;
    const next = [...slots];
    next[index] = grapheme;
    onChange(next.slice(0, KUDOS_PARTICLE_ELEMENT_MAX).map((value) => ({ type: 'emoji', value })));
  };

  const addSlot = () => {
    if (slots.length >= KUDOS_PARTICLE_ELEMENT_MAX) return;
    onChange([...slots, '✨'].map((value) => ({ type: 'emoji', value })));
  };

  const removeSlot = (index: number) => {
    if (slots.length <= KUDOS_PARTICLE_ELEMENT_MIN) return;
    onChange(slots.filter((_, i) => i !== index).map((value) => ({ type: 'emoji', value })));
  };

  return (
    <div className="vc-kudos-emoji-elements">
      <span className="vc-kudos-emoji-elements-label">Emoji elements ({slots.length}/{KUDOS_PARTICLE_ELEMENT_MAX})</span>
      <div className="vc-kudos-emoji-slots">
        {slots.map((value, index) => (
          <label key={index} className="vc-kudos-emoji-slot">
            <span>Emoji {index + 1}</span>
            <input
              type="text"
              className="vc-kudos-emoji-input"
              value={value}
              onChange={(e) => setSlot(index, e.target.value)}
              aria-label={`Emoji ${index + 1}`}
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
            />
            {slots.length > KUDOS_PARTICLE_ELEMENT_MIN ? (
              <button
                type="button"
                className="vc-kudos-emoji-remove"
                onClick={() => removeSlot(index)}
                aria-label={`Remove emoji ${index + 1}`}
              >
                ✕
              </button>
            ) : null}
          </label>
        ))}
      </div>
      {slots.length < KUDOS_PARTICLE_ELEMENT_MAX ? (
        <button type="button" className="vc-btn vc-btn--ghost" onClick={addSlot}>
          Add emoji
        </button>
      ) : null}
      <p className="vc-kudos-color-hint">Uses your OS emoji font. Each slot is one emoji; particles pick randomly.</p>
    </div>
  );
}
