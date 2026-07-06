/**
 * Assignment settings for interactive VC song slots (seek bar, player controls, upcoming covers).
 */

import type { VcAssignmentOverrides } from '@shared/vcMode/assignmentSettings';
import type { VcCellContent, VcSongSlotSettings } from '@shared/vcModeTypes';

type InteractiveSongAssignmentControlsProps = {
  content: VcCellContent;
  settings: VcSongSlotSettings;
  onChange: (settings: VcSongSlotSettings) => void;
};

function patchOverrides(
  settings: VcSongSlotSettings,
  patch: Partial<VcAssignmentOverrides>,
): VcSongSlotSettings {
  return { overrides: { ...settings.overrides, ...patch } };
}

export function InteractiveSongAssignmentControls({
  content,
  settings,
  onChange,
}: InteractiveSongAssignmentControlsProps) {
  const overrides = settings.overrides;

  if (content === 'player-controls') {
    return (
      <>
        <label className="vc-field">
          <span>Control scale (%)</span>
          <input
            type="range"
            min={100}
            max={200}
            step={5}
            value={overrides.controlScalePct ?? 100}
            onChange={(e) => onChange(patchOverrides(settings, { controlScalePct: Number(e.target.value) }))}
          />
          <span className="vc-field-hint">{overrides.controlScalePct ?? 100}%</span>
        </label>
        <p className="vc-assignment-hint">Float only. Back, play/pause, forward, and seek bar — no repeat or shuffle.</p>
      </>
    );
  }

  if (content === 'seek-bar') {
    return (
      <>
        <label className="vc-field vc-field-inline">
          <input
            type="checkbox"
            checked={overrides.seekIncludeTransport ?? false}
            onChange={(e) => onChange(patchOverrides(settings, { seekIncludeTransport: e.target.checked }))}
          />
          <span>Include forward &amp; back</span>
        </label>
        <label className="vc-field vc-field-inline">
          <input
            type="checkbox"
            checked={overrides.seekClickable ?? true}
            onChange={(e) => onChange(patchOverrides(settings, { seekClickable: e.target.checked }))}
          />
          <span>Clickable</span>
        </label>
        <p className="vc-assignment-hint">Typography uses the same title-text assignment settings as other song text slots.</p>
      </>
    );
  }

  if (content === 'upcoming-covers') {
    return (
      <>
        <label className="vc-field">
          <span>Layout</span>
          <select
            value={overrides.upcomingLayout ?? 'overflow'}
            onChange={(e) =>
              onChange(
                patchOverrides(settings, {
                  upcomingLayout: e.target.value as 'gallery' | 'overflow',
                }),
              )
            }
          >
            <option value="overflow">Overflow (horizontal row)</option>
            <option value="gallery">Gallery (multi-row scroll)</option>
          </select>
        </label>
        <p className="vc-assignment-hint">
          Single-click enlarges a cover; double-click jumps to that song. Covers are at least 120px wide with 20px gaps.
        </p>
      </>
    );
  }

  return null;
}
