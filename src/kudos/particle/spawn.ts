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
  /** Polar orbit for spiral effect (Phase B). */
  spiral?: {
    cx: number;
    cy: number;
    angle: number;
    radius: number;
    angleSpeed: number;
    radiusSpeed: number;
  };
  /** Phase offset for wave-band motion. */
  wavePhase?: number;
  /** Per-particle opacity multiplier (pop/pulse/comet). */
  localOpacity?: number;
  /** Per-particle scale multiplier (pop/pulse). */
  displayScale?: number;
  /** Comet streak stretch along travel axis. */
  displayScaleX?: number;
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

type SpawnMotion = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation?: number;
  spiral?: LiveParticle['spiral'];
  wavePhase?: number;
  displayScaleX?: number;
};

/** Delay before particle appears; keep bursts short so high counts fill the screen. */
function spawnStaggerMs(index: number, count: number, durationMs: number, effectId: string): number {
  if (count <= 1) return 0;
  if (effectId === 'scatter') {
    const burstMs = Math.min(120, durationMs * 0.05);
    return (index / (count - 1)) * burstMs;
  }
  if (effectId === 'pop' || effectId === 'pulse') {
    const windowMs = Math.min(durationMs * 0.72, Math.max(600, durationMs - 300));
    return count <= 1 ? 0 : (index / (count - 1)) * windowMs;
  }
  if (effectId === 'wave') {
    const windowMs = Math.min(durationMs * 0.45, 1400);
    return count <= 1 ? 0 : (index / (count - 1)) * windowMs;
  }
  if (effectId === 'comet') {
    const burstMs = Math.min(280, durationMs * 0.12);
    return count <= 1 ? 0 : (index / (count - 1)) * burstMs;
  }
  if (count >= 24) {
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
      if (ctx.effectId === 'rise' || ctx.effectId === 'fountain') {
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
      if (ctx.effectId === 'burst' || ctx.effectId === 'scatter') {
        return { x: width * 0.5, y: height * 0.5 };
      }
      if (ctx.effectId === 'wave') {
        return {
          x: width * -0.02,
          y: rand(height * 0.12, height * 0.88),
        };
      }
      if (ctx.effectId === 'pop' || ctx.effectId === 'pulse') {
        return { x: rand(width * pad, width * (1 - pad)), y: rand(height * pad, height * (1 - pad)) };
      }
      return { x: rand(width * pad, width * (1 - pad)), y: rand(height * 0.3, height * 0.7) };
  }
}

function particleSpeed(ctx: SpawnContext, particleCount: number): number {
  const densityScale = particleCount > 48 ? 0.82 : particleCount > 24 ? 0.9 : 1;
  return ctx.speedMul * densityScale * (40 + ctx.variation * 60);
}

function initialVelocity(
  effectId: string,
  ctx: SpawnContext,
  particleCount: number,
  angleFromCenter?: number,
) {
  const v = particleSpeed(ctx, particleCount);
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

/** Phase B — upward launch with lateral spread (gravity applied in step). */
function fountainMotion(ctx: SpawnContext): SpawnMotion {
  const origin = originPoint(ctx);
  const v = particleSpeed(ctx, ctx.particleCount);
  return {
    x: origin.x,
    y: origin.y,
    vx: rand(-v * 0.45, v * 0.45),
    vy: -v * rand(1.1, 1.65),
  };
}

/** Phase B — enter from an edge and cross the surface. */
function swarmMotion(ctx: SpawnContext): SpawnMotion {
  const { width, height, variation } = ctx;
  const pad = 0.06;
  const v = particleSpeed(ctx, ctx.particleCount);
  const edge = Math.floor(Math.random() * 4);

  switch (edge) {
    case 0:
      return {
        x: rand(width * pad, width * (1 - pad)),
        y: height * pad,
        vx: rand(-v * 0.35, v * 0.35),
        vy: v * rand(0.75, 1.15),
      };
    case 1:
      return {
        x: rand(width * pad, width * (1 - pad)),
        y: height * (1 - pad),
        vx: rand(-v * 0.35, v * 0.35),
        vy: -v * rand(0.75, 1.15),
      };
    case 2:
      return {
        x: width * pad,
        y: rand(height * pad, height * (1 - pad)),
        vx: v * rand(0.75, 1.15),
        vy: rand(-v * 0.25, v * 0.25),
      };
    default:
      return {
        x: width * (1 - pad),
        y: rand(height * pad, height * (1 - pad)),
        vx: -v * rand(0.75, 1.15),
        vy: rand(-v * 0.25, v * 0.25),
      };
  }
}

/** Phase B — quick spray from center. */
function scatterMotion(ctx: SpawnContext): SpawnMotion {
  const center = { x: ctx.width * 0.5, y: ctx.height * 0.5 };
  const v = particleSpeed(ctx, ctx.particleCount) * 1.35;
  const angle = rand(0, Math.PI * 2);
  return {
    x: center.x + rand(-ctx.width * 0.04, ctx.width * 0.04),
    y: center.y + rand(-ctx.height * 0.04, ctx.height * 0.04),
    vx: Math.cos(angle) * v,
    vy: Math.sin(angle) * v,
  };
}

/** Phase B — orbit around center while drifting inward or outward. */
function spiralMotion(ctx: SpawnContext): SpawnMotion {
  const cx = ctx.width * 0.5;
  const cy = ctx.height * 0.5;
  const angle = rand(0, Math.PI * 2);
  const minR = Math.min(ctx.width, ctx.height) * 0.08;
  const maxR = Math.min(ctx.width, ctx.height) * (0.22 + ctx.variation * 0.12);
  const radius = rand(minR, maxR);
  const direction = Math.random() > 0.5 ? 1 : -1;
  const v = particleSpeed(ctx, ctx.particleCount);

  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
    vx: 0,
    vy: 0,
    spiral: {
      cx,
      cy,
      angle,
      radius,
      angleSpeed: direction * rand(1.8, 3.4) * (v / 80),
      radiusSpeed: direction * rand(-18, 28) * (0.6 + ctx.variation * 0.4),
    },
  };
}

/** Phase C — sweep across surface in a phased band. */
function waveMotion(ctx: SpawnContext, index: number, count: number): SpawnMotion {
  const v = particleSpeed(ctx, ctx.particleCount);
  const bandY = ctx.height * (0.18 + (index / Math.max(1, count - 1)) * 0.64);
  return {
    x: ctx.width * -0.04,
    y: bandY + rand(-ctx.height * 0.04, ctx.height * 0.04),
    vx: v * rand(0.85, 1.15),
    vy: rand(-v * 0.08, v * 0.08),
    wavePhase: (index / Math.max(1, count)) * Math.PI * 2 + rand(0, 0.6),
  };
}

/** Phase C — appear in place, scale up, then vanish. */
function popMotion(ctx: SpawnContext): SpawnMotion {
  const origin = originPoint(ctx);
  return { x: origin.x, y: origin.y, vx: 0, vy: 0 };
}

/** Phase C — appear in place and throb scale/opacity. */
function pulseMotion(ctx: SpawnContext): SpawnMotion {
  const origin = originPoint(ctx);
  return { x: origin.x, y: origin.y, vx: 0, vy: 0 };
}

/** Phase C — fast streak with optional trail stretch. */
function cometMotion(ctx: SpawnContext): SpawnMotion {
  const { width, height } = ctx;
  const pad = 0.05;
  const v = particleSpeed(ctx, ctx.particleCount) * 1.85;
  const edge = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;
  let vx = 0;
  let vy = 0;

  switch (edge) {
    case 0:
      x = rand(width * pad, width * (1 - pad));
      y = -pad * height;
      vx = rand(-v * 0.25, v * 0.25);
      vy = v * rand(0.9, 1.2);
      break;
    case 1:
      x = width * (1 + pad);
      y = rand(height * pad, height * (1 - pad));
      vx = -v * rand(0.9, 1.2);
      vy = rand(-v * 0.25, v * 0.25);
      break;
    case 2:
      x = rand(width * pad, width * (1 - pad));
      y = height * (1 + pad);
      vx = rand(-v * 0.25, v * 0.25);
      vy = -v * rand(0.9, 1.2);
      break;
    default:
      x = -pad * width;
      y = rand(height * pad, height * (1 - pad));
      vx = v * rand(0.9, 1.2);
      vy = rand(-v * 0.25, v * 0.25);
      break;
  }

  const angleDeg = (Math.atan2(vy, vx) * 180) / Math.PI;
  return {
    x,
    y,
    vx,
    vy,
    rotation: angleDeg,
    displayScaleX: rand(1.9, 2.6),
  };
}

function resolveSpawnMotion(
  ctx: SpawnContext,
  center: { x: number; y: number },
  index: number,
  count: number,
): SpawnMotion {
  switch (ctx.effectId) {
    case 'fountain':
      return fountainMotion(ctx);
    case 'swarm':
      return swarmMotion(ctx);
    case 'scatter':
      return scatterMotion(ctx);
    case 'spiral':
      return spiralMotion(ctx);
    case 'wave':
      return waveMotion(ctx, index, count);
    case 'pop':
      return popMotion(ctx);
    case 'pulse':
      return pulseMotion(ctx);
    case 'comet':
      return cometMotion(ctx);
    default: {
      const origin = originPoint(ctx);
      const angle =
        ctx.effectId === 'burst'
          ? Math.atan2(origin.y - center.y, origin.x - center.x) + rand(-0.4, 0.4)
          : undefined;
      const vel = initialVelocity(ctx.effectId, ctx, ctx.particleCount, angle);
      return { x: origin.x, y: origin.y, ...vel };
    }
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

    const motion = resolveSpawnMotion(ctx, center, i, count);
    const size = ctx.sizePx * rand(0.75, 1.15);

    const tintColor =
      resolved.contentKind === 'image'
        ? resolveParticleIconTint(colorMode, iconColors, i, count)
        : null;

    const isInPlace = ctx.effectId === 'pop' || ctx.effectId === 'pulse';
    const isComet = ctx.effectId === 'comet';

    particles.push({
      id: `p-${startId + i}`,
      x: motion.x,
      y: motion.y,
      vx: motion.vx,
      vy: motion.vy,
      size,
      rotation: motion.rotation ?? rand(0, 360),
      rotationSpeed: isInPlace || isComet ? 0 : rand(-90, 90) * ctx.variation,
      opacity: 1,
      localOpacity: isInPlace ? 0 : 1,
      displayScale: isInPlace ? 0.01 : 1,
      displayScaleX: motion.displayScaleX ?? 1,
      content: resolved.content,
      contentKind: resolved.contentKind,
      assetVariant: resolved.assetVariant,
      tintColor: tintColor ?? undefined,
      bornAt: now + spawnStaggerMs(i, count, ctx.durationMs, ctx.effectId),
      spiral: motion.spiral,
      wavePhase: motion.wavePhase,
    });
  }

  return particles;
}

export function stepParticles(
  particles: LiveParticle[],
  dt: number,
  effectId: string,
  now: number,
): LiveParticle[] {
  return particles.map((particle) => {
    const ageMs = now - particle.bornAt;
    if (ageMs < 0) return particle;

    if (effectId === 'spiral' && particle.spiral) {
      const spiral = particle.spiral;
      const nextAngle = spiral.angle + spiral.angleSpeed * dt;
      const nextRadius = Math.max(8, spiral.radius + spiral.radiusSpeed * dt);
      return {
        ...particle,
        x: spiral.cx + Math.cos(nextAngle) * nextRadius,
        y: spiral.cy + Math.sin(nextAngle) * nextRadius,
        rotation: particle.rotation + particle.rotationSpeed * dt,
        spiral: {
          ...spiral,
          angle: nextAngle,
          radius: nextRadius,
        },
      };
    }

    let { vx, vy } = particle;
    if (effectId === 'rise') vy -= 8 * dt;
    if (effectId === 'rain') vy += 12 * dt;
    if (effectId === 'drift') vy += Math.sin(particle.x * 0.01) * 6 * dt;
    if (effectId === 'fountain') vy += 22 * dt;
    if (effectId === 'swarm') {
      vy += Math.sin(particle.x * 0.012 + particle.y * 0.008) * 10 * dt;
      vx += Math.cos(particle.y * 0.01) * 6 * dt;
    }
    if (effectId === 'scatter') {
      vx *= 1 - 0.8 * dt;
      vy *= 1 - 0.8 * dt;
    }
    if (effectId === 'wave') {
      const phase = particle.wavePhase ?? 0;
      vy += Math.sin(particle.x * 0.016 + phase) * 34 * dt;
    }

    let localOpacity = particle.localOpacity ?? 1;
    let displayScale = particle.displayScale ?? 1;

    if (effectId === 'pop') {
      const lifeMs = 820;
      const t = Math.min(1, ageMs / lifeMs);
      if (t < 0.28) {
        const intro = t / 0.28;
        displayScale = 0.05 + intro * intro * 1.05;
        localOpacity = intro;
      } else if (t < 0.62) {
        displayScale = 1;
        localOpacity = 1;
      } else {
        const outro = (t - 0.62) / 0.38;
        displayScale = 1 - outro * 0.85;
        localOpacity = 1 - outro;
      }
    }

    if (effectId === 'pulse') {
      const pulse = Math.sin(ageMs * 0.011) * 0.5 + 0.5;
      displayScale = 0.72 + pulse * 0.55;
      localOpacity = 0.35 + pulse * 0.65;
    }

    if (effectId === 'comet') {
      localOpacity = 0.82 + Math.min(0.18, ageMs / 1200);
    }

    return {
      ...particle,
      x: particle.x + vx * dt,
      y: particle.y + vy * dt,
      vx,
      vy,
      rotation: particle.rotation + particle.rotationSpeed * dt,
      localOpacity,
      displayScale,
    };
  });
}
