/**
 * Per-assignment override controls in the Surface designer host content panel.
 */

import {
  findHostContentItem,
  type HostContentCatalog,
  type HostContentItem,
} from '@shared/hostContent';
import {
  clearAllAssignmentOverrides,
  getAssignmentDefaults,
  isOverrideActive,
  patchAssignmentOverride,
  type VcAssignmentOverrides,
} from '@shared/vcMode/assignmentSettings';
import type { VcCellContent, VcHostSlotBinding } from '@shared/vcModeTypes';

import { GraphicAssignmentControls } from './GraphicAssignmentControls';
import { TextAssignmentControls } from './TextAssignmentControls';

type HostAssignmentSettingsProps = {
  content: VcCellContent;
  binding: VcHostSlotBinding;
  catalog: HostContentCatalog;
  onChange: (binding: VcHostSlotBinding) => void;
};

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
}: HostAssignmentSettingsProps & {
  item: HostContentItem | null;
  showAllCaps: boolean;
  showMarkdown: boolean;
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
      <OverrideField
        label="Presentation"
        overridden={isOverrideActive(content, item, catalog, overrides, 'presentationMode')}
        onReset={() =>
          onChange(patchBinding(content, item, catalog, binding, 'presentationMode', defaults.presentationMode))
        }
      >
        <select
          value={mode}
          onChange={(e) =>
            onChange(patchBinding(content, item, catalog, binding, 'presentationMode', e.target.value))
          }
        >
          <option value="slideshow">Slideshow</option>
          <option value="gallery">Gallery</option>
        </select>
      </OverrideField>

      {mode === 'slideshow' ? (
        <>
          <OverrideField
            label="Frame time (seconds)"
            overridden={isOverrideActive(content, item, catalog, overrides, 'frameTimeSec')}
            onReset={() =>
              onChange(patchBinding(content, item, catalog, binding, 'frameTimeSec', defaults.frameTimeSec))
            }
          >
            <input
              type="number"
              min={1}
              max={120}
              value={frameTimeSec}
              onChange={(e) =>
                onChange(patchBinding(content, item, catalog, binding, 'frameTimeSec', Number(e.target.value)))
              }
            />
          </OverrideField>

          <OverrideField
            label="Transition"
            overridden={isOverrideActive(content, item, catalog, overrides, 'slideshowTransition')}
            onReset={() =>
              onChange(
                patchBinding(content, item, catalog, binding, 'slideshowTransition', defaults.slideshowTransition),
              )
            }
          >
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
          </OverrideField>

          <OverrideField
            label="Slideshow playback"
            overridden={isOverrideActive(content, item, catalog, overrides, 'slideshowPlayback')}
            onReset={() =>
              onChange(
                patchBinding(content, item, catalog, binding, 'slideshowPlayback', defaults.slideshowPlayback),
              )
            }
          >
            <select
              value={slideshowPlayback}
              onChange={(e) =>
                onChange(patchBinding(content, item, catalog, binding, 'slideshowPlayback', e.target.value))
              }
            >
              <option value="loop">Loop</option>
              <option value="once">Play once</option>
            </select>
          </OverrideField>
        </>
      ) : (
        <>
          <OverrideField
            label="Max visible"
            overridden={isOverrideActive(content, item, catalog, overrides, 'maxVisible')}
            onReset={() => onChange(patchBinding(content, item, catalog, binding, 'maxVisible', defaults.maxVisible))}
          >
            <input
              type="number"
              min={1}
              max={12}
              value={maxVisible}
              onChange={(e) =>
                onChange(patchBinding(content, item, catalog, binding, 'maxVisible', Number(e.target.value)))
              }
            />
          </OverrideField>

          <OverrideField
            label="Gallery layout"
            overridden={isOverrideActive(content, item, catalog, overrides, 'galleryLayout')}
            onReset={() =>
              onChange(patchBinding(content, item, catalog, binding, 'galleryLayout', defaults.galleryLayout))
            }
          >
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
          </OverrideField>
        </>
      )}
    </>
  );
}

export function HostAssignmentSettings({ content, binding, catalog, onChange }: HostAssignmentSettingsProps) {
  const item = binding.itemId ? findHostContentItem(catalog, binding.itemId) ?? null : null;
  const hasOverrides = Object.keys(binding.overrides).length > 0;

  return (
    <section className="vc-host-assignment-settings">
      <div className="vc-host-assignment-settings-head">
        <h4>Assignment settings</h4>
        {hasOverrides ? (
          <button
            type="button"
            className="btn vc-assignment-clear"
            onClick={() => onChange({ ...binding, overrides: clearAllAssignmentOverrides(content, binding.overrides) })}
          >
            Clear all overrides
          </button>
        ) : null}
      </div>

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

      <p className="vc-assignment-hint">Defaults come from Host Content unless overridden here.</p>
    </section>
  );
}
