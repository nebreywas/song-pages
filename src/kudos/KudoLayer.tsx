import { useEffect, useRef } from 'react';

import { kudoPresetAtCycleIndex, nextKudoCycleIndex, type KudoPreset } from '@shared/kudos';

import { KudoParticleLayer } from './KudoParticleLayer';
import { KudoTextLayer } from './KudoTextLayer';
import { useKudoInstances } from './useKudoInstances';
import { useKudoTextInstances } from './useKudoTextInstances';

type KudoLayerProps = {
  presets: KudoPreset[];
  /** Increment to fire next preset in cycle (⌘⌥P). */
  triggerToken: number;
};

function triggerForPreset(
  preset: KudoPreset,
  triggerParticle: (preset: KudoPreset) => boolean,
  triggerText: (preset: KudoPreset) => boolean,
): void {
  if (preset.contentType === 'text' || preset.contentType === 'text-emoji') {
    triggerText(preset);
    return;
  }
  if (preset.contentType === 'builtin-assets' || preset.contentType === 'emoji') {
    triggerParticle(preset);
  }
}

/**
 * VC Kudo renderer — cycles host presets on praise hotkey (§28.2).
 * Fires only when triggerToken advances (not when presets re-sync from state).
 */
export function KudoLayer({ presets, triggerToken }: KudoLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cycleIndexRef = useRef(-1);
  const lastTriggerTokenRef = useRef(0);
  const presetsRef = useRef(presets);
  const { instances: particleInstances, triggerPreset: triggerParticle } = useKudoInstances(containerRef);
  const { instances: textInstances, triggerPreset: triggerText } = useKudoTextInstances(containerRef);

  presetsRef.current = presets;

  useEffect(() => {
    if (triggerToken <= 0 || triggerToken === lastTriggerTokenRef.current) return;
    lastTriggerTokenRef.current = triggerToken;

    const list = presetsRef.current;
    const nextIndex = nextKudoCycleIndex(list, cycleIndexRef.current);
    if (nextIndex == null) return;
    cycleIndexRef.current = nextIndex;
    const preset = kudoPresetAtCycleIndex(list, nextIndex);
    if (preset) triggerForPreset(preset, triggerParticle, triggerText);
  }, [triggerToken, triggerParticle, triggerText]);

  return (
    <div ref={containerRef} className="vc-kudo-layer-root">
      <KudoParticleLayer instances={particleInstances} />
      <KudoTextLayer instances={textInstances} />
    </div>
  );
}
