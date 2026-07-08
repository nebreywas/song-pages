import { parseReservedBindingKey } from './gatedKeys';

/** Human-readable label for a reserved Kudo binding key (settings + Kudos designer). */
export function formatReservedBindingLabel(reservedKey: string): string {
  const parsed = parseReservedBindingKey(reservedKey);
  if (!parsed) return reservedKey;
  if (parsed.source === 'gated') return `Gated ${parsed.binding.toUpperCase()}`;
  if (parsed.source === 'extended-function') return parsed.binding.toUpperCase();
  return `Direct ${parsed.binding}`;
}
