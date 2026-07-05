/**
 * Per-assignment settings for song content slots — routes to the matching host rule set.
 */

import type { HostContentCatalog } from '@shared/hostContent';
import { clearAllAssignmentOverrides } from '@shared/vcMode/assignmentSettings';
import type { VcGridDesignSettings } from '@shared/vcMode/gridDesign';
import {
  SONG_CONTENT_SETTINGS_RULE,
  type SongContentSettingsRule,
  type VcCellContent,
  type VcSongSlotSettings,
} from '@shared/vcModeTypes';

import { GraphicAssignmentControls } from './GraphicAssignmentControls';
import { TextAssignmentControls } from './TextAssignmentControls';

const SETTINGS_HINT: Record<SongContentSettingsRule, string> = {
  graphic: 'Defaults match Host Graphic settings unless overridden here.',
  video: 'Defaults match Host Video settings unless overridden here.',
  'title-text': 'Defaults match Host Title Text settings unless overridden here.',
  'area-text': 'Defaults match Host Area Text settings unless overridden here.',
};

type SongAssignmentSettingsProps = {
  content: VcCellContent;
  settings: VcSongSlotSettings;
  catalog: HostContentCatalog;
  gridDesign: VcGridDesignSettings;
  onChange: (settings: VcSongSlotSettings) => void;
};

export function SongAssignmentSettings({
  content,
  settings,
  catalog,
  gridDesign,
  onChange,
}: SongAssignmentSettingsProps) {
  const rule = SONG_CONTENT_SETTINGS_RULE[content];
  const hasOverrides = Object.keys(settings.overrides).length > 0;

  if (!rule) return null;

  return (
    <section className="vc-host-assignment-settings">
      <div className="vc-host-assignment-settings-head">
        <h4>Assignment settings</h4>
        {hasOverrides ? (
          <button
            type="button"
            className="btn vc-assignment-clear"
            onClick={() => onChange({ overrides: clearAllAssignmentOverrides(content, settings.overrides) })}
          >
            Clear all overrides
          </button>
        ) : null}
      </div>

      {rule === 'graphic' ? (
        <GraphicAssignmentControls
          content={content}
          item={null}
          catalog={catalog}
          overrides={settings.overrides}
          onOverridesChange={(overrides) => onChange({ overrides })}
          showOverflow
        />
      ) : rule === 'video' ? (
        <GraphicAssignmentControls
          content={content}
          item={null}
          catalog={catalog}
          overrides={settings.overrides}
          onOverridesChange={(overrides) => onChange({ overrides })}
          showOverflow={false}
        />
      ) : rule === 'title-text' ? (
        <TextAssignmentControls
          content={content}
          item={null}
          catalog={catalog}
          gridTypography={gridDesign.defaultTypography}
          overrides={settings.overrides}
          onOverridesChange={(overrides) => onChange({ overrides })}
          showAllCaps
          showMarkdown={false}
        />
      ) : (
        <TextAssignmentControls
          content={content}
          item={null}
          catalog={catalog}
          gridTypography={gridDesign.defaultTypography}
          overrides={settings.overrides}
          onOverridesChange={(overrides) => onChange({ overrides })}
          showAllCaps={false}
          showMarkdown
        />
      )}

      <p className="vc-assignment-hint">{SETTINGS_HINT[rule]}</p>
    </section>
  );
}
