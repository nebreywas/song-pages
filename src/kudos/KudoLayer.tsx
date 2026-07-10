import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';

import type { KudoPreset } from '@shared/kudos';

import { KudoParticleLayer } from './KudoParticleLayer';
import { KudoTextLayer } from './KudoTextLayer';
import { useKudoInstances } from './useKudoInstances';
import { useKudoTextInstances } from './useKudoTextInstances';

type KudoLayerProps = {
  presets: KudoPreset[];
  /** Increment when a specific preset should fire (live VC path). */
  triggerToken: number;
  triggerPresetId: string | null;
};

export type KudoLayerHandle = {
  playPreset: (presetId: string) => void;
};

function triggerForPreset(
  preset: KudoPreset,
  triggerParticle: (preset: KudoPreset) => boolean,
  triggerText: (preset: KudoPreset) => boolean,
): void {
  if (preset.contentType === 'hybrid') {
    triggerText(preset);
    triggerParticle(preset);
    return;
  }
  if (preset.contentType === 'text' || preset.contentType === 'text-emoji') {
    triggerText(preset);
    return;
  }
  if (preset.contentType === 'builtin-assets' || preset.contentType === 'emoji') {
    triggerParticle(preset);
  }
}

/** VC Kudo renderer — fires a specific preset from the command registry. */
export const KudoLayer = forwardRef<KudoLayerHandle, KudoLayerProps>(function KudoLayer(
  { presets, triggerToken, triggerPresetId },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTriggerTokenRef = useRef(0);
  const presetsRef = useRef(presets);
  const { instances: particleInstances, triggerPreset: triggerParticle } = useKudoInstances(containerRef);
  const { instances: textInstances, triggerPreset: triggerText } = useKudoTextInstances(containerRef);

  presetsRef.current = presets;

  const playPresetById = useCallback(
    (presetId: string) => {
      const preset = presetsRef.current.find((row) => row.id === presetId);
      if (preset) triggerForPreset(preset, triggerParticle, triggerText);
    },
    [triggerParticle, triggerText],
  );

  useImperativeHandle(ref, () => ({ playPreset: playPresetById }), [playPresetById]);

  useEffect(() => {
    if (triggerToken <= 0 || triggerToken === lastTriggerTokenRef.current) return;
    lastTriggerTokenRef.current = triggerToken;
    if (!triggerPresetId) return;
    playPresetById(triggerPresetId);
  }, [triggerToken, triggerPresetId, playPresetById]);

  return (
    <div ref={containerRef} className="vc-kudo-layer-root">
      <KudoParticleLayer instances={particleInstances} />
      <KudoTextLayer instances={textInstances} />
    </div>
  );
});
