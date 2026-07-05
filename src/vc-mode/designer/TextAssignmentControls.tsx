/**
 * Shared font/color controls for text assignments (host or song).
 */

import {
  HOST_FONT_SIZE_IDS,
  HOST_FONT_SIZE_LABELS,
  HOST_FONT_STYLE_IDS,
  HOST_FONT_STYLE_LABELS,
  type HostContentCatalog,
  type HostContentItem,
} from '@shared/hostContent';
import {
  getAssignmentDefaults,
  isOverrideActive,
  patchAssignmentOverride,
  type VcAssignmentOverrides,
} from '@shared/vcMode/assignmentSettings';
import type { VcGridDefaultTypography } from '@shared/vcMode/gridDesign';
import type { VcCellContent } from '@shared/vcModeTypes';

function OverrideField({
  label,
  overridden,
  onReset,
  children,
}: {
  label: string;
  overridden: boolean;
  onReset: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`vc-assignment-field${overridden ? ' is-overridden' : ''}`}>
      <div className="vc-assignment-field-head">
        <span>{label}</span>
        {overridden ? (
          <button type="button" className="vc-assignment-reset" onClick={onReset}>
            Reset
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

type TextAssignmentControlsProps = {
  content: VcCellContent;
  item: HostContentItem | null;
  catalog: HostContentCatalog;
  gridTypography?: VcGridDefaultTypography;
  overrides: VcAssignmentOverrides;
  onOverridesChange: (overrides: VcAssignmentOverrides) => void;
  showAllCaps: boolean;
  showMarkdown: boolean;
};

function patchOverrides(
  content: VcCellContent,
  item: HostContentItem | null,
  catalog: HostContentCatalog,
  gridTypography: VcGridDefaultTypography | undefined,
  overrides: VcAssignmentOverrides,
  key: keyof VcAssignmentOverrides,
  value: unknown,
): VcAssignmentOverrides {
  return patchAssignmentOverride(content, item, catalog, overrides, key, value, gridTypography);
}

export function TextAssignmentControls({
  content,
  item,
  catalog,
  gridTypography,
  overrides,
  onOverridesChange,
  showAllCaps,
  showMarkdown,
}: TextAssignmentControlsProps) {
  const defaults = getAssignmentDefaults(content, item, catalog, gridTypography);

  const fontStyle = overrides.fontStyle ?? defaults.fontStyle ?? 'clean';
  const fontSize = overrides.fontSize ?? defaults.fontSize ?? 'medium';
  const color = overrides.color ?? defaults.color ?? '#ffffff';
  const allCaps = overrides.allCaps ?? defaults.allCaps ?? false;
  const markdownSource = overrides.markdownSource ?? defaults.markdownSource ?? false;

  const patch = (key: keyof VcAssignmentOverrides, value: unknown) =>
    onOverridesChange(patchOverrides(content, item, catalog, gridTypography, overrides, key, value));

  return (
    <>
      <OverrideField
        label="Font style"
        overridden={isOverrideActive(content, item, catalog, overrides, 'fontStyle')}
        onReset={() => patch('fontStyle', defaults.fontStyle)}
      >
        <select value={fontStyle} onChange={(e) => patch('fontStyle', e.target.value)}>
          {HOST_FONT_STYLE_IDS.map((styleId) => (
            <option key={styleId} value={styleId}>
              {HOST_FONT_STYLE_LABELS[styleId]}
            </option>
          ))}
        </select>
      </OverrideField>

      <OverrideField
        label="Font size"
        overridden={isOverrideActive(content, item, catalog, overrides, 'fontSize')}
        onReset={() => patch('fontSize', defaults.fontSize)}
      >
        <select value={fontSize} onChange={(e) => patch('fontSize', e.target.value)}>
          {HOST_FONT_SIZE_IDS.map((sizeId) => (
            <option key={sizeId} value={sizeId}>
              {HOST_FONT_SIZE_LABELS[sizeId]}
            </option>
          ))}
        </select>
      </OverrideField>

      <OverrideField
        label="Color"
        overridden={isOverrideActive(content, item, catalog, overrides, 'color')}
        onReset={() => patch('color', defaults.color)}
      >
        <input type="color" value={color} onChange={(e) => patch('color', e.target.value)} />
      </OverrideField>

      {showAllCaps ? (
        <OverrideField
          label="All caps"
          overridden={isOverrideActive(content, item, catalog, overrides, 'allCaps')}
          onReset={() => patch('allCaps', defaults.allCaps)}
        >
          <label className="vc-field vc-field-inline">
            <input
              type="checkbox"
              checked={allCaps}
              onChange={(e) => patch('allCaps', e.target.checked)}
            />
            <span>All caps</span>
          </label>
        </OverrideField>
      ) : null}

      {showMarkdown ? (
        <OverrideField
          label="Display"
          overridden={isOverrideActive(content, item, catalog, overrides, 'markdownSource')}
          onReset={() => patch('markdownSource', defaults.markdownSource)}
        >
          <label className="vc-field vc-field-inline">
            <input
              type="checkbox"
              checked={!markdownSource}
              onChange={(e) => patch('markdownSource', !e.target.checked)}
            />
            <span>Always plain text</span>
          </label>
        </OverrideField>
      ) : null}
    </>
  );
}
