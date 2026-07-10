/**
 * Assignment settings for interactive VC song slots (seek bar, player controls, upcoming covers).
 */

import {
  VC_UPCOMING_SCROLL_OPTIONS,
  type VcAssignmentOverrides,
  type VcUpcomingLayout,
  type VcUpcomingScroll,
} from '@shared/vcMode/assignmentSettings';
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
    const layout = overrides.upcomingLayout ?? 'single-row';
    const scrollOptions =
      layout === 'multi-row'
        ? VC_UPCOMING_SCROLL_OPTIONS.map((opt) =>
            opt.value.startsWith('marquee')
              ? { ...opt, label: opt.label.replace('left', 'down') }
              : opt.value.startsWith('bounce')
                ? { ...opt, label: opt.label.replace('left', 'down') }
                : opt,
          )
        : VC_UPCOMING_SCROLL_OPTIONS;

    return (
      <>
        <label className="vc-field">
          <span>Layout</span>
          <select
            value={layout}
            onChange={(e) =>
              onChange(
                patchOverrides(settings, {
                  upcomingLayout: e.target.value as VcUpcomingLayout,
                }),
              )
            }
          >
            <option value="single-row">Single row</option>
            <option value="multi-row">Multi-row</option>
          </select>
        </label>

        <label className="vc-field">
          <span>Overflow motion</span>
          <select
            value={overrides.upcomingScroll ?? 'static'}
            onChange={(e) =>
              onChange(
                patchOverrides(settings, {
                  upcomingScroll: e.target.value as VcUpcomingScroll,
                }),
              )
            }
          >
            {scrollOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="vc-field vc-field-inline">
          <input
            type="checkbox"
            checked={overrides.upcomingShowArtist ?? false}
            onChange={(e) => onChange(patchOverrides(settings, { upcomingShowArtist: e.target.checked }))}
          />
          <span>Artist name?</span>
        </label>

        <label className="vc-field vc-field-inline">
          <input
            type="checkbox"
            checked={overrides.upcomingShowTitle ?? false}
            onChange={(e) => onChange(patchOverrides(settings, { upcomingShowTitle: e.target.checked }))}
          />
          <span>Show title?</span>
        </label>

        <label className="vc-field vc-field-inline">
          <input
            type="checkbox"
            checked={overrides.upcomingClickToZoom ?? false}
            onChange={(e) => onChange(patchOverrides(settings, { upcomingClickToZoom: e.target.checked }))}
          />
          <span>Click to zoom?</span>
        </label>

        <label className="vc-field">
          <span>Label color</span>
          <input
            type="color"
            value={overrides.color ?? '#ffffff'}
            onChange={(e) => onChange(patchOverrides(settings, { color: e.target.value }))}
          />
        </label>

        <p className="vc-assignment-hint">
          Covers fit the region with even spacing. Static mode shows only what fits (centered when fewer).
          Double-click a cover to jump to that song. Zoom mode: click to enlarge, Esc or click outside to close.
        </p>
      </>
    );
  }

  return null;
}
