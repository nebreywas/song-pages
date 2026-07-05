/**
 * Shared inset / fit / overflow controls for graphic assignments (host or song).
 */

import type { HostContentCatalog, HostContentItem } from '@shared/hostContent';
import {
  getAssignmentDefaults,
  isOverrideActive,
  patchAssignmentOverride,
  type VcAssignmentOverrides,
} from '@shared/vcMode/assignmentSettings';
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

type GraphicAssignmentControlsProps = {
  content: VcCellContent;
  item: HostContentItem | null;
  catalog: HostContentCatalog;
  overrides: VcAssignmentOverrides;
  onOverridesChange: (overrides: VcAssignmentOverrides) => void;
  showOverflow: boolean;
};

function patchOverrides(
  content: VcCellContent,
  item: HostContentItem | null,
  catalog: HostContentCatalog,
  overrides: VcAssignmentOverrides,
  key: keyof VcAssignmentOverrides,
  value: unknown,
): VcAssignmentOverrides {
  return patchAssignmentOverride(content, item, catalog, overrides, key, value);
}

export function GraphicAssignmentControls({
  content,
  item,
  catalog,
  overrides,
  onOverridesChange,
  showOverflow,
}: GraphicAssignmentControlsProps) {
  const defaults = getAssignmentDefaults(content, item, catalog);

  const effectiveInset = overrides.insetPct ?? defaults.insetPct ?? 0;
  const effectiveFit = overrides.fitMode ?? defaults.fitMode ?? 'stretch';
  const effectiveOverflow = overrides.overflow ?? defaults.overflow ?? 'static';
  const effectivePlayback = overrides.playback ?? defaults.playback ?? 'loop';

  const patch = (key: keyof VcAssignmentOverrides, value: unknown) =>
    onOverridesChange(patchOverrides(content, item, catalog, overrides, key, value));

  return (
    <>
      <OverrideField
        label="Inset %"
        overridden={isOverrideActive(content, item, catalog, overrides, 'insetPct')}
        onReset={() => patch('insetPct', defaults.insetPct)}
      >
        <input
          type="range"
          min={0}
          max={70}
          value={effectiveInset}
          onChange={(e) => patch('insetPct', Number(e.target.value))}
        />
        <span className="vc-assignment-value">{effectiveInset}%</span>
      </OverrideField>

      <OverrideField
        label="Fit mode"
        overridden={isOverrideActive(content, item, catalog, overrides, 'fitMode')}
        onReset={() => patch('fitMode', defaults.fitMode)}
      >
        <select value={effectiveFit} onChange={(e) => patch('fitMode', e.target.value)}>
          <option value="stretch">Stretch</option>
          <option value="max-x">Max size X</option>
          <option value="max-y">Max size Y</option>
          <option value="original">Original size</option>
        </select>
      </OverrideField>

      {showOverflow ? (
        <OverrideField
          label="Overflow"
          overridden={isOverrideActive(content, item, catalog, overrides, 'overflow')}
          onReset={() => patch('overflow', defaults.overflow)}
        >
          <select value={effectiveOverflow} onChange={(e) => patch('overflow', e.target.value)}>
            <option value="static">Static</option>
            <option value="scroll">Scroll</option>
            <option value="auto-scroll">Auto scroll</option>
            <option value="bounce">Bounce</option>
          </select>
        </OverrideField>
      ) : (
        <OverrideField
          label="Playback"
          overridden={isOverrideActive(content, item, catalog, overrides, 'playback')}
          onReset={() => patch('playback', defaults.playback)}
        >
          <select value={effectivePlayback} onChange={(e) => patch('playback', e.target.value)}>
            <option value="loop">Loop</option>
            <option value="once">Play once</option>
            <option value="bounce">Bounce</option>
          </select>
        </OverrideField>
      )}
    </>
  );
}
