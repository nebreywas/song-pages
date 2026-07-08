/** SQLite settings key — host command binding state. */
export const COMMAND_MAPPINGS_SETTINGS_KEY = 'commands.mappings';

export const COMMAND_MAPPINGS_STATE_VERSION = 2;

/** Gate auto-closes after this idle period (ms). */
export const COMMAND_GATE_TIMEOUT_MS_DEFAULT = 8000;

/** Ignore gated-key input briefly after open so OCAW+G release does not instantly close. */
export const COMMAND_GATE_INPUT_GRACE_MS = 400;

/** Modifier family: Option+Command (Mac) / Alt+Windows (Win). */
export const MODIFIER_OCAW = 'OCAW';

/** Modifier family: Control+Shift (both platforms). */
export const MODIFIER_CS = 'CS';

export const SAFE_HOTKEY_AUDIT_VERSION = '2026-07-mvp1';
