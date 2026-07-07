import { useCallback, useEffect, useRef, useState } from 'react';

import {
  KUDOS_MAX_CONCURRENT,
  isParticleEffectImplemented,
  resolveParticleCount,
  type KudoPreset,
  type ParticleKudoConfig,
} from '@shared/kudos';

import type { KudoAssetVariantMode } from '@shared/kudos';

import { sizeToPixels, speedToMultiplier } from './particle/controls';
import { spawnParticles, stepParticles, type LiveParticle } from './particle/spawn';
import { measureKudoSpawnArea } from './particle/spawnArea';

export type ActiveKudoInstance = {
  instanceId: string;
  presetId: string;
  presetName: string;
  config: ParticleKudoConfig;
  particles: LiveParticle[];
  startedAt: number;
  durationMs: number;
};

let instanceCounter = 0;

function canRenderParticlePreset(preset: KudoPreset): preset is KudoPreset & { particle: ParticleKudoConfig } {
  if (!preset.particle) return false;
  if (preset.contentType !== 'builtin-assets' && preset.contentType !== 'emoji') return false;
  return isParticleEffectImplemented(preset.particle.effectId);
}

export function useKudoInstances(containerRef: React.RefObject<HTMLElement | null>) {
  const [instances, setInstances] = useState<ActiveKudoInstance[]>([]);
  const instancesRef = useRef<ActiveKudoInstance[]>([]);
  const rafRef = useRef(0);
  const lastFrameRef = useRef(0);
  const particleIdRef = useRef(0);

  instancesRef.current = instances;

  const removeInstance = useCallback((instanceId: string) => {
    setInstances((prev) => prev.filter((row) => row.instanceId !== instanceId));
  }, []);

  const triggerPreset = useCallback(
    (preset: KudoPreset) => {
      if (!canRenderParticlePreset(preset)) return false;

      const container = containerRef.current;
      const { width, height } = measureKudoSpawnArea(container);
      const now = performance.now();
      const config = preset.particle;
      const assetVariantMode: KudoAssetVariantMode = config.assetVariantMode ?? 'mixed';

      const count = resolveParticleCount(config);
      const batch = spawnParticles(
        count,
        {
          width,
          height,
          origin: config.origin,
          variation: config.variation,
          sizePx: sizeToPixels(config.size),
          speedMul: speedToMultiplier(config.speed),
          effectId: config.effectId,
          elements: config.elements,
          assetVariantMode,
          iconColorMode: config.iconColorMode,
          iconColors: config.iconColors,
          durationMs: config.durationMs,
          particleCount: count,
        },
        particleIdRef.current,
        now,
      );
      particleIdRef.current += batch.length;

      const instanceId = `kudo-${++instanceCounter}`;
      const next: ActiveKudoInstance = {
        instanceId,
        presetId: preset.id,
        presetName: preset.name,
        config,
        particles: batch,
        startedAt: now,
        durationMs: config.durationMs,
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
      const dt = lastFrameRef.current > 0 ? Math.min(0.05, (now - lastFrameRef.current) / 1000) : 0.016;
      lastFrameRef.current = now;

      setInstances((prev) => {
        if (prev.length === 0) return prev;

        const next = prev
          .map((instance) => {
            const age = now - instance.startedAt;
            if (age > instance.durationMs) return null;

            const alive = instance.particles.filter((p) => now >= p.bornAt);
            const stepped = stepParticles(alive, dt, instance.config.effectId);
            const lifeT = Math.min(1, age / instance.durationMs);
            const fade = lifeT > 0.75 ? 1 - (lifeT - 0.75) / 0.25 : 1;

            return {
              ...instance,
              particles: stepped.map((p) => ({ ...p, opacity: fade })),
            };
          })
          .filter((row): row is ActiveKudoInstance => row != null);

        return next;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return { instances, triggerPreset };
}
