/**
 * Grid Design Settings — background, default typography, grid lines, float lines.
 */

import {
  HOST_FONT_SIZE_IDS,
  HOST_FONT_SIZE_LABELS,
  HOST_FONT_STYLE_IDS,
  HOST_FONT_STYLE_LABELS,
} from '@shared/hostContent';
import {
  DEFAULT_VC_GRID_DESIGN,
  VC_GRID_LINE_STYLE_OPTIONS,
  type VcGridDesignSettings,
  type VcGridLineSettings,
  type VcGridLineStyle,
} from '@shared/vcMode/gridDesign';

import { DesignerOverlayLayer } from './DesignerOverlayLayer';

type GridDesignSettingsPanelProps = {
  gridDesign: VcGridDesignSettings;
  onChange: (gridDesign: VcGridDesignSettings) => void;
  onClose: () => void;
};

function patchTypography(
  gridDesign: VcGridDesignSettings,
  patch: Partial<VcGridDesignSettings['defaultTypography']>,
): VcGridDesignSettings {
  return {
    ...gridDesign,
    defaultTypography: { ...gridDesign.defaultTypography, ...patch },
  };
}

function patchLineSettings(
  gridDesign: VcGridDesignSettings,
  key: 'gridLines' | 'floatLines',
  patch: Partial<VcGridLineSettings>,
): VcGridDesignSettings {
  return {
    ...gridDesign,
    [key]: { ...gridDesign[key], ...patch },
  };
}

function LineSettingsFields({
  lines,
  onPatch,
}: {
  lines: VcGridLineSettings;
  onPatch: (patch: Partial<VcGridLineSettings>) => void;
}) {
  return (
    <div className="vc-grid-design-lines-row">
      <label className="vc-field">
        <span>Style</span>
        <select value={lines.style} onChange={(e) => onPatch({ style: e.target.value as VcGridLineStyle })}>
          {VC_GRID_LINE_STYLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label className="vc-field">
        <span>Thickness</span>
        <input
          type="range"
          min={0}
          max={20}
          value={lines.thicknessPx}
          onChange={(e) => onPatch({ thicknessPx: Number(e.target.value) })}
        />
        <span className="vc-assignment-value">{lines.thicknessPx}px</span>
      </label>
      <label className="vc-field">
        <span>Color</span>
        <input type="color" value={lines.color} onChange={(e) => onPatch({ color: e.target.value })} />
      </label>
    </div>
  );
}

export function GridDesignSettingsPanel({
  gridDesign,
  onChange,
  onClose,
}: GridDesignSettingsPanelProps) {
  const typography = gridDesign.defaultTypography;

  return (
    <DesignerOverlayLayer ariaLabel="Grid design settings" onClose={onClose} className="vc-grid-design-panel">
      <header className="vc-region-popover-header">
        <h3>Grid Design Settings</h3>
        <button type="button" className="vc-region-popover-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>

      <div className="vc-grid-design-body">
        <section className="vc-grid-design-section">
          <h4>Background color</h4>
          <label className="vc-field vc-field-inline">
            <input
              type="color"
              value={gridDesign.backgroundColor}
              onChange={(e) => onChange({ ...gridDesign, backgroundColor: e.target.value })}
            />
            <span>{gridDesign.backgroundColor}</span>
          </label>
        </section>

        <section className="vc-grid-design-section">
          <h4>Default typography</h4>
          <p className="vc-grid-design-note">Applies to text content unless overridden per assignment.</p>
          <div className="vc-grid-design-typography-row">
            <label className="vc-field">
              <span>Font style</span>
              <select
                value={typography.fontStyle}
                onChange={(e) =>
                  onChange(patchTypography(gridDesign, { fontStyle: e.target.value as typeof typography.fontStyle }))
                }
              >
                {HOST_FONT_STYLE_IDS.map((styleId) => (
                  <option key={styleId} value={styleId}>
                    {HOST_FONT_STYLE_LABELS[styleId]}
                  </option>
                ))}
              </select>
            </label>
            <label className="vc-field">
              <span>Font size</span>
              <select
                value={typography.fontSize}
                onChange={(e) =>
                  onChange(patchTypography(gridDesign, { fontSize: e.target.value as typeof typography.fontSize }))
                }
              >
                {HOST_FONT_SIZE_IDS.map((sizeId) => (
                  <option key={sizeId} value={sizeId}>
                    {HOST_FONT_SIZE_LABELS[sizeId]}
                  </option>
                ))}
              </select>
            </label>
            <label className="vc-field">
              <span>Font color</span>
              <input
                type="color"
                value={typography.color}
                onChange={(e) => onChange(patchTypography(gridDesign, { color: e.target.value }))}
              />
            </label>
          </div>
        </section>

        <section className="vc-grid-design-section">
          <h4>Grid lines</h4>
          <p className="vc-grid-design-note">Divider lines between template areas.</p>
          <LineSettingsFields
            lines={gridDesign.gridLines}
            onPatch={(patch) => onChange(patchLineSettings(gridDesign, 'gridLines', patch))}
          />
        </section>

        <section className="vc-grid-design-section">
          <h4>Float lines</h4>
          <p className="vc-grid-design-note">Default outline for all floats.</p>
          <LineSettingsFields
            lines={gridDesign.floatLines}
            onPatch={(patch) => onChange(patchLineSettings(gridDesign, 'floatLines', patch))}
          />
        </section>

        <div className="vc-grid-design-actions">
          <button type="button" className="btn" onClick={() => onChange({ ...DEFAULT_VC_GRID_DESIGN })}>
            Reset to defaults
          </button>
        </div>
      </div>
    </DesignerOverlayLayer>
  );
}
