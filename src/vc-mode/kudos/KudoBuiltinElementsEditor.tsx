import { KUDOS_PARTICLE_ELEMENT_MAX, KUDOS_PARTICLE_ELEMENT_MIN } from '@shared/kudos';
import type { ParticleElement } from '@shared/kudos';

import { KUDO_ASSET_CATALOG } from '../../kudos/catalog/kudoAssetCatalog.generated';

type KudoBuiltinElementsEditorProps = {
  elements: ParticleElement[];
  onChange: (elements: ParticleElement[]) => void;
};

const DEFAULT_ICON_ID = 'heart';
const ADD_ICON_ID = 'star';

function assetIds(elements: ParticleElement[]): string[] {
  const ids = elements
    .filter((el): el is { type: 'builtin-asset'; assetId: string } => el.type === 'builtin-asset')
    .map((el) => el.assetId);
  while (ids.length < KUDOS_PARTICLE_ELEMENT_MIN) {
    ids.push(DEFAULT_ICON_ID);
  }
  return ids.slice(0, KUDOS_PARTICLE_ELEMENT_MAX);
}

function toBuiltinElements(ids: string[]): ParticleElement[] {
  return ids.slice(0, KUDOS_PARTICLE_ELEMENT_MAX).map((assetId) => ({ type: 'builtin-asset', assetId }));
}

/** Up to four built-in icon slots — random-mixed at spawn (spec §5.1–5.2). */
export function KudoBuiltinElementsEditor({ elements, onChange }: KudoBuiltinElementsEditorProps) {
  const slots = assetIds(elements);

  const setSlot = (index: number, assetId: string) => {
    const next = [...slots];
    next[index] = assetId;
    onChange(toBuiltinElements(next));
  };

  const addSlot = () => {
    if (slots.length >= KUDOS_PARTICLE_ELEMENT_MAX) return;
    onChange(toBuiltinElements([...slots, ADD_ICON_ID]));
  };

  const removeSlot = (index: number) => {
    if (slots.length <= KUDOS_PARTICLE_ELEMENT_MIN) return;
    onChange(toBuiltinElements(slots.filter((_, i) => i !== index)));
  };

  return (
    <div className="vc-kudos-emoji-elements">
      <span className="vc-kudos-emoji-elements-label">
        Icon elements ({slots.length}/{KUDOS_PARTICLE_ELEMENT_MAX})
      </span>
      <div className="vc-kudos-emoji-slots">
        {slots.map((assetId, index) => (
          <label key={index} className="vc-kudos-emoji-slot">
            <span>Icon {index + 1}</span>
            <select
              className="vc-kudos-icon-select"
              value={assetId}
              onChange={(e) => setSlot(index, e.target.value)}
              aria-label={`Icon ${index + 1}`}
            >
              {KUDO_ASSET_CATALOG.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.label}
                </option>
              ))}
            </select>
            {slots.length > KUDOS_PARTICLE_ELEMENT_MIN ? (
              <button
                type="button"
                className="vc-kudos-emoji-remove"
                onClick={() => removeSlot(index)}
                aria-label={`Remove icon ${index + 1}`}
              >
                ✕
              </button>
            ) : null}
          </label>
        ))}
      </div>
      {slots.length < KUDOS_PARTICLE_ELEMENT_MAX ? (
        <button type="button" className="vc-btn vc-btn--ghost" onClick={addSlot}>
          Add icon
        </button>
      ) : null}
    </div>
  );
}
