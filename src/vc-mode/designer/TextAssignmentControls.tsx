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
  DEFAULT_VC_LYRIC_TRACKING,
  DEFAULT_VC_TEXT_ALIGN,
  DEFAULT_VC_TITLE_OVERFLOW,
  getAssignmentDefaults,
  patchAssignmentOverride,
  VC_LYRIC_TRACKING_IDS,
  VC_LYRIC_TRACKING_LABELS,
  VC_TEXT_ALIGN_IDS,
  VC_TEXT_ALIGN_LABELS,
  VC_TITLE_OVERFLOW_OPTIONS,
  type VcAssignmentOverrides,
  type VcLyricTracking,
  type VcTextAlign,
  type VcTitleOverflow,
} from '@shared/vcMode/assignmentSettings';
import type { VcGridDefaultTypography } from '@shared/vcMode/gridDesign';
import type { VcCellContent } from '@shared/vcModeTypes';

import { AssignmentField } from './AssignmentField';
import { VcColorField } from '../../components/color/VcColorField';

type TextAssignmentControlsProps = {
  content: VcCellContent;
  item: HostContentItem | null;
  catalog: HostContentCatalog;
  gridTypography?: VcGridDefaultTypography;
  overrides: VcAssignmentOverrides;
  onOverridesChange: (overrides: VcAssignmentOverrides) => void;
  showAllCaps: boolean;
  showMarkdown: boolean;
  /** Host title + song title — single-line overflow behavior. */
  showTitleOverflow?: boolean;
  /** Lyrics-only: top/bottom edge fade while scrolling. */
  showLyricsEdgeFade?: boolean;
  /** Lyrics-only: hide [bracketed annotation] segments. */
  showLyricsRemoveBracketed?: boolean;
  /** Lyrics-only: Simple Scroll vs ALARE tracking mode. */
  showLyricsTracking?: boolean;
  /** Vertical lyrics + ALARE only — fade profile and visible-line target. */
  showAlareFineTuning?: boolean;
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
  showTitleOverflow = false,
  showLyricsEdgeFade = false,
  showLyricsRemoveBracketed = false,
  showLyricsTracking = false,
  showAlareFineTuning = false,
}: TextAssignmentControlsProps) {
  const defaults = getAssignmentDefaults(content, item, catalog, gridTypography);

  const fontStyle = overrides.fontStyle ?? defaults.fontStyle ?? 'clean';
  const fontSize = overrides.fontSize ?? defaults.fontSize ?? 'medium';
  const color = overrides.color ?? defaults.color ?? '#ffffff';
  const allCaps = overrides.allCaps ?? defaults.allCaps ?? false;
  const markdownSource = overrides.markdownSource ?? defaults.markdownSource ?? false;
  const textAlign = overrides.textAlign ?? defaults.textAlign ?? DEFAULT_VC_TEXT_ALIGN;
  const lyricsEdgeFade = overrides.lyricsEdgeFade ?? defaults.lyricsEdgeFade ?? true;
  const lyricsRemoveBracketed =
    overrides.lyricsRemoveBracketed ?? defaults.lyricsRemoveBracketed ?? false;
  const lyricTracking = overrides.lyricTracking ?? defaults.lyricTracking ?? DEFAULT_VC_LYRIC_TRACKING;
  const alareFadeEnabled = overrides.alareFadeEnabled ?? defaults.alareFadeEnabled ?? true;
  const alareTargetVisibleLines = overrides.alareTargetVisibleLines ?? defaults.alareTargetVisibleLines;
  const isAlare = lyricTracking === 'alare';
  const titleOverflow = (overrides.overflow ??
    defaults.overflow ??
    DEFAULT_VC_TITLE_OVERFLOW) as VcTitleOverflow;

  const patch = (key: keyof VcAssignmentOverrides, value: unknown) =>
    onOverridesChange(patchOverrides(content, item, catalog, gridTypography, overrides, key, value));

  return (
    <>
      <div className="vc-assignment-font-row">
        <label className="vc-assignment-font-field">
          <span>Font style</span>
          <select value={fontStyle} onChange={(e) => patch('fontStyle', e.target.value)}>
            {HOST_FONT_STYLE_IDS.map((styleId) => (
              <option key={styleId} value={styleId}>
                {HOST_FONT_STYLE_LABELS[styleId]}
              </option>
            ))}
          </select>
        </label>

        <label className="vc-assignment-font-field">
          <span>Font size</span>
          <select value={fontSize} onChange={(e) => patch('fontSize', e.target.value)}>
            {HOST_FONT_SIZE_IDS.map((sizeId) => (
              <option key={sizeId} value={sizeId}>
                {HOST_FONT_SIZE_LABELS[sizeId]}
              </option>
            ))}
          </select>
        </label>

        <label className="vc-assignment-font-field vc-assignment-font-color">
          <span>Color</span>
          <VcColorField
            variant="compact"
            value={color}
            onChange={(next) => patch('color', next)}
            aria-label="Text color"
          />
        </label>
      </div>

      <AssignmentField label="Text positioning">
        <select value={textAlign} onChange={(e) => patch('textAlign', e.target.value as VcTextAlign)}>
          {VC_TEXT_ALIGN_IDS.map((alignId) => (
            <option key={alignId} value={alignId}>
              {VC_TEXT_ALIGN_LABELS[alignId]}
            </option>
          ))}
        </select>
      </AssignmentField>

      {showAllCaps ? (
        <AssignmentField label="All caps">
          <label className="vc-field vc-field-inline">
            <input type="checkbox" checked={allCaps} onChange={(e) => patch('allCaps', e.target.checked)} />
            <span>All caps</span>
          </label>
        </AssignmentField>
      ) : null}

      {showLyricsTracking ? (
        <AssignmentField label="Lyric tracking">
          <select
            value={lyricTracking}
            onChange={(e) => patch('lyricTracking', e.target.value as VcLyricTracking)}
          >
            {VC_LYRIC_TRACKING_IDS.map((mode) => (
              <option key={mode} value={mode}>
                {VC_LYRIC_TRACKING_LABELS[mode]}
              </option>
            ))}
          </select>
        </AssignmentField>
      ) : null}

      {showMarkdown && !isAlare ? (
        <AssignmentField label="Display">
          <label className="vc-field vc-field-inline">
            <input
              type="checkbox"
              checked={!markdownSource}
              onChange={(e) => patch('markdownSource', !e.target.checked)}
            />
            <span>Always plain text</span>
          </label>
        </AssignmentField>
      ) : null}

      {showTitleOverflow ? (
        <AssignmentField label="Long title overflow">
          <select
            value={titleOverflow}
            onChange={(e) => patch('overflow', e.target.value as VcTitleOverflow)}
          >
            {VC_TITLE_OVERFLOW_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </AssignmentField>
      ) : null}

      {showLyricsRemoveBracketed && !isAlare ? (
        <AssignmentField label="Bracketed text">
          <label className="vc-field vc-field-inline">
            <input
              type="checkbox"
              checked={lyricsRemoveBracketed}
              onChange={(e) => patch('lyricsRemoveBracketed', e.target.checked)}
            />
            <span>Remove bracketed text</span>
          </label>
        </AssignmentField>
      ) : null}

      {showLyricsEdgeFade && !isAlare ? (
        <AssignmentField label="Scroll fade">
          <label className="vc-field vc-field-inline">
            <input
              type="checkbox"
              checked={lyricsEdgeFade}
              onChange={(e) => patch('lyricsEdgeFade', e.target.checked)}
            />
            <span>Edge fade bars</span>
          </label>
        </AssignmentField>
      ) : null}

      {showAlareFineTuning && isAlare ? (
        <>
          <AssignmentField label="ALARE fade">
            <label className="vc-field vc-field-inline">
              <input
                type="checkbox"
                checked={alareFadeEnabled}
                onChange={(e) => patch('alareFadeEnabled', e.target.checked)}
              />
              <span>Line fade profile</span>
            </label>
          </AssignmentField>
          <AssignmentField label="Target visible lines">
            <input
              type="number"
              min={1}
              max={15}
              placeholder="Auto"
              value={alareTargetVisibleLines ?? ''}
              onChange={(e) => {
                const raw = e.target.value.trim();
                patch('alareTargetVisibleLines', raw === '' ? undefined : Number(raw));
              }}
            />
          </AssignmentField>
        </>
      ) : null}
    </>
  );
}
