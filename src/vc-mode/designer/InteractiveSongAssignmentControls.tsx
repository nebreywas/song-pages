/**
 * Assignment settings for interactive VC song slots
 * (seek bar, player controls, upcoming covers, source, song URL, WaveSurfer).
 */

import { useMemo } from 'react';

import {
  VC_SOURCE_DISPLAY_MODE_LABELS,
  VC_SOURCE_DISPLAY_MODE_IDS,
  type VcSourceDisplayMode,
} from '@shared/vcMode/songSourceDisplay';
import {
  resolveWavesurferPresentation,
  VC_UPCOMING_SCROLL_OPTIONS,
  VC_WAVESURFER_VIEW_MODE_IDS,
  VC_WAVESURFER_VIEW_MODE_LABELS,
  type VcAssignmentOverrides,
  type VcUpcomingLayout,
  type VcUpcomingScroll,
  type VcWavesurferViewMode,
} from '@shared/vcMode/assignmentSettings';
import type { VcCellContent, VcPlaybackState, VcSongSlotSettings } from '@shared/vcModeTypes';
import {
  DESIGNER_WAVESURFER_PEAKS,
  VcWavesurferView,
} from '../../vc-window/VcWavesurferView';

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

  if (content === 'source') {
    return (
      <>
        <label className="vc-field">
          <span>Display</span>
          <select
            value={overrides.sourceDisplayMode ?? 'both'}
            onChange={(e) =>
              onChange(
                patchOverrides(settings, {
                  sourceDisplayMode: e.target.value as VcSourceDisplayMode,
                }),
              )
            }
          >
            {VC_SOURCE_DISPLAY_MODE_IDS.map((id) => (
              <option key={id} value={id}>
                {VC_SOURCE_DISPLAY_MODE_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
        <label className="vc-field vc-field-inline">
          <input
            type="checkbox"
            checked={overrides.sourceOpenInBrowser ?? false}
            onChange={(e) => onChange(patchOverrides(settings, { sourceOpenInBrowser: e.target.checked }))}
          />
          <span>Click to open in browser</span>
        </label>
        <p className="vc-assignment-hint">
          Shows YouTube, Suno, SoundCloud, Flow, or Artist Page for the current track.
        </p>
      </>
    );
  }

  if (content === 'song-url') {
    return (
      <>
        <label className="vc-field vc-field-inline">
          <input
            type="checkbox"
            checked={overrides.songUrlRootOnly ?? false}
            onChange={(e) => onChange(patchOverrides(settings, { songUrlRootOnly: e.target.checked }))}
          />
          <span>Just root of source</span>
        </label>
        <label className="vc-field vc-field-inline">
          <input
            type="checkbox"
            checked={overrides.songUrlIncludeHttps ?? false}
            onChange={(e) => onChange(patchOverrides(settings, { songUrlIncludeHttps: e.target.checked }))}
          />
          <span>Include https://</span>
        </label>
        <label className="vc-field vc-field-inline">
          <input
            type="checkbox"
            checked={overrides.songUrlUnderline ?? false}
            onChange={(e) => onChange(patchOverrides(settings, { songUrlUnderline: e.target.checked }))}
          />
          <span>Underline?</span>
        </label>
        <label className="vc-field vc-field-inline">
          <input
            type="checkbox"
            checked={overrides.songUrlHoverEffect ?? false}
            onChange={(e) => onChange(patchOverrides(settings, { songUrlHoverEffect: e.target.checked }))}
          />
          <span>Hover effect</span>
        </label>
        <p className="vc-assignment-hint">
          Default shows the full share URL without https://, with no underline or hover.
        </p>
      </>
    );
  }

  if (content === 'wavesurfer') {
    return <WavesurferAssignmentControls settings={settings} onChange={onChange} />;
  }

  return null;
}

const DESIGNER_PREVIEW_PLAYBACK: VcPlaybackState = {
  currentTime: 8,
  duration: 30,
  isPlaying: true,
};

function WavesurferAssignmentControls({
  settings,
  onChange,
}: {
  settings: VcSongSlotSettings;
  onChange: (settings: VcSongSlotSettings) => void;
}) {
  const overrides = settings.overrides;
  const presentation = useMemo(() => resolveWavesurferPresentation(overrides), [overrides]);
  const showBarControls = presentation.viewMode === 'barwave';

  return (
    <>
      <label className="vc-field">
        <span>View</span>
        <select
          value={presentation.viewMode}
          onChange={(e) =>
            onChange(
              patchOverrides(settings, {
                wavesurferViewMode: e.target.value as VcWavesurferViewMode,
              }),
            )
          }
        >
          {VC_WAVESURFER_VIEW_MODE_IDS.map((id) => (
            <option key={id} value={id}>
              {VC_WAVESURFER_VIEW_MODE_LABELS[id]}
            </option>
          ))}
        </select>
      </label>

      {showBarControls ? (
        <>
          <label className="vc-field">
            <span>Bar width</span>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={presentation.barWidth}
              onChange={(e) =>
                onChange(patchOverrides(settings, { wavesurferBarWidth: Number(e.target.value) }))
              }
            />
            <span className="vc-field-hint">{presentation.barWidth}px</span>
          </label>
          <label className="vc-field">
            <span>Bar gap</span>
            <input
              type="range"
              min={0}
              max={12}
              step={1}
              value={presentation.barGap}
              onChange={(e) =>
                onChange(patchOverrides(settings, { wavesurferBarGap: Number(e.target.value) }))
              }
            />
            <span className="vc-field-hint">{presentation.barGap}px</span>
          </label>
        </>
      ) : null}

      <label className="vc-field vc-field-inline">
        <input
          type="checkbox"
          checked={presentation.paintProgress}
          onChange={(e) =>
            onChange(patchOverrides(settings, { wavesurferPaintProgress: e.target.checked }))
          }
        />
        <span>Paint progress</span>
      </label>

      <div className="vc-wavesurfer-assignment-preview" aria-label="WaveSurfer preview">
        <VcWavesurferView
          presentation={presentation}
          playback={DESIGNER_PREVIEW_PLAYBACK}
          previewPeaks={DESIGNER_WAVESURFER_PEAKS}
          previewDuration={30}
        />
      </div>
      <p className="vc-assignment-hint">
        Live VC shows WaveSurfer only when the track has a direct audio URL (e.g. Suno / Flow MP3).
        HLS / YouTube / SoundCloud leave the cell empty. Preview above uses synthetic peaks.
      </p>
    </>
  );
}
