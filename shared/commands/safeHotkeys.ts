import { MODIFIER_CS, MODIFIER_OCAW, SAFE_HOTKEY_AUDIT_VERSION } from './constants';
import type { SafeHotkeyDefinition } from './types';

/**
 * Audited Safe Direct pool — MVP 1.0.
 * OCAW letters used by legacy VC defaults are included; CS family adds low-collision extras.
 */
export const SAFE_DIRECT_HOTKEY_POOL: SafeHotkeyDefinition[] = [
  // Legacy VC defaults (OCAW)
  { id: 'ocaw-c', logicalBinding: `${MODIFIER_OCAW}+c`, macBinding: 'Alt+Command+C', windowsBinding: 'Alt+Super+C', auditVersion: SAFE_HOTKEY_AUDIT_VERSION, enabled: true },
  { id: 'ocaw-d', logicalBinding: `${MODIFIER_OCAW}+d`, macBinding: 'Alt+Command+D', windowsBinding: 'Alt+Super+D', auditVersion: SAFE_HOTKEY_AUDIT_VERSION, enabled: true },
  { id: 'ocaw-f', logicalBinding: `${MODIFIER_OCAW}+f`, macBinding: 'Alt+Command+F', windowsBinding: 'Alt+Super+F', auditVersion: SAFE_HOTKEY_AUDIT_VERSION, enabled: true },
  { id: 'ocaw-g', logicalBinding: `${MODIFIER_OCAW}+g`, macBinding: 'Alt+Command+G', windowsBinding: 'Alt+Super+G', auditVersion: SAFE_HOTKEY_AUDIT_VERSION, enabled: true },
  { id: 'ocaw-h', logicalBinding: `${MODIFIER_OCAW}+h`, macBinding: 'Alt+Command+H', windowsBinding: 'Alt+Super+H', auditVersion: SAFE_HOTKEY_AUDIT_VERSION, enabled: true },
  { id: 'ocaw-l', logicalBinding: `${MODIFIER_OCAW}+l`, macBinding: 'Alt+Command+L', windowsBinding: 'Alt+Super+L', auditVersion: SAFE_HOTKEY_AUDIT_VERSION, enabled: true },
  { id: 'ocaw-n', logicalBinding: `${MODIFIER_OCAW}+n`, macBinding: 'Alt+Command+N', windowsBinding: 'Alt+Super+N', auditVersion: SAFE_HOTKEY_AUDIT_VERSION, enabled: true },
  { id: 'ocaw-r', logicalBinding: `${MODIFIER_OCAW}+r`, macBinding: 'Alt+Command+R', windowsBinding: 'Alt+Super+R', auditVersion: SAFE_HOTKEY_AUDIT_VERSION, enabled: true },
  { id: 'ocaw-s', logicalBinding: `${MODIFIER_OCAW}+s`, macBinding: 'Alt+Command+S', windowsBinding: 'Alt+Super+S', auditVersion: SAFE_HOTKEY_AUDIT_VERSION, enabled: true },
  { id: 'ocaw-u', logicalBinding: `${MODIFIER_OCAW}+u`, macBinding: 'Alt+Command+U', windowsBinding: 'Alt+Super+U', auditVersion: SAFE_HOTKEY_AUDIT_VERSION, enabled: true },
  { id: 'ocaw-eq', logicalBinding: `${MODIFIER_OCAW}+=`, macBinding: 'Alt+Command+=', windowsBinding: 'Alt+Super+=', auditVersion: SAFE_HOTKEY_AUDIT_VERSION, enabled: true },
  { id: 'ocaw-minus', logicalBinding: `${MODIFIER_OCAW}+-`, macBinding: 'Alt+Command+-', windowsBinding: 'Alt+Super+-', auditVersion: SAFE_HOTKEY_AUDIT_VERSION, enabled: true },
  { id: 'ocaw-lbracket', logicalBinding: `${MODIFIER_OCAW}+[`, macBinding: 'Alt+Command+[', windowsBinding: 'Alt+Super+[', auditVersion: SAFE_HOTKEY_AUDIT_VERSION, enabled: true },
  { id: 'ocaw-rbracket', logicalBinding: `${MODIFIER_OCAW}+]`, macBinding: 'Alt+Command+]', windowsBinding: 'Alt+Super+]', auditVersion: SAFE_HOTKEY_AUDIT_VERSION, enabled: true },
  { id: 'ocaw-semicolon', logicalBinding: `${MODIFIER_OCAW}+;`, macBinding: 'Alt+Command+;', windowsBinding: 'Alt+Super+;', auditVersion: SAFE_HOTKEY_AUDIT_VERSION, enabled: true },
  { id: 'ocaw-quote', logicalBinding: `${MODIFIER_OCAW}+'`, macBinding: "Alt+Command+'", windowsBinding: "Alt+Super+'", auditVersion: SAFE_HOTKEY_AUDIT_VERSION, enabled: true },
  { id: 'ocaw-0', logicalBinding: `${MODIFIER_OCAW}+0`, macBinding: 'Alt+Command+0', windowsBinding: 'Alt+Super+0', auditVersion: SAFE_HOTKEY_AUDIT_VERSION, enabled: true },

  // CS extras for future player/VC commands
  { id: 'cs-l', logicalBinding: `${MODIFIER_CS}+l`, macBinding: 'Control+Shift+L', windowsBinding: 'Control+Shift+L', auditVersion: SAFE_HOTKEY_AUDIT_VERSION, enabled: true },
  { id: 'cs-v', logicalBinding: `${MODIFIER_CS}+v`, macBinding: 'Control+Shift+V', windowsBinding: 'Control+Shift+V', auditVersion: SAFE_HOTKEY_AUDIT_VERSION, enabled: true },
  { id: 'cs-c', logicalBinding: `${MODIFIER_CS}+c`, macBinding: 'Control+Shift+C', windowsBinding: 'Control+Shift+C', auditVersion: SAFE_HOTKEY_AUDIT_VERSION, enabled: true },
  { id: 'cs-n', logicalBinding: `${MODIFIER_CS}+n`, macBinding: 'Control+Shift+N', windowsBinding: 'Control+Shift+N', auditVersion: SAFE_HOTKEY_AUDIT_VERSION, enabled: true },
  { id: 'cs-p', logicalBinding: `${MODIFIER_CS}+p`, macBinding: 'Control+Shift+P', windowsBinding: 'Control+Shift+P', auditVersion: SAFE_HOTKEY_AUDIT_VERSION, enabled: true },
];

const POOL_BY_LOGICAL = new Map(
  SAFE_DIRECT_HOTKEY_POOL.filter((row) => row.enabled).map((row) => [row.logicalBinding.toLowerCase(), row]),
);

export function isSafeDirectBinding(binding: string | undefined): boolean {
  if (!binding) return false;
  return POOL_BY_LOGICAL.has(binding.toLowerCase());
}

export function listEnabledSafeDirectBindings(): string[] {
  return SAFE_DIRECT_HOTKEY_POOL.filter((row) => row.enabled).map((row) => row.logicalBinding);
}
