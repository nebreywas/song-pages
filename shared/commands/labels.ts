import { formatExtendedBindingLabel } from './extendedKeys';
import { parseReservedBindingKey } from './gatedKeys';

/** Human-readable label for a reserved Kudo binding key (settings + Kudos designer). */
export function formatReservedBindingLabel(reservedKey: string): string {
  const parsed = parseReservedBindingKey(reservedKey);
  if (!parsed) return reservedKey;
  if (parsed.source === 'gated') return `Gated ${parsed.binding.toUpperCase()}`;
  if (parsed.source === 'extended-function') return formatExtendedBindingLabel(parsed.binding);
  return `Direct ${parsed.binding}`;
}
