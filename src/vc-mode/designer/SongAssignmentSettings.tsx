/**
 * Per-assignment settings for song content slots — routes to the matching host rule set.
 */

import type { HostContentCatalog } from '@shared/hostContent';
import type { VcGridDesignSettings } from '@shared/vcMode/gridDesign';
import {
  SONG_CONTENT_SETTINGS_RULE,
  VC_INTERACTIVE_SONG_CONTENT,
  type VcCellContent,
  type VcSongSlotSettings,
} from '@shared/vcModeTypes';

import { GraphicAssignmentControls } from './GraphicAssignmentControls';
import { AssignmentSettingsIntro } from './AssignmentSettingsIntro';
import { InteractiveSongAssignmentControls } from './InteractiveSongAssignmentControls';
import { TextAssignmentControls } from './TextAssignmentControls';

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

  if (VC_INTERACTIVE_SONG_CONTENT.has(content)) {
    return (
      <section className="vc-host-assignment-settings">
        <AssignmentSettingsIntro content={content} />
        <InteractiveSongAssignmentControls content={content} settings={settings} onChange={onChange} />
        {content === 'seek-bar' ? (
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
        ) : null}
      </section>
    );
  }

  if (!rule) return null;

  return (
    <section className="vc-host-assignment-settings">
      <AssignmentSettingsIntro content={content} />

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
          showTitleOverflow={content === 'song-title'}
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
          showMarkdown={content !== 'marquee-lyrics'}
          showLyricsTracking={content === 'lyrics' || content === 'marquee-lyrics'}
          showLyricPresentationEffect={content === 'lyrics'}
          showLyricTypographyMode={content === 'lyrics'}
          showAlareFineTuning={content === 'lyrics'}
          showLyricsEdgeFade={content === 'lyrics'}
          showLyricsRemoveBracketed={content === 'lyrics'}
        />
      )}

    </section>
  );
}
