/**
 * Shared inset / fit / overflow controls for graphic assignments (host or song).
 */

import type { HostContentCatalog, HostContentItem } from '@shared/hostContent';
import {
  getAssignmentDefaults,
  patchAssignmentOverride,
  type VcAssignmentOverrides,
} from '@shared/vcMode/assignmentSettings';
import type { VcCellContent } from '@shared/vcModeTypes';

import { AssignmentField } from './AssignmentField';

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
      <AssignmentField label="Inset %">
        <div className="vc-assignment-range-row">
          <input
            type="range"
            className="vc-assignment-range"
            min={0}
            max={70}
            value={effectiveInset}
            onChange={(e) => patch('insetPct', Number(e.target.value))}
          />
          <span className="vc-assignment-value">{effectiveInset}%</span>
        </div>
      </AssignmentField>

      <AssignmentField label="Fit mode">
        <select value={effectiveFit} onChange={(e) => patch('fitMode', e.target.value)}>
          <option value="stretch">Stretch</option>
          <option value="max-x">Max size X</option>
          <option value="max-y">Max size Y</option>
          <option value="original">Original size</option>
        </select>
      </AssignmentField>

      {showOverflow ? (
        <AssignmentField label="Overflow">
          <select value={effectiveOverflow} onChange={(e) => patch('overflow', e.target.value)}>
            <option value="static">Static</option>
            <option value="scroll">Scroll</option>
            <option value="auto-scroll">Auto scroll</option>
            <option value="bounce">Bounce</option>
          </select>
        </AssignmentField>
      ) : (
        <AssignmentField label="Playback">
          <select value={effectivePlayback} onChange={(e) => patch('playback', e.target.value)}>
            <option value="loop">Loop</option>
            <option value="once">Play once</option>
            <option value="bounce">Bounce</option>
          </select>
        </AssignmentField>
      )}
    </>
  );
}
