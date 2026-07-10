/**
 * Per-region border and background controls — shared by float and area layout tabs.
 */

import {
  buildRegionAppearanceLockPatch,
  patchRegionAppearanceField,
  patchRegionBorderControls,
  resolveRegionBorderDraft,
  VC_GRID_LINE_STYLE_OPTIONS,
  type VcGridDesignSettings,
  type VcGridLineStyle,
  type VcRegionAppearanceMode,
  type VcRegionAppearanceState,
} from '@shared/vcMode/gridDesign';

import { VcColorField } from '../../components/color/VcColorField';

export type RegionAppearanceOverrides = VcRegionAppearanceState;

type RegionBordersAndBackgroundsProps = {
  appearanceMode: VcRegionAppearanceMode;
  gridDesign: VcGridDesignSettings;
  overrides: RegionAppearanceOverrides;
  resolvedBackground: string;
  resolvedBackgroundOpacityPct?: number;
  resolvedContentOpacityPct?: number;
  onPatch: (patch: Partial<RegionAppearanceOverrides>) => void;
  showOpacitySliders?: boolean;
};

export function RegionBordersAndBackgrounds({
  appearanceMode,
  gridDesign,
  overrides,
  resolvedBackground,
  resolvedBackgroundOpacityPct,
  resolvedContentOpacityPct,
  onPatch,
  showOpacitySliders = false,
}: RegionBordersAndBackgroundsProps) {
  const draftBorder = resolveRegionBorderDraft(overrides, gridDesign);
  const lockedToGrid = overrides.lockAppearanceToGrid === true;

  const patchAppearance = (patch: Partial<RegionAppearanceOverrides>) => {
    let working = overrides;
    let effectivePatch = patch;
    // Persist a visible fill when the user picks a custom color but leaves opacity at grid default (0).
    if (
      appearanceMode === 'float' &&
      patch.backgroundColor !== undefined &&
      patch.backgroundOpacityPct === undefined
    ) {
      effectivePatch = { backgroundOpacityPct: 100, ...patch };
    }
    // Edits while locked only touched savedRegionAppearance — unlock first so live values update.
    if (lockedToGrid && !('lockAppearanceToGrid' in effectivePatch)) {
      const unlock = buildRegionAppearanceLockPatch(overrides, gridDesign, false, appearanceMode);
      working = { ...overrides, ...unlock };
      effectivePatch = { ...unlock, ...effectivePatch };
    }

    const isBorderPatch =
      effectivePatch.borderColor !== undefined ||
      effectivePatch.borderStyle !== undefined ||
      effectivePatch.borderThicknessPx !== undefined;
    if (isBorderPatch) {
      effectivePatch = {
        ...effectivePatch,
        ...patchRegionBorderControls(working, gridDesign, effectivePatch),
      };
    }

    onPatch(patchRegionAppearanceField(overrides, effectivePatch));
  };

  return (
    <>
      <div className="vc-field vc-region-field vc-region-border-style-block">
        <span className="vc-assignment-sublabel">Border style &amp; thickness</span>
        <div className="vc-region-border-style-row vc-region-field-controls">
          <label className="vc-region-border-style-field">
            <select
              value={draftBorder.style}
              onChange={(e) => patchAppearance({ borderStyle: e.target.value as VcGridLineStyle })}
              aria-label="Border style"
            >
              {VC_GRID_LINE_STYLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="vc-field-inline vc-region-border-color-field">
            <VcColorField
              variant="compact"
              value={draftBorder.color}
              onChange={(borderColor) => patchAppearance({ borderColor })}
              aria-label="Border color"
            />
            <span>Color</span>
          </label>
          <label className="vc-region-border-thickness-field">
            <div className="vc-region-border-thickness-row">
              <input
                type="range"
                className="vc-region-border-thickness-slider"
                min={0}
                max={20}
                step={1}
                value={draftBorder.thicknessPx}
                onChange={(e) => patchAppearance({ borderThicknessPx: Number(e.target.value) })}
                aria-label="Border thickness"
              />
              <span className="vc-assignment-value">{draftBorder.thicknessPx}px</span>
            </div>
          </label>
        </div>
      </div>

      <div className="vc-field vc-region-field vc-region-background-field">
        <span className="vc-assignment-sublabel">Background</span>
        <div className="vc-region-background-row vc-region-field-controls">
          <VcColorField
            variant="compact"
            value={resolvedBackground}
            onChange={(backgroundColor) => patchAppearance({ backgroundColor })}
            aria-label="Background color"
          />
          <label className="vc-field-inline vc-region-lock-defaults-field">
            <input
              type="checkbox"
              checked={lockedToGrid}
              onChange={(e) =>
                onPatch(buildRegionAppearanceLockPatch(overrides, gridDesign, e.target.checked, appearanceMode))
              }
            />
            <span>Lock to grid defaults</span>
          </label>
        </div>
      </div>

      {showOpacitySliders ? (
        <>
          <div className="vc-field vc-region-field vc-region-field--slider vc-float-opacity-field">
            <span className="vc-assignment-sublabel">Background opacity</span>
            <div className="vc-region-slider-row">
              <input
                type="range"
                className="vc-float-opacity-slider"
                min={0}
                max={100}
                step={1}
                value={resolvedBackgroundOpacityPct ?? gridDesign.floatBackground.opacityPct}
                onChange={(e) => patchAppearance({ backgroundOpacityPct: Number(e.target.value) })}
              />
              <span className="vc-float-opacity-value">
                {resolvedBackgroundOpacityPct ?? gridDesign.floatBackground.opacityPct}%
              </span>
            </div>
          </div>
          <div className="vc-field vc-region-field vc-region-field--slider vc-float-opacity-field">
            <span className="vc-assignment-sublabel">Content opacity</span>
            <div className="vc-region-slider-row">
              <input
                type="range"
                className="vc-float-opacity-slider"
                min={0}
                max={100}
                step={1}
                value={resolvedContentOpacityPct ?? 100}
                onChange={(e) => patchAppearance({ contentOpacityPct: Number(e.target.value) })}
              />
              <span className="vc-float-opacity-value">{resolvedContentOpacityPct ?? 100}%</span>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
