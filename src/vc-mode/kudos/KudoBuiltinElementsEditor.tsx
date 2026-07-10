import { useCallback, useState } from 'react';
import {
  clearCompactElementSlot,
  compactElementSlotIndex,
  KUDOS_PARTICLE_ELEMENT_MAX,
  setCompactElementSlot,
  type ParticleElement,
} from '@shared/kudos';

import { findKudoAsset } from '../../kudos/catalog/kudoAssetCatalog.generated';

import { KudoElementSlotGrid } from './KudoElementSlotGrid';
import { KudoIconPickerPopover } from './KudoIconPickerPopover';

type KudoBuiltinElementsEditorProps = {
  elements: ParticleElement[];
  onChange: (elements: ParticleElement[]) => void;
};

function assetIds(elements: ParticleElement[]): string[] {
  return elements
    .filter((el): el is { type: 'builtin-asset'; assetId: string } => el.type === 'builtin-asset')
    .map((el) => el.assetId)
    .slice(0, KUDOS_PARTICLE_ELEMENT_MAX);
}

function toBuiltinElements(ids: string[]): ParticleElement[] {
  return ids.map((assetId) => ({ type: 'builtin-asset', assetId }));
}

/** Up to four built-in icon slots — random-mixed at spawn (spec §5.1–5.2). */
export function KudoBuiltinElementsEditor({ elements, onChange }: KudoBuiltinElementsEditorProps) {
  const slots = assetIds(elements);
  const [picker, setPicker] = useState<{ anchorRect: DOMRect; clickIndex: number } | null>(null);

  const applyPickerChoice = useCallback(
    (clickIndex: number, assetId: string | null) => {
      if (assetId === null) {
        onChange(toBuiltinElements(clearCompactElementSlot(slots, clickIndex)));
        return;
      }
      const next = setCompactElementSlot(slots, clickIndex, assetId, KUDOS_PARTICLE_ELEMENT_MAX);
      onChange(toBuiltinElements(next));
    },
    [onChange, slots],
  );

  return (
    <>
      <KudoElementSlotGrid
        label="Icons"
        iconPreview
        filledCount={slots.length}
        onActivate={(clickIndex, anchor) => {
          setPicker({ clickIndex, anchorRect: anchor.getBoundingClientRect() });
        }}
        renderFilled={(index) => {
          const assetId = slots[index];
          const asset = findKudoAsset(assetId);
          const src = asset?.variants['single-color'] ?? asset?.variants.grays;
          return src ? <img className="vc-kudos-element-slot-icon" src={src} alt="" draggable={false} /> : null;
        }}
      />
      {picker ? (
        <KudoIconPickerPopover
          anchorRect={picker.anchorRect}
          selectedAssetId={slots[compactElementSlotIndex(picker.clickIndex, slots.length)]}
          onSelect={(assetId) => applyPickerChoice(picker.clickIndex, assetId)}
          onClose={() => setPicker(null)}
        />
      ) : null}
    </>
  );
}
