import { useEffect, useRef } from 'react';

import type { KudoPreset } from '@shared/kudos';

import { KudoParticleLayer } from './KudoParticleLayer';
import { KudoTextLayer } from './KudoTextLayer';
import { useKudoInstances } from './useKudoInstances';
import { useKudoTextInstances } from './useKudoTextInstances';

type KudoLayerProps = {
  presets: KudoPreset[];
  /** Increment when a specific preset should fire. */
  triggerToken: number;
  triggerPresetId: string | null;
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
export function KudoLayer({ presets, triggerToken, triggerPresetId }: KudoLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTriggerTokenRef = useRef(0);
  const presetsRef = useRef(presets);
  const { instances: particleInstances, triggerPreset: triggerParticle } = useKudoInstances(containerRef);
  const { instances: textInstances, triggerPreset: triggerText } = useKudoTextInstances(containerRef);

  presetsRef.current = presets;

  useEffect(() => {
    if (triggerToken <= 0 || triggerToken === lastTriggerTokenRef.current) return;
    lastTriggerTokenRef.current = triggerToken;
    if (!triggerPresetId) return;

    const preset = presetsRef.current.find((row) => row.id === triggerPresetId);
    if (preset) triggerForPreset(preset, triggerParticle, triggerText);
  }, [triggerToken, triggerPresetId, triggerParticle, triggerText]);

  return (
    <div ref={containerRef} className="vc-kudo-layer-root">
      <KudoParticleLayer instances={particleInstances} />
      <KudoTextLayer instances={textInstances} />
    </div>
  );
}
