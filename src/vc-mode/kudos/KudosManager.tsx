import { useMemo, useState } from 'react';

import {
  defaultEmojiParticleConfig,
  defaultHybridParticleConfig,
  defaultParticleConfig,
  defaultTextEmojiKudoConfig,
  defaultTextKudoConfig,
  KUDO_CONTENT_TYPE_OPTIONS,
  phraseIncludesEmoji,
  resolveParticleCount,
  type KudoContentType,
  type KudoPreset,
} from '@shared/kudos';

import { KudoLayer } from '../../kudos/KudoLayer';
import { useCommandMappings } from '../../commands/useCommandMappings';
import { formatReservedBindingLabel } from '@shared/commands';
import { KudoParticleEditor } from './KudoParticleEditor';
import { KudosPresetList } from './KudosPresetList';
import { KudoTextEditor } from './KudoTextEditor';

type KudosManagerProps = {
  presets: KudoPreset[];
  onAddPreset: (preset: KudoPreset) => Promise<unknown>;
  onUpdatePreset: (id: string, patch: Partial<KudoPreset>) => Promise<unknown>;
  onDeletePreset: (id: string) => Promise<unknown>;
  onReorderPresets: (fromIndex: number, toIndex: number) => Promise<unknown>;
};

const CONTENT_TYPES = KUDO_CONTENT_TYPE_OPTIONS;

function newPresetId(): string {
  return `kudo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type EditableContentType = 'builtin-assets' | 'emoji' | 'text' | 'text-emoji' | 'hybrid';

function isEditableContentType(type: KudoContentType): type is EditableContentType {
  return (
    type === 'builtin-assets' ||
    type === 'emoji' ||
    type === 'text' ||
    type === 'text-emoji' ||
    type === 'hybrid'
  );
}

function showsTextEditor(type: EditableContentType): boolean {
  return type === 'text' || type === 'text-emoji' || type === 'hybrid';
}

function showsParticleEditor(type: EditableContentType): boolean {
  return type === 'builtin-assets' || type === 'emoji' || type === 'hybrid';
}

/** VC designer — create, order, and preview host Kudo presets. */
export function KudosManager({
  presets,
  onAddPreset,
  onUpdatePreset,
  onDeletePreset,
  onReorderPresets,
}: KudosManagerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(presets[0]?.id ?? null);
  const [previewToken, setPreviewToken] = useState(0);
  const { state: commandMappings, assignKudoPresetToReservedKey } = useCommandMappings();

  const selected = useMemo(
    () => presets.find((row) => row.id === selectedId) ?? presets[0] ?? null,
    [presets, selectedId],
  );

  const contentType: EditableContentType =
    selected && isEditableContentType(selected.contentType) ? selected.contentType : 'builtin-assets';

  const particle =
    selected?.particle ??
    (contentType === 'emoji'
      ? defaultEmojiParticleConfig()
      : contentType === 'hybrid'
        ? defaultHybridParticleConfig()
        : defaultParticleConfig());
  const text =
    selected?.text ??
    (contentType === 'text-emoji' ? defaultTextEmojiKudoConfig() : defaultTextKudoConfig());

  const savePresetPatch = (patch: Partial<KudoPreset>) => {
    if (!selected) return;
    void onUpdatePreset(selected.id, patch);
  };

  const saveParticlePatch = (patch: Partial<typeof particle>) => {
    if (!selected || !showsParticleEditor(contentType)) return;
    const nextParticle = { ...particle, ...patch };
    void onUpdatePreset(selected.id, {
      contentType,
      particle: {
        ...nextParticle,
        particleCount: resolveParticleCount(nextParticle),
      },
    });
  };

  const saveTextPatch = (patch: Partial<typeof text>) => {
    if (!selected || !showsTextEditor(contentType)) return;
    void onUpdatePreset(selected.id, {
      contentType,
      text: { ...text, ...patch },
    });
  };

  const setContentType = (next: EditableContentType) => {
    if (!selected || next === contentType) return;
    if (next === 'text') {
      savePresetPatch({ contentType: 'text', text: defaultTextKudoConfig(), particle: undefined });
      return;
    }
    if (next === 'text-emoji') {
      savePresetPatch({ contentType: 'text-emoji', text: defaultTextEmojiKudoConfig(), particle: undefined });
      return;
    }
    if (next === 'hybrid') {
      savePresetPatch({
        contentType: 'hybrid',
        text: defaultTextKudoConfig(),
        particle: defaultHybridParticleConfig(),
      });
      return;
    }
    savePresetPatch({
      contentType: next,
      particle: next === 'emoji' ? defaultEmojiParticleConfig() : defaultParticleConfig(),
      text: undefined,
    });
  };

  const handleAdd = () => {
    const now = Date.now();
    const preset: KudoPreset = {
      id: newPresetId(),
      name: 'New Kudo',
      contentType: 'builtin-assets',
      createdAt: now,
      updatedAt: now,
      particle: defaultParticleConfig(),
    };
    void onAddPreset(preset).then(() => setSelectedId(preset.id));
  };

  const previewPreset =
    selected && isEditableContentType(selected.contentType)
      ? {
          ...selected,
          particle: showsParticleEditor(contentType) ? particle : undefined,
          text: showsTextEditor(contentType) ? text : undefined,
        }
      : null;

  const textVariant =
    contentType === 'text-emoji' || (contentType === 'hybrid' && phraseIncludesEmoji(text.value))
      ? 'text-emoji'
      : 'text';

  const reservedKudoOptions = commandMappings.reservedKudoKeys.map((key) => ({
    key,
    label: formatReservedBindingLabel(key),
  }));

  const selectedReservedKey =
    reservedKudoOptions.find(
      (option) => commandMappings.kudoPresetByReservedKey[option.key] === selected?.id,
    )?.key ?? '';

  return (
    <div className="vc-kudos-manager">
      <div className="vc-kudos-manager-header">
        <h3 className="vc-kudos-manager-title">Kudos</h3>
        <button type="button" className="vc-btn" onClick={handleAdd}>
          New Kudo
        </button>
      </div>

      <div className="vc-kudos-manager-body">
        <KudosPresetList
          presets={presets}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
          onDelete={(id) => void onDeletePreset(id)}
          onReorder={(fromIndex, toIndex) => void onReorderPresets(fromIndex, toIndex)}
        />

        {selected && isEditableContentType(selected.contentType) ? (
          <section className="vc-kudos-editor">
            <div className="vc-kudos-editor-top-row">
              <label className="vc-field vc-kudos-name-field">
                <span>Name</span>
                <input
                  type="text"
                  value={selected.name}
                  maxLength={48}
                  onChange={(e) => void onUpdatePreset(selected.id, { name: e.target.value })}
                />
              </label>

              <label className="vc-field vc-kudos-content-type-field">
                <span>Content type</span>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value as EditableContentType)}
                >
                  {CONTENT_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {reservedKudoOptions.length > 0 ? (
              <label className="vc-field">
                <span>Reserved key</span>
                <select
                  value={selectedReservedKey}
                  onChange={(e) => {
                    if (!selected) return;
                    const nextKey = e.target.value;
                    for (const option of reservedKudoOptions) {
                      if (commandMappings.kudoPresetByReservedKey[option.key] === selected.id) {
                        void assignKudoPresetToReservedKey(option.key, null);
                      }
                    }
                    if (nextKey) void assignKudoPresetToReservedKey(nextKey, selected.id);
                  }}
                >
                  <option value="">—</option>
                  {reservedKudoOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="vc-field-hint">
                  Keys reserved in Key Bindings appear here when a preset is ready to assign.
                </span>
              </label>
            ) : null}

            {showsTextEditor(contentType) ? (
              <div className="vc-kudos-hybrid-section">
                <KudoTextEditor text={text} onChange={saveTextPatch} variant={textVariant} />
              </div>
            ) : null}

            {showsParticleEditor(contentType) ? (
              <div className="vc-kudos-hybrid-section">
                {contentType === 'hybrid' ? <h4 className="vc-kudos-section-title">Particle layer</h4> : null}
                <KudoParticleEditor
                  contentType={contentType === 'hybrid' ? 'hybrid' : contentType}
                  particle={particle}
                  onChange={saveParticlePatch}
                />
              </div>
            ) : null}
          </section>
        ) : (
          <p className="vc-kudos-empty">Create a Kudo to get started.</p>
        )}
      </div>

      <footer className="vc-kudos-preview-dock">
        <div className="vc-kudos-preview-toolbar">
          <span className="vc-kudos-preview-label">Preview</span>
          <button
            type="button"
            className="vc-btn"
            disabled={!previewPreset}
            onClick={() => setPreviewToken((t) => t + 1)}
          >
            Play
          </button>
        </div>
        <div className="vc-kudos-preview-stage">
          {previewPreset ? (
            <KudoLayer
              presets={[previewPreset]}
              triggerToken={previewToken}
              triggerPresetId={previewPreset.id}
            />
          ) : (
            <p className="vc-kudos-preview-empty">Select a Kudo to preview.</p>
          )}
        </div>
      </footer>
    </div>
  );
}
