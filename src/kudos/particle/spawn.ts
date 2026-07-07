import type { KudoAssetVariantMode, KudoOrigin, KudoParticleColorMode, ParticleElement } from '@shared/kudos';
import { resolveParticleIconTint } from '@shared/kudos';

import { resolveBuiltinAsset } from './controls';

export type LiveParticle = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  /** Image URL or emoji character. */
  content: string;
  contentKind: 'image' | 'emoji';
  /** Built-in artwork variant (for tint technique). */
  assetVariant?: 'single-color' | 'grays';
  tintColor?: string;
  bornAt: number;
};

type SpawnContext = {
  width: number;
  height: number;
  origin: KudoOrigin;
  variation: number;
  sizePx: number;
  speedMul: number;
  effectId: string;
  elements: ParticleElement[];
  assetVariantMode: KudoAssetVariantMode;
  iconColorMode?: KudoParticleColorMode;
  iconColors?: string[];
  durationMs: number;
  particleCount: number;
};

/** Delay before particle appears; keep bursts short so high counts fill the screen. */
function spawnStaggerMs(index: number, count: number, durationMs: number): number {
  if (count <= 1) return 0;
  if (count >= 24) {
    // Large bursts spawn together — stagger was making 72 reads as ~5 at first glance.
    const burstMs = Math.min(180, durationMs * 0.08);
    return (index / (count - 1)) * burstMs;
  }
  const windowMs = Math.min(1200, durationMs * 0.28);
  return (index / (count - 1)) * windowMs;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickElement(elements: ParticleElement[]): ParticleElement {
  return elements[Math.floor(Math.random() * elements.length)]!;
}

function resolveElementContent(
  element: ParticleElement,
  assetVariantMode: KudoAssetVariantMode,
): { content: string; contentKind: 'image' | 'emoji'; assetVariant?: 'single-color' | 'grays' } | null {
  if (element.type === 'emoji') {
    return { content: element.value, contentKind: 'emoji' };
  }
  const asset = resolveBuiltinAsset(element.assetId, assetVariantMode);
  if (!asset) return null;
  return { content: asset.url, contentKind: 'image', assetVariant: asset.variant };
}

function originPoint(ctx: SpawnContext): { x: number; y: number } {
  const { width, height, origin, variation } = ctx;
  const pad = 0.08;
  const jitter = variation * 0.12;

  switch (origin) {
    case 'center':
      return { x: width * 0.5 + rand(-width * jitter, width * jitter), y: height * 0.5 };
    case 'top':
      return { x: rand(width * pad, width * (1 - pad)), y: height * pad };
    case 'bottom':
      return {
        x: rand(width * pad, width * (1 - pad)),
        y: rand(height * (0.78 - variation * 0.06), height * (1 - pad)),
      };
    case 'left':
      return { x: width * pad, y: rand(height * pad, height * (1 - pad)) };
    case 'right':
      return { x: width * (1 - pad), y: rand(height * pad, height * (1 - pad)) };
    case 'random':
      return { x: rand(width * pad, width * (1 - pad)), y: rand(height * pad, height * (1 - pad)) };
    case 'auto':
    default:
      if (ctx.effectId === 'rise') {
        // Spread across the lower band so high counts are visible at once.
        const bandTop = ctx.height * (0.68 - ctx.variation * 0.08);
        const bandBottom = ctx.height * (1 - pad * 0.2);
        return {
          x: rand(ctx.width * pad, ctx.width * (1 - pad)),
          y: rand(Math.min(bandTop, bandBottom), bandBottom),
        };
      }
      if (ctx.effectId === 'rain') {
        return { x: rand(width * pad, width * (1 - pad)), y: height * pad };
      }
      if (ctx.effectId === 'burst') {
        return { x: width * 0.5, y: height * 0.5 };
      }
      return { x: rand(width * pad, width * (1 - pad)), y: rand(height * 0.3, height * 0.7) };
  }
}

function initialVelocity(
  effectId: string,
  speedMul: number,
  variation: number,
  particleCount: number,
  angleFromCenter?: number,
) {
  const densityScale = particleCount > 48 ? 0.82 : particleCount > 24 ? 0.9 : 1;
  const v = speedMul * densityScale * (40 + variation * 60);
  switch (effectId) {
    case 'rise':
      return { vx: rand(-v * 0.35, v * 0.35), vy: -v * rand(0.85, 1.2) };
    case 'rain':
      return { vx: rand(-v * 0.25, v * 0.25), vy: v * rand(0.85, 1.2) };
    case 'burst': {
      const angle = angleFromCenter ?? rand(0, Math.PI * 2);
      return { vx: Math.cos(angle) * v * 1.1, vy: Math.sin(angle) * v * 1.1 };
    }
    case 'drift':
    default:
      return { vx: v * rand(0.4, 1), vy: rand(-v * 0.2, v * 0.2) };
  }
}

export function spawnParticles(
  count: number,
  ctx: SpawnContext,
  startId: number,
  now: number,
): LiveParticle[] {
  const particles: LiveParticle[] = [];
  const center = { x: ctx.width * 0.5, y: ctx.height * 0.5 };

  const colorMode = ctx.iconColorMode;
  const iconColors = ctx.iconColors ?? [];

  for (let i = 0; i < count; i++) {
    const element = pickElement(ctx.elements);
    const resolved = resolveElementContent(element, ctx.assetVariantMode);
    if (!resolved) continue;

    const origin = originPoint(ctx);
    const angle =
      ctx.effectId === 'burst'
        ? Math.atan2(origin.y - center.y, origin.x - center.x) + rand(-0.4, 0.4)
        : undefined;
    const vel = initialVelocity(ctx.effectId, ctx.speedMul, ctx.variation, count, angle);
    const size = ctx.sizePx * rand(0.75, 1.15);

    const tintColor =
      resolved.contentKind === 'image'
        ? resolveParticleIconTint(colorMode, iconColors, i, count)
        : null;

    particles.push({
      id: `p-${startId + i}`,
      x: origin.x,
      y: origin.y,
      vx: vel.vx,
      vy: vel.vy,
      size,
      rotation: rand(0, 360),
      rotationSpeed: rand(-90, 90) * ctx.variation,
      opacity: 1,
      content: resolved.content,
      contentKind: resolved.contentKind,
      assetVariant: resolved.assetVariant,
      tintColor: tintColor ?? undefined,
      bornAt: now + spawnStaggerMs(i, count, ctx.durationMs),
    });
  }

  return particles;
}

export function stepParticles(particles: LiveParticle[], dt: number, effectId: string): LiveParticle[] {
  return particles.map((particle) => {
    let { vx, vy } = particle;
    if (effectId === 'rise') vy -= 8 * dt;
    if (effectId === 'rain') vy += 12 * dt;
    if (effectId === 'drift') vy += Math.sin(particle.x * 0.01) * 6 * dt;

    return {
      ...particle,
      x: particle.x + vx * dt,
      y: particle.y + vy * dt,
      vx,
      vy,
      rotation: particle.rotation + particle.rotationSpeed * dt,
    };
  });
}
