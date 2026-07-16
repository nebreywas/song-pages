/** Deterministic hashing and seeded utilities — no Math.random(). */

/** FNV-1a 32-bit hash of a string. */
export function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable hex source fingerprint for caching / diagnostics. */
export function sourceHash(lyrics: string): string {
  const h1 = hashString(lyrics);
  const h2 = hashString(`${lyrics.length}:${lyrics.slice(0, 64)}:${lyrics.slice(-64)}`);
  return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

/** Mulberry32 — deterministic [0, 1) stream from a seed. */
export function createSeededRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick an index in [0, count) deterministically from a key. */
export function seededIndex(seed: number, key: string, count: number): number {
  if (count <= 0) return 0;
  return hashString(`${seed}:${key}`) % count;
}
