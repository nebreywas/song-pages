export const EXTENDED_FUNCTION_KEYS = [
  'F13', 'F14', 'F15', 'F16', 'F17', 'F18', 'F19', 'F20', 'F21', 'F22', 'F23', 'F24',
] as const;

export type ExtendedFunctionKey = (typeof EXTENDED_FUNCTION_KEYS)[number];

export function isExtendedFunctionKey(binding: string | undefined): binding is ExtendedFunctionKey {
  if (!binding) return false;
  return (EXTENDED_FUNCTION_KEYS as readonly string[]).includes(binding.toUpperCase());
}

export function normalizeExtendedFunctionKey(binding: string): ExtendedFunctionKey | null {
  const upper = binding.toUpperCase();
  return isExtendedFunctionKey(upper) ? upper : null;
}
