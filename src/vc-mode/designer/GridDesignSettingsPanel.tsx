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
  DEFAULT_VC_FULLSCREEN_GRAPHIC,
  VC_GRID_LINE_STYLE_OPTIONS,
  type VcGridDesignSettings,
  type VcGridLineSettings,
  type VcGridLineStyle,
} from '@shared/vcMode/gridDesign';
import { listItemsByType, type HostContentCatalog } from '@shared/hostContent';

import { DesignerOverlayLayer } from './DesignerOverlayLayer';
import { HostGraphicPreviewBox } from './HostGraphicPreviewBox';
import { VcColorField } from '../../components/color/VcColorField';

type GridDesignSettingsPanelProps = {
  gridDesign: VcGridDesignSettings;
  hostCatalog: HostContentCatalog;
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

/** Thumbnail beside fullscreen graphic controls; empty box until a graphic is selected. */
function FullscreenGraphicPreview({
  itemId,
  catalog,
  opacityPct,
}: {
  itemId: string | null;
  catalog: HostContentCatalog;
  opacityPct: number;
}) {
  return (
    <HostGraphicPreviewBox
      itemId={itemId}
      catalog={catalog}
      opacityPct={opacityPct}
      className="vc-grid-design-fullscreen-preview"
      imageClassName="vc-grid-design-fullscreen-preview-image"
    />
  );
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
      <label className="vc-field vc-grid-design-line-field">
        <span>Style</span>
        <select value={lines.style} onChange={(e) => onPatch({ style: e.target.value as VcGridLineStyle })}>
          {VC_GRID_LINE_STYLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label className="vc-field vc-grid-design-line-field vc-grid-design-thickness-field">
        <span>Thickness</span>
        <div className="vc-grid-design-thickness-row">
          <input
            type="range"
            min={0}
            max={20}
            value={lines.thicknessPx}
            onChange={(e) => onPatch({ thicknessPx: Number(e.target.value) })}
            aria-label="Line thickness"
          />
          <span className="vc-assignment-value">{lines.thicknessPx}px</span>
        </div>
      </label>
      <label className="vc-field vc-grid-design-line-field vc-grid-design-line-color-field">
        <span>Color</span>
        <VcColorField
          variant="compact"
          value={lines.color}
          onChange={(color) => onPatch({ color })}
          aria-label="Line color"
        />
      </label>
    </div>
  );
}

export function GridDesignSettingsPanel({
  gridDesign,
  hostCatalog,
  onChange,
  onClose,
}: GridDesignSettingsPanelProps) {
  const typography = gridDesign.defaultTypography;
  const graphicOptions = listItemsByType(hostCatalog, 'graphic');
  const fullscreenGraphic = gridDesign.fullscreenGraphic ?? DEFAULT_VC_FULLSCREEN_GRAPHIC;

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
          <h4>Overall background color</h4>
          <p className="vc-grid-design-note">Sets the default color for your VC mode surface</p>
          <label className="vc-field vc-grid-design-swatch-field">
            <VcColorField
              variant="compact"
              value={gridDesign.backgroundColor}
              onChange={(backgroundColor) => onChange({ ...gridDesign, backgroundColor })}
              aria-label="Overall background color"
            />
          </label>
        </section>

        <section className="vc-grid-design-section">
          <h4>Fullscreen graphic</h4>
          <p className="vc-grid-design-note">
            Stretches selected host graphic beneath entire surface area
          </p>
          <div className="vc-grid-design-fullscreen-row">
            <div className="vc-grid-design-fullscreen-controls">
              <label className="vc-field">
                <span>Graphic</span>
                <select
                  value={fullscreenGraphic.itemId ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...gridDesign,
                      fullscreenGraphic: {
                        ...fullscreenGraphic,
                        itemId: e.target.value || null,
                      },
                    })
                  }
                >
                  <option value="">None</option>
                  {graphicOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="vc-field vc-grid-design-opacity-field">
                <span>Opacity</span>
                <div className="vc-grid-design-slider-row">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    disabled={!fullscreenGraphic.itemId}
                    value={fullscreenGraphic.opacityPct}
                    onChange={(e) =>
                      onChange({
                        ...gridDesign,
                        fullscreenGraphic: {
                          ...fullscreenGraphic,
                          opacityPct: Number(e.target.value),
                        },
                      })
                    }
                  />
                  <span className="vc-assignment-value">{fullscreenGraphic.opacityPct}%</span>
                </div>
              </label>
            </div>
            <FullscreenGraphicPreview
              itemId={fullscreenGraphic.itemId}
              catalog={hostCatalog}
              opacityPct={fullscreenGraphic.opacityPct}
            />
          </div>
        </section>

        <section className="vc-grid-design-section">
          <h4>Default typography</h4>
          <p className="vc-grid-design-note">Applies to text content unless overridden per assignment.</p>
          <div className="vc-grid-design-typography-row">
            <label className="vc-field vc-grid-design-typography-field">
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
            <label className="vc-field vc-grid-design-typography-field">
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
            <label className="vc-field vc-grid-design-typography-field">
              <span>Color</span>
              <VcColorField
                variant="compact"
                value={typography.color}
                onChange={(color) => onChange(patchTypography(gridDesign, { color }))}
                aria-label="Default font color"
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

        <section className="vc-grid-design-section">
          <h4>Default float background</h4>
          <p className="vc-grid-design-note">
            Default fill behind float content. Each float can override in Float layout.
          </p>
          <div className="vc-grid-design-float-background-row">
            <label className="vc-field vc-grid-design-float-color-field">
              <span>Color</span>
              <VcColorField
                variant="compact"
                value={gridDesign.floatBackground.color}
                onChange={(color) =>
                  onChange({
                    ...gridDesign,
                    floatBackground: { ...gridDesign.floatBackground, color },
                  })
                }
                aria-label="Default float background color"
              />
            </label>
            <label className="vc-field vc-grid-design-opacity-field">
              <span>Background opacity</span>
              <div className="vc-grid-design-slider-row">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={gridDesign.floatBackground.opacityPct}
                  onChange={(e) =>
                    onChange({
                      ...gridDesign,
                      floatBackground: {
                        ...gridDesign.floatBackground,
                        opacityPct: Number(e.target.value),
                      },
                    })
                  }
                />
                <span className="vc-assignment-value">{gridDesign.floatBackground.opacityPct}%</span>
              </div>
            </label>
          </div>
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
