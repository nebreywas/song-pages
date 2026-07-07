import { useCallback, useEffect, useRef, useState } from 'react';

import {
  KUDOS_MAX_CONCURRENT,
  isTextEffectImplemented,
  kudoTextFontSizePx,
  type KudoPreset,
  type TextKudoConfig,
} from '@shared/kudos';

import { measureKudoSpawnArea } from './particle/spawnArea';
import { computeTextEffectFrame } from './text/effects';
import { resolveTextPlacement } from './text/placement';

export type ActiveTextKudoInstance = {
  instanceId: string;
  presetId: string;
  presetName: string;
  config: TextKudoConfig;
  preserveEmojiColors: boolean;
  startedAt: number;
  durationMs: number;
  fontSizePx: number;
  placement: ReturnType<typeof resolveTextPlacement>;
  frame: ReturnType<typeof computeTextEffectFrame>;
  opacity: number;
};

let textInstanceCounter = 0;

function canRenderTextPreset(preset: KudoPreset): preset is KudoPreset & { text: TextKudoConfig } {
  if (preset.contentType !== 'text' && preset.contentType !== 'text-emoji') return false;
  if (!preset.text) return false;
  return isTextEffectImplemented(preset.text.effectId);
}

export function useKudoTextInstances(containerRef: React.RefObject<HTMLElement | null>) {
  const [instances, setInstances] = useState<ActiveTextKudoInstance[]>([]);
  const rafRef = useRef(0);
  const lastFrameRef = useRef(0);

  const removeInstance = useCallback((instanceId: string) => {
    setInstances((prev) => prev.filter((row) => row.instanceId !== instanceId));
  }, []);

  const triggerPreset = useCallback(
    (preset: KudoPreset) => {
      if (!canRenderTextPreset(preset)) return false;

      const { width } = measureKudoSpawnArea(containerRef.current);
      const now = performance.now();
      const config = preset.text;
      const instanceId = `kudo-text-${++textInstanceCounter}`;

      const next: ActiveTextKudoInstance = {
        instanceId,
        presetId: preset.id,
        presetName: preset.name,
        config,
        preserveEmojiColors: preset.contentType === 'text-emoji',
        startedAt: now,
        durationMs: config.durationMs,
        fontSizePx: kudoTextFontSizePx(width, config.value, config.effectId),
        placement: resolveTextPlacement(config.placement, config.effectId),
        frame: computeTextEffectFrame(config.effectId, config.value, 0),
        opacity: 0,
      };

      setInstances((prev) => {
        const merged = [...prev, next];
        if (merged.length <= KUDOS_MAX_CONCURRENT) return merged;
        return merged.slice(merged.length - KUDOS_MAX_CONCURRENT);
      });

      window.setTimeout(() => removeInstance(instanceId), config.durationMs + 120);
      return true;
    },
    [containerRef, removeInstance],
  );

  useEffect(() => {
    const tick = (now: number) => {
      setInstances((prev) => {
        if (prev.length === 0) return prev;

        const next = prev
          .map((instance) => {
            const age = now - instance.startedAt;
            if (age > instance.durationMs) return null;

            const lifeT = Math.min(1, age / instance.durationMs);
            const fade = lifeT > 0.78 ? 1 - (lifeT - 0.78) / 0.22 : 1;

            return {
              ...instance,
              frame: computeTextEffectFrame(instance.config.effectId, instance.config.value, lifeT),
              opacity: fade,
            };
          })
          .filter((row): row is ActiveTextKudoInstance => row != null);

        return next;
      });

      lastFrameRef.current = now;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return { instances, triggerPreset };
}
