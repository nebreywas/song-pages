/** Single-character keys allowed for gated command mapping. */
export const GATED_KEY_POOL = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  '[', ']', '-', '=',
] as const;

export type GatedKey = (typeof GATED_KEY_POOL)[number];

export const GATED_RESERVED_KEYS = ['Escape'] as const;

export function isGatedKeyAllowed(key: string): boolean {
  return (GATED_KEY_POOL as readonly string[]).includes(key.toLowerCase());
}

export function normalizeGatedKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

export function reservedBindingKey(source: 'gated' | 'direct' | 'extended-function', binding: string): string {
  return `${source}:${binding}`;
}

export function parseReservedBindingKey(key: string): { source: 'gated' | 'direct' | 'extended-function'; binding: string } | null {
  const match = /^(gated|direct|extended-function):(.+)$/.exec(key);
  if (!match) return null;
  return { source: match[1] as 'gated' | 'direct' | 'extended-function', binding: match[2]! };
}
