import type { KudoAssetVariantMode, KudoParticleColorMode, ParticleKudoConfig } from '@shared/kudos';

import { VcColorField } from '../../components/color/VcColorField';

type KudoIconColorControlsProps = {
  particle: ParticleKudoConfig;
  onChange: (patch: Partial<ParticleKudoConfig>) => void;
};

const DEFAULT_SINGLE = '#ff6b8a';
const DEFAULT_MULTI = ['#ff6b8a', '#ffd166', '#9b5de5'] as const;
const DEFAULT_GRADIENT_END = '#ffd166';

const VARIANT_OPTIONS: { value: KudoAssetVariantMode; label: string }[] = [
  { value: 'flat', label: 'Flat' },
  { value: 'shaded', label: 'Shaded' },
  { value: 'mixed', label: 'Mixed' },
];

function ensureColors(mode: KudoParticleColorMode, colors: string[] | undefined): string[] {
  const list = colors ?? [];
  if (mode === 'single') return [list[0] ?? DEFAULT_SINGLE];
  if (mode === 'gradient') return [list[0] ?? DEFAULT_SINGLE, list[1] ?? DEFAULT_GRADIENT_END];
  return [
    list[0] ?? DEFAULT_MULTI[0],
    list[1] ?? DEFAULT_MULTI[1],
    list[2] ?? DEFAULT_MULTI[2],
  ];
}

/** Built-in icon variant + color shading (flat mask or grays blend). */
export function KudoIconColorControls({ particle, onChange }: KudoIconColorControlsProps) {
  const variant = particle.assetVariantMode ?? 'mixed';
  const colorMode = particle.iconColorMode;
  const colors = particle.iconColors ?? [];

  const setVariant = (next: KudoAssetVariantMode) => {
    onChange({ assetVariantMode: next });
  };

  const setColorMode = (next: KudoParticleColorMode | 'none') => {
    if (next === 'none') {
      onChange({ iconColorMode: undefined, iconColors: [] });
      return;
    }
    onChange({
      iconColorMode: next,
      iconColors: ensureColors(next, colors),
    });
  };

  const setColorAt = (index: number, color: string) => {
    if (!colorMode) return;
    const next = [...ensureColors(colorMode, colors)];
    next[index] = color;
    onChange({ iconColors: next });
  };

  const resolved = colorMode ? ensureColors(colorMode, colors) : [];
  const gradientStart = resolved[0] ?? DEFAULT_SINGLE;
  const gradientEnd = resolved[1] ?? DEFAULT_GRADIENT_END;

  return (
    <div className="vc-kudos-color-controls">
      <fieldset className="vc-kudos-variant-radios">
        <legend>Icon artwork</legend>
        <div className="vc-kudos-variant-radio-row">
          {VARIANT_OPTIONS.map((option) => (
            <label key={option.value} className="vc-kudos-variant-radio">
              <input
                type="radio"
                name="kudo-icon-variant"
                value={option.value}
                checked={variant === option.value}
                onChange={() => setVariant(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="vc-field">
        <span>Color shading</span>
        <select
          value={colorMode ?? 'none'}
          onChange={(e) => setColorMode(e.target.value as KudoParticleColorMode | 'none')}
        >
          <option value="none">None</option>
          <option value="single">Single color</option>
          <option value="multi">Multiple colors</option>
          <option value="gradient">Gradient</option>
        </select>
      </label>

      {colorMode === 'single' ? (
        <label className="vc-kudos-color-choice">
          <span>Color</span>
          <VcColorField
            variant="compact"
            value={resolved[0] ?? DEFAULT_SINGLE}
            onChange={(c) => setColorAt(0, c)}
            aria-label="Icon color"
          />
        </label>
      ) : null}

      {colorMode === 'multi' ? (
        <div className="vc-kudos-multi-colors">
          {resolved.map((color, index) => (
            <label key={`multi-${index}`} className="vc-kudos-color-choice">
              <span>Color choice {index + 1}</span>
              <VcColorField
                id={`kudo-multi-color-${index}`}
                variant="compact"
                value={color}
                onChange={(c) => setColorAt(index, c)}
                aria-label={`Color choice ${index + 1}`}
              />
            </label>
          ))}
        </div>
      ) : null}

      {colorMode === 'gradient' ? (
        <div className="vc-kudos-gradient">
          <div
            className="vc-kudos-gradient-preview"
            style={{ background: `linear-gradient(to right, ${gradientStart}, ${gradientEnd})` }}
            aria-hidden="true"
          />
          <div className="vc-kudos-gradient-pickers">
            <label className="vc-kudos-color-choice">
              <span>Start</span>
              <VcColorField
                id="kudo-gradient-start"
                variant="compact"
                value={gradientStart}
                onChange={(c) => setColorAt(0, c)}
                aria-label="Gradient start color"
              />
            </label>
            <label className="vc-kudos-color-choice vc-kudos-color-choice--end">
              <span>End</span>
              <VcColorField
                id="kudo-gradient-end"
                variant="compact"
                value={gradientEnd}
                onChange={(c) => setColorAt(1, c)}
                aria-label="Gradient end color"
              />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
