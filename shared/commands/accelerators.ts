import { MODIFIER_CS, MODIFIER_OCAW } from './constants';

type Platform = 'darwin' | 'win32' | 'linux';

/** Keys passed through literally to Electron — not uppercased like letters. */
const LITERAL_ACCELERATOR_KEYS = new Set(['=', '-', '[', ']', '\\', '<', '>', ',', '.', '/', ';', "'"]);

/**
 * Expand logical punctuation to Electron accelerator key tokens.
 * Comma and period are literal (no Shift). Legacy `<` / `>` also register without Shift.
 */
function literalLogicalKeyToElectronParts(key: string): string[] {
  if (LITERAL_ACCELERATOR_KEYS.has(key)) return [key];
  if (/^F([1-9]|1[0-9]|2[0-4])$/i.test(key)) return [key.toUpperCase()];
  if (key.length === 1) return [key.toUpperCase()];
  return [key];
}

/** Logical binding token, e.g. OCAW+L or CS+N or F17. */
export function parseLogicalBinding(binding: string): {
  modifiers: string[];
  key: string;
} {
  const parts = binding.split('+').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return { modifiers: [], key: '' };
  const key = parts[parts.length - 1]!;
  const modifiers = parts.slice(0, -1);
  return { modifiers, key };
}

function modifierToElectron(modifier: string, platform: Platform): string | null {
  if (modifier === MODIFIER_OCAW) {
    return platform === 'darwin' ? 'Alt+Command' : 'Alt+Super';
  }
  if (modifier === MODIFIER_CS) {
    return 'Control+Shift';
  }
  if (modifier === 'CommandOrControl') return 'CommandOrControl';
  if (modifier === 'Control') return 'Control';
  if (modifier === 'Shift') return 'Shift';
  if (modifier === 'Alt') return 'Alt';
  if (modifier === 'Command') return platform === 'darwin' ? 'Command' : 'Super';
  return null;
}

/** Convert logical Safe Direct binding to Electron globalShortcut accelerator. */
export function logicalBindingToElectronAccelerator(binding: string, platform: Platform = 'darwin'): string {
  const { modifiers, key } = parseLogicalBinding(binding);
  const electronModifiers = modifiers
    .map((modifier) => modifierToElectron(modifier, platform))
    .filter((value): value is string => value != null);

  if (/^F([1-9]|1[0-9]|2[0-4])$/i.test(key)) {
    return [...electronModifiers, key.toUpperCase()].join('+');
  }

  return [...electronModifiers, ...literalLogicalKeyToElectronParts(key)].join('+');
}

/** Electron accelerator → logical binding for persistence/display. */
export function electronAcceleratorToLogical(binding: string, platform: Platform = 'darwin'): string {
  const parts = binding.split('+');
  const key = parts[parts.length - 1] ?? '';
  const modifiers = parts.slice(0, -1);
  const logicalModifiers: string[] = [];

  const hasAlt = modifiers.includes('Alt');
  const hasCmd =
    modifiers.includes('Command') || modifiers.includes('Super') || modifiers.includes('Cmd');
  const hasCtrl = modifiers.includes('Control') || modifiers.includes('CommandOrControl');
  const hasShift = modifiers.includes('Shift');

  if (hasAlt && hasCmd) {
    logicalModifiers.push(MODIFIER_OCAW);
  } else if (hasCtrl && hasShift) {
    logicalModifiers.push(MODIFIER_CS);
  } else {
    for (const modifier of modifiers) {
      if (modifier === 'Control' || modifier === 'CommandOrControl') logicalModifiers.push('Control');
      else if (modifier === 'Shift') logicalModifiers.push('Shift');
      else if (modifier === 'Alt') logicalModifiers.push('Alt');
      else if (modifier === 'Command' || modifier === 'Super') {
        logicalModifiers.push(platform === 'darwin' ? 'Command' : 'Super');
      }
    }
  }

  const logicalKey =
    key === ','
      ? ','
      : key === '.'
        ? '.'
        : key === 'Plus' || key === '='
      ? '='
      : key === 'Minus' || key === '-'
        ? '-'
        : key === 'BracketLeft' || key === '['
          ? '['
          : key === 'BracketRight' || key === ']'
            ? ']'
            : key === 'Backslash' || key === '\\'
              ? '\\'
              : key === 'Slash' || key === '/'
                ? '/'
                : key === '<'
                  ? '<'
                  : key === '>'
                    ? '>'
                    : key === 'Semicolon' || key === ';'
              ? ';'
              : key === 'Quote' || key === "'"
                ? "'"
                : /^[A-Z]$/.test(key)
                  ? key.toLowerCase()
                  : key;

  return [...logicalModifiers, logicalKey].join('+');
}
