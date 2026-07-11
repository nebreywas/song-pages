/**
 * Hardware / extended bindings for the extended-function layer (Stream Deck, macro pads, etc.).
 */

function buildFunctionKeys(): string[] {
  return Array.from({ length: 24 }, (_, index) => `F${index + 1}`);
}

function buildShiftFunctionKeys(): string[] {
  return Array.from({ length: 24 }, (_, index) => `Shift+F${index + 1}`);
}

export const FUNCTION_KEYS = buildFunctionKeys() as readonly string[];

export const SHIFT_FUNCTION_KEYS = buildShiftFunctionKeys() as readonly string[];

/** Navigation and lock keys — Electron accelerator names. */
export const NAVIGATION_BINDING_KEYS = [
  'PrintScreen',
  'ScrollLock',
  'Insert',
  'Home',
  'End',
  'PageUp',
  'PageDown',
] as const;

export const EXTENDED_FUNCTION_KEYS = [
  ...FUNCTION_KEYS,
  ...SHIFT_FUNCTION_KEYS,
  ...NAVIGATION_BINDING_KEYS,
] as const;

/** Settings copy — function-key subsets. */
export const FUNCTION_KEY_POOL_LABEL = 'F1–F24, Shift+F1–F24';

/** Settings copy — navigation / special keys. */
export const NAVIGATION_KEY_POOL_LABEL = 'PrtSc, ScrLk, Ins, Home, End, PgUp, PgDn';

/** Full extended binding pool for settings copy. */
export const EXTENDED_BINDING_POOL_LABEL = `${FUNCTION_KEY_POOL_LABEL}; ${NAVIGATION_KEY_POOL_LABEL}`;

export type ExtendedFunctionKey = (typeof EXTENDED_FUNCTION_KEYS)[number];

const EXTENDED_BINDING_LOOKUP = new Map<string, ExtendedFunctionKey>(
  EXTENDED_FUNCTION_KEYS.map((key) => [key.toLowerCase(), key as ExtendedFunctionKey]),
);

/** Common aliases from macro tools and keyboards. */
const EXTENDED_BINDING_ALIASES: Record<string, ExtendedFunctionKey> = {
  prtsc: 'PrintScreen',
  printscreen: 'PrintScreen',
  scroll: 'ScrollLock',
  scrolllock: 'ScrollLock',
  scrlk: 'ScrollLock',
  ins: 'Insert',
  insert: 'Insert',
  home: 'Home',
  end: 'End',
  pageup: 'PageUp',
  pgup: 'PageUp',
  pagedown: 'PageDown',
  pgdn: 'PageDown',
};

const EXTENDED_BINDING_DISPLAY_LABELS: Partial<Record<ExtendedFunctionKey, string>> = {
  PrintScreen: 'Print Screen',
  ScrollLock: 'Scroll Lock',
  PageUp: 'Page Up',
  PageDown: 'Page Down',
};

function parseFunctionKeyToken(token: string): string | null {
  const match = /^f([1-9]|1[0-9]|2[0-4])$/i.exec(token.trim());
  if (!match) return null;
  return `F${match[1]}`;
}

function parseShiftFunctionKeyToken(binding: string): string | null {
  const match = /^shift\+f([1-9]|1[0-9]|2[0-4])$/i.exec(binding.trim());
  if (!match) return null;
  return `Shift+F${match[1]}`;
}

export function isExtendedFunctionKey(binding: string | undefined): binding is ExtendedFunctionKey {
  if (!binding) return false;
  return normalizeExtendedFunctionKey(binding) != null;
}

export function normalizeExtendedFunctionKey(binding: string): ExtendedFunctionKey | null {
  const trimmed = binding.trim();
  if (!trimmed) return null;

  const alias = EXTENDED_BINDING_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;

  const fromPool = EXTENDED_BINDING_LOOKUP.get(trimmed.toLowerCase());
  if (fromPool) return fromPool;

  const shiftFunctionKey = parseShiftFunctionKeyToken(trimmed);
  if (shiftFunctionKey) {
    return EXTENDED_BINDING_LOOKUP.get(shiftFunctionKey.toLowerCase()) ?? null;
  }

  const functionKey = parseFunctionKeyToken(trimmed);
  if (functionKey) {
    return EXTENDED_BINDING_LOOKUP.get(functionKey.toLowerCase()) ?? null;
  }

  return null;
}

/** Electron globalShortcut accelerator for a stored extended binding. */
export function extendedBindingToElectronAccelerator(binding: string): string {
  return normalizeExtendedFunctionKey(binding) ?? binding;
}

/** Dropdown / overlay label for an extended binding token. */
export function formatExtendedBindingLabel(binding: string): string {
  const normalized = normalizeExtendedFunctionKey(binding);
  if (!normalized) return binding;
  return EXTENDED_BINDING_DISPLAY_LABELS[normalized as ExtendedFunctionKey] ?? normalized;
}
