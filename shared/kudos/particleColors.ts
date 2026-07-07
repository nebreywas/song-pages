import type { KudoParticleColorMode } from './types';

const HEX6 = /^#[0-9a-f]{6}$/i;

/** Normalize user/Coloris input to #rrggbb or null. */
export function normalizeKudoHexColor(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('#')) return null;
  if (HEX6.test(trimmed)) return trimmed.toLowerCase();
  const short = /^#([0-9a-f]{3})$/i.exec(trimmed);
  if (!short) return null;
  const [r, g, b] = short[1]!.split('');
  return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
}

export function sanitizeKudoColorList(raw: unknown, max = 4): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    const hex = normalizeKudoHexColor(entry);
    if (hex) out.push(hex);
    if (out.length >= max) break;
  }
  return out;
}

export function sanitizeKudoColorMode(raw: unknown): KudoParticleColorMode | undefined {
  if (raw === 'single' || raw === 'multi' || raw === 'gradient') return raw;
  return undefined;
}

function hexChannel(hex: string, index: number): number {
  return parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
}

/** Linear interpolate between two #rrggbb colors. */
export function lerpKudoHexColor(from: string, to: string, t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  const r = Math.round(hexChannel(from, 0) + (hexChannel(to, 0) - hexChannel(from, 0)) * clamped);
  const g = Math.round(hexChannel(from, 1) + (hexChannel(to, 1) - hexChannel(from, 1)) * clamped);
  const b = Math.round(hexChannel(from, 2) + (hexChannel(to, 2) - hexChannel(from, 2)) * clamped);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Per-particle tint for built-in flat icons; null = render asset without tint. */
export function resolveParticleIconTint(
  mode: KudoParticleColorMode | undefined,
  colors: string[],
  particleIndex: number,
  particleCount: number,
): string | null {
  if (!mode || colors.length === 0) return null;

  if (mode === 'single') {
    return colors[0] ?? null;
  }

  if (mode === 'multi') {
    if (colors.length === 1) return colors[0]!;
    return colors[Math.floor(Math.random() * colors.length)]!;
  }

  if (mode === 'gradient') {
    const start = colors[0]!;
    const end = colors[1] ?? colors[0]!;
    const t = particleCount <= 1 ? 0.5 : particleIndex / (particleCount - 1);
    return lerpKudoHexColor(start, end, t);
  }

  return null;
}

export function kudoIconColorUsesTint(mode: KudoParticleColorMode | undefined): boolean {
  return mode === 'single' || mode === 'multi' || mode === 'gradient';
}
