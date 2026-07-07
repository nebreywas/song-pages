import {
  countGraphemes,
  KUDO_TEXT_EFFECTS,
  KUDOS_TEXT_MAX_GRAPHEMES,
  truncateToMaxGraphemes,
  type KudoTextOutline,
  type KudoTextPlacement,
  type KudoTextShadow,
  type TextKudoConfig,
} from '@shared/kudos';
import { HOST_FONT_STYLE_IDS, HOST_FONT_STYLE_LABELS } from '@shared/hostContent/typography';
import type { HostFontStyleId } from '@shared/hostContent/types';

import { VcColorField } from '../../components/color/VcColorField';

type KudoTextEditorProps = {
  text: TextKudoConfig;
  onChange: (patch: Partial<TextKudoConfig>) => void;
  variant?: 'text' | 'text-emoji';
};

const PHASE_A_TEXT_EFFECTS = KUDO_TEXT_EFFECTS.filter((row) => row.phase === 'A');

/** Text / words+emoji Kudo authoring (spec §8, §10). */
export function KudoTextEditor({ text, onChange, variant = 'text' }: KudoTextEditorProps) {
  const graphemeCount = countGraphemes(text.value);
  const isMixed = variant === 'text-emoji';

  const setValue = (raw: string) => {
    onChange({ value: truncateToMaxGraphemes(raw, KUDOS_TEXT_MAX_GRAPHEMES) });
  };

  return (
    <div className="vc-kudos-text-editor">
      <label className="vc-field">
        <span>
          {isMixed ? 'Phrase' : 'Text'} ({graphemeCount}/{KUDOS_TEXT_MAX_GRAPHEMES})
        </span>
        <input
          type="text"
          value={text.value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={64}
          placeholder={isMixed ? 'LOVE THIS ❤️' : 'AWESOME!'}
          spellCheck={false}
        />
      </label>

      {isMixed ? (
        <p className="vc-kudos-color-hint">
          Words and emoji count toward the limit together. Emoji use your OS colors and are not recolored.
        </p>
      ) : null}

      <label className="vc-field">
        <span>Font</span>
        <select value={text.fontId} onChange={(e) => onChange({ fontId: e.target.value as HostFontStyleId })}>
          {HOST_FONT_STYLE_IDS.map((fontId) => (
            <option key={fontId} value={fontId}>
              {HOST_FONT_STYLE_LABELS[fontId]}
            </option>
          ))}
        </select>
      </label>

      <label className="vc-field">
        <span>Effect</span>
        <select value={text.effectId} onChange={(e) => onChange({ effectId: e.target.value })}>
          {PHASE_A_TEXT_EFFECTS.map((effect) => (
            <option key={effect.id} value={effect.id}>
              {effect.label}
            </option>
          ))}
        </select>
      </label>

      <label className="vc-field">
        <span>Length ({Math.round(text.durationMs / 100) / 10}s)</span>
        <input
          type="range"
          min={750}
          max={8000}
          step={250}
          value={text.durationMs}
          onChange={(e) => onChange({ durationMs: Number(e.target.value) })}
        />
      </label>

      <label className="vc-field vc-field--color">
        <span>Text color</span>
        <VcColorField
          variant="compact"
          value={text.textColor ?? '#ffffff'}
          onChange={(color) => onChange({ textColor: color })}
          aria-label="Text color"
        />
      </label>

      <label className="vc-field">
        <span>Outline</span>
        <select value={text.outline} onChange={(e) => onChange({ outline: e.target.value as KudoTextOutline })}>
          <option value="off">Off</option>
          <option value="light">Light</option>
          <option value="heavy">Heavy</option>
        </select>
      </label>

      <label className="vc-field">
        <span>Shadow</span>
        <select value={text.shadow} onChange={(e) => onChange({ shadow: e.target.value as KudoTextShadow })}>
          <option value="off">Off</option>
          <option value="soft">Soft</option>
          <option value="hard">Hard</option>
        </select>
      </label>

      <label className="vc-field">
        <span>Placement</span>
        <select value={text.placement} onChange={(e) => onChange({ placement: e.target.value as KudoTextPlacement })}>
          <option value="auto">Auto</option>
          <option value="center">Center</option>
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
      </label>
    </div>
  );
}
