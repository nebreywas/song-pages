import { useMemo, useState } from 'react';

import {
  defaultEmojiParticleConfig,
  defaultParticleConfig,
  defaultTextEmojiKudoConfig,
  defaultTextKudoConfig,
  KUDO_PARTICLE_EFFECTS,
  KUDOS_PARTICLE_COUNT_MAX,
  KUDOS_PARTICLE_COUNT_MIN,
  resolveParticleCount,
  type KudoContentType,
  type KudoPreset,
} from '@shared/kudos';

import { KudoLayer } from '../../kudos/KudoLayer';
import { KUDO_ASSET_CATALOG } from '../../kudos/catalog/kudoAssetCatalog.generated';
import { KudoEmojiElementsEditor } from './KudoEmojiElementsEditor';
import { KudoIconColorControls } from './KudoIconColorControls';
import { KudoTextEditor } from './KudoTextEditor';

type KudosManagerProps = {
  presets: KudoPreset[];
  onAddPreset: (preset: KudoPreset) => Promise<unknown>;
  onUpdatePreset: (id: string, patch: Partial<KudoPreset>) => Promise<unknown>;
  onDeletePreset: (id: string) => Promise<unknown>;
  onMovePreset: (id: string, direction: -1 | 1) => Promise<unknown>;
};

const PHASE_A_EFFECTS = KUDO_PARTICLE_EFFECTS.filter((row) => row.phase === 'A');

const CONTENT_TYPES: { value: KudoContentType; label: string }[] = [
  { value: 'builtin-assets', label: 'Built-in icons' },
  { value: 'emoji', label: 'OS emoji' },
  { value: 'text', label: 'Text' },
  { value: 'text-emoji', label: 'Words + emoji' },
];

function newPresetId(): string {
  return `kudo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type EditableContentType = 'builtin-assets' | 'emoji' | 'text' | 'text-emoji';

function isEditableContentType(type: KudoContentType): type is EditableContentType {
  return type === 'builtin-assets' || type === 'emoji' || type === 'text' || type === 'text-emoji';
}

function isTextContentType(type: EditableContentType): type is 'text' | 'text-emoji' {
  return type === 'text' || type === 'text-emoji';
}

/** VC designer — create, order, and preview host Kudo presets. */
export function KudosManager({
  presets,
  onAddPreset,
  onUpdatePreset,
  onDeletePreset,
  onMovePreset,
}: KudosManagerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(presets[0]?.id ?? null);
  const [previewToken, setPreviewToken] = useState(0);

  const selected = useMemo(
    () => presets.find((row) => row.id === selectedId) ?? presets[0] ?? null,
    [presets, selectedId],
  );

  const contentType: EditableContentType =
    selected && isEditableContentType(selected.contentType) ? selected.contentType : 'builtin-assets';

  const particle =
    selected?.particle ??
    (contentType === 'emoji' ? defaultEmojiParticleConfig() : defaultParticleConfig());
  const text =
    selected?.text ??
    (contentType === 'text-emoji' ? defaultTextEmojiKudoConfig() : defaultTextKudoConfig());
  const particleCount = resolveParticleCount(particle);

  const savePresetPatch = (patch: Partial<KudoPreset>) => {
    if (!selected) return;
    void onUpdatePreset(selected.id, patch);
  };

  const saveParticlePatch = (patch: Partial<typeof particle>) => {
    if (!selected) return;
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
    if (!selected || !isTextContentType(contentType)) return;
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
          particle: isTextContentType(contentType) ? undefined : particle,
          text: isTextContentType(contentType) ? text : selected.text,
        }
      : null;

  return (
    <div className="vc-kudos-manager">
      <div className="vc-kudos-manager-header">
        <div>
          <h3 className="vc-kudos-manager-title">Kudos</h3>
          <p className="vc-kudos-manager-hint">
            ⌘⌥P cycles presets in list order on the live VC surface (temporary test trigger).
          </p>
        </div>
        <button type="button" className="vc-btn" onClick={handleAdd}>
          New Kudo
        </button>
      </div>

      <div className="vc-kudos-manager-body">
        <aside className="vc-kudos-list">
          {presets.map((preset, index) => (
            <div
              key={preset.id}
              className={`vc-kudos-list-item${selected?.id === preset.id ? ' is-selected' : ''}`}
            >
              <button type="button" className="vc-kudos-list-select" onClick={() => setSelectedId(preset.id)}>
                <span className="vc-kudos-list-order">{index + 1}</span>
                <span>{preset.name}</span>
              </button>
              <div className="vc-kudos-list-actions">
                <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => void onMovePreset(preset.id, -1)}>
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={index === presets.length - 1}
                  onClick={() => void onMovePreset(preset.id, 1)}
                >
                  ↓
                </button>
                <button type="button" aria-label="Delete" onClick={() => void onDeletePreset(preset.id)}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </aside>

        {selected && isEditableContentType(selected.contentType) ? (
          <section className="vc-kudos-editor">
            <label className="vc-field">
              <span>Name</span>
              <input
                type="text"
                value={selected.name}
                maxLength={48}
                onChange={(e) => void onUpdatePreset(selected.id, { name: e.target.value })}
              />
            </label>

            <fieldset className="vc-kudos-variant-radios">
              <legend>Content type</legend>
              <div className="vc-kudos-variant-radio-row">
                {CONTENT_TYPES.map((option) => (
                  <label key={option.value} className="vc-kudos-variant-radio">
                    <input
                      type="radio"
                      name="kudo-content-type"
                      value={option.value}
                      checked={contentType === option.value}
                      onChange={() => setContentType(option.value as EditableContentType)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {isTextContentType(contentType) ? (
              <KudoTextEditor
                text={text}
                onChange={saveTextPatch}
                variant={contentType === 'text-emoji' ? 'text-emoji' : 'text'}
              />
            ) : (
              <>
                {contentType === 'builtin-assets' ? (
                  <label className="vc-field">
                    <span>Icon</span>
                    <select
                      value={particle.elements[0]?.type === 'builtin-asset' ? particle.elements[0].assetId : 'heart'}
                      onChange={(e) =>
                        saveParticlePatch({
                          elements: [{ type: 'builtin-asset', assetId: e.target.value }],
                        })
                      }
                    >
                      {KUDO_ASSET_CATALOG.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <KudoEmojiElementsEditor
                    elements={particle.elements}
                    onChange={(elements) => saveParticlePatch({ elements })}
                  />
                )}

                <label className="vc-field">
                  <span>Effect</span>
                  <select
                    value={particle.effectId}
                    onChange={(e) => saveParticlePatch({ effectId: e.target.value })}
                  >
                    {PHASE_A_EFFECTS.map((effect) => (
                      <option key={effect.id} value={effect.id}>
                        {effect.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="vc-field">
                  <span>Length ({Math.round(particle.durationMs / 100) / 10}s)</span>
                  <input
                    type="range"
                    min={750}
                    max={8000}
                    step={250}
                    value={particle.durationMs}
                    onChange={(e) => saveParticlePatch({ durationMs: Number(e.target.value) })}
                  />
                </label>

                <label className="vc-field">
                  <span>Speed</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={particle.speed}
                    onChange={(e) => saveParticlePatch({ speed: Number(e.target.value) })}
                  />
                </label>

                <label className="vc-field">
                  <span>Particle count ({particleCount})</span>
                  <input
                    type="range"
                    min={KUDOS_PARTICLE_COUNT_MIN}
                    max={KUDOS_PARTICLE_COUNT_MAX}
                    step={1}
                    value={particleCount}
                    onChange={(e) => saveParticlePatch({ particleCount: Number(e.target.value) })}
                  />
                </label>

                <label className="vc-field">
                  <span>Size</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={particle.size}
                    onChange={(e) => saveParticlePatch({ size: Number(e.target.value) })}
                  />
                </label>

                <label className="vc-field">
                  <span>Variation</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={particle.variation}
                    onChange={(e) => saveParticlePatch({ variation: Number(e.target.value) })}
                  />
                </label>

                <label className="vc-field">
                  <span>Origin</span>
                  <select
                    value={particle.origin}
                    onChange={(e) => saveParticlePatch({ origin: e.target.value as typeof particle.origin })}
                  >
                    <option value="auto">Auto</option>
                    <option value="center">Center</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="random">Random</option>
                  </select>
                </label>

                {contentType === 'builtin-assets' ? (
                  <KudoIconColorControls particle={particle} onChange={saveParticlePatch} />
                ) : null}
              </>
            )}

            {previewPreset ? (
              <div className="vc-kudos-preview-wrap">
                <div className="vc-kudos-preview-stage">
                  <KudoLayer presets={[previewPreset]} triggerToken={previewToken} />
                </div>
                <button type="button" className="vc-btn" onClick={() => setPreviewToken((t) => t + 1)}>
                  Preview
                </button>
              </div>
            ) : null}
          </section>
        ) : selected ? (
          <p className="vc-kudos-empty">Hybrid Kudos (text + particles) are coming in a later phase.</p>
        ) : (
          <p className="vc-kudos-empty">Create a Kudo to get started.</p>
        )}
      </div>
    </div>
  );
}
