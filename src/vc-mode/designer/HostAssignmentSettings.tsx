/**
 * Per-assignment override controls in the Surface designer host content panel.
 */

import {
  findHostContentItem,
  type HostContentCatalog,
  type HostContentItem,
} from '@shared/hostContent';
import {
  getAssignmentDefaults,
  patchAssignmentOverride,
  type VcAssignmentOverrides,
} from '@shared/vcMode/assignmentSettings';
import type { VcCellContent, VcHostSlotBinding } from '@shared/vcModeTypes';

import { AssignmentField } from './AssignmentField';
import { GraphicAssignmentControls } from './GraphicAssignmentControls';
import { TextAssignmentControls } from './TextAssignmentControls';

type HostAssignmentSettingsProps = {
  content: VcCellContent;
  binding: VcHostSlotBinding;
  catalog: HostContentCatalog;
  onChange: (binding: VcHostSlotBinding) => void;
};

function patchBinding(
  content: VcCellContent,
  item: HostContentItem | null,
  catalog: HostContentCatalog,
  binding: VcHostSlotBinding,
  key: keyof VcAssignmentOverrides,
  value: unknown,
): VcHostSlotBinding {
  return {
    ...binding,
    overrides: patchAssignmentOverride(content, item, catalog, binding.overrides, key, value),
  };
}

function TextSettings({
  content,
  item,
  catalog,
  binding,
  onChange,
  showAllCaps,
  showMarkdown,
  showTitleOverflow = false,
}: HostAssignmentSettingsProps & {
  item: HostContentItem | null;
  showAllCaps: boolean;
  showMarkdown: boolean;
  showTitleOverflow?: boolean;
}) {
  return (
    <TextAssignmentControls
      content={content}
      item={item}
      catalog={catalog}
      overrides={binding.overrides}
      onOverridesChange={(overrides) => onChange({ ...binding, overrides })}
      showAllCaps={showAllCaps}
      showMarkdown={showMarkdown}
      showTitleOverflow={showTitleOverflow}
    />
  );
}

function GroupSettings({
  content,
  item,
  catalog,
  binding,
  onChange,
}: HostAssignmentSettingsProps & { item: HostContentItem | null }) {
  const defaults = getAssignmentDefaults(content, item, catalog);
  const overrides = binding.overrides;

  const mode = overrides.presentationMode ?? defaults.presentationMode ?? 'slideshow';
  const frameTimeSec = overrides.frameTimeSec ?? defaults.frameTimeSec ?? 5;
  const slideshowTransition = overrides.slideshowTransition ?? defaults.slideshowTransition ?? 'fade';
  const slideshowPlayback = overrides.slideshowPlayback ?? defaults.slideshowPlayback ?? 'loop';
  const maxVisible = overrides.maxVisible ?? defaults.maxVisible ?? 3;
  const galleryLayout = overrides.galleryLayout ?? defaults.galleryLayout ?? 'coverflow';

  return (
    <>
      <AssignmentField label="Presentation">
        <select
          value={mode}
          onChange={(e) =>
            onChange(patchBinding(content, item, catalog, binding, 'presentationMode', e.target.value))
          }
        >
          <option value="slideshow">Slideshow</option>
          <option value="gallery">Gallery</option>
        </select>
      </AssignmentField>

      {mode === 'slideshow' ? (
        <>
          <AssignmentField label="Frame time (seconds)">
            <input
              type="number"
              min={1}
              max={120}
              value={frameTimeSec}
              onChange={(e) =>
                onChange(patchBinding(content, item, catalog, binding, 'frameTimeSec', Number(e.target.value)))
              }
            />
          </AssignmentField>

          <AssignmentField label="Transition">
            <select
              value={slideshowTransition}
              onChange={(e) =>
                onChange(patchBinding(content, item, catalog, binding, 'slideshowTransition', e.target.value))
              }
            >
              <option value="none">None</option>
              <option value="fade">Fade</option>
              <option value="flip">Flip</option>
            </select>
          </AssignmentField>

          <AssignmentField label="Slideshow playback">
            <select
              value={slideshowPlayback}
              onChange={(e) =>
                onChange(patchBinding(content, item, catalog, binding, 'slideshowPlayback', e.target.value))
              }
            >
              <option value="loop">Loop</option>
              <option value="once">Play once</option>
            </select>
          </AssignmentField>
        </>
      ) : (
        <>
          <AssignmentField label="Max visible">
            <input
              type="number"
              min={1}
              max={12}
              value={maxVisible}
              onChange={(e) =>
                onChange(patchBinding(content, item, catalog, binding, 'maxVisible', Number(e.target.value)))
              }
            />
          </AssignmentField>

          <AssignmentField label="Gallery layout">
            <select
              value={galleryLayout}
              onChange={(e) =>
                onChange(patchBinding(content, item, catalog, binding, 'galleryLayout', e.target.value))
              }
            >
              <option value="static">Static</option>
              <option value="scroll">Scroll</option>
              <option value="coverflow">Cover flow</option>
            </select>
          </AssignmentField>
        </>
      )}
    </>
  );
}

export function HostAssignmentSettings({ content, binding, catalog, onChange }: HostAssignmentSettingsProps) {
  const item = binding.itemId ? findHostContentItem(catalog, binding.itemId) ?? null : null;

  return (
    <section className="vc-host-assignment-settings">
      {!binding.itemId ? (
        <p className="hc-pane-empty">Select a catalog item to configure assignment settings.</p>
      ) : !item ? (
        <p className="hc-pane-empty">Selected catalog item was not found.</p>
      ) : content === 'host-graphic' ? (
        <GraphicAssignmentControls
          content={content}
          item={item}
          catalog={catalog}
          overrides={binding.overrides}
          onOverridesChange={(overrides) => onChange({ ...binding, overrides })}
          showOverflow
        />
      ) : content === 'host-video' ? (
        <GraphicAssignmentControls
          content={content}
          item={item}
          catalog={catalog}
          overrides={binding.overrides}
          onOverridesChange={(overrides) => onChange({ ...binding, overrides })}
          showOverflow={false}
        />
      ) : content === 'host-title-text' ? (
        <TextSettings
          content={content}
          item={item}
          catalog={catalog}
          binding={binding}
          onChange={onChange}
          showAllCaps
          showMarkdown={false}
          showTitleOverflow
        />
      ) : content === 'host-area-text' ? (
        <TextSettings
          content={content}
          item={item}
          catalog={catalog}
          binding={binding}
          onChange={onChange}
          showAllCaps={false}
          showMarkdown
        />
      ) : content === 'host-graphics-group' ? (
        <GroupSettings
          content={content}
          item={item}
          catalog={catalog}
          binding={binding}
          onChange={onChange}
        />
      ) : null}
    </section>
  );
}
