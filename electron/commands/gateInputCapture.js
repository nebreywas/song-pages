/**
 * Capture gated-command keys in Song Pages windows while the gate is armed.
 * Uses before-input-event so hosts can fire gated commands from any app window.
 */
const { evaluateGateKey } = require('./gateHandler');

/** @type {WeakMap<import('electron').WebContents, (event: Electron.Event, input: Electron.Input) => void>} */
const handlers = new WeakMap();

/**
 * @param {import('electron').WebContents | null | undefined} webContents
 * @param {{
 *   getMappingState: () => import('./bindingCodec').CommandMappingState;
 *   onGateKey: (input: Electron.Input) => void;
 * }} options
 */
function attachGateInputCapture(webContents, { getMappingState, onGateKey }) {
  if (!webContents || webContents.isDestroyed() || handlers.has(webContents)) return;

  const handler = (event, input) => {
    const evaluation = evaluateGateKey(getMappingState(), true, input);
    if (evaluation.action === 'ignore') return;

    event.preventDefault();
    onGateKey(input);
  };

  webContents.on('before-input-event', handler);
  handlers.set(webContents, handler);
}

/** @param {import('electron').WebContents | null | undefined} webContents */
function detachGateInputCapture(webContents) {
  if (!webContents || webContents.isDestroyed()) return;
  const handler = handlers.get(webContents);
  if (!handler) return;
  webContents.removeListener('before-input-event', handler);
  handlers.delete(webContents);
}

/**
 * @param {{
 *   enabled: boolean;
 *   windows: Array<import('electron').BrowserWindow | null | undefined>;
 *   getMappingState: () => unknown;
 *   onGateKey: (input: Electron.Input) => void;
 * }} options
 */
function syncGateInputCapture({ enabled, windows, getMappingState, onGateKey }) {
  for (const windowRef of windows) {
    const webContents = windowRef && !windowRef.isDestroyed() ? windowRef.webContents : null;
    if (!webContents) continue;
    if (enabled) attachGateInputCapture(webContents, { getMappingState, onGateKey });
    else detachGateInputCapture(webContents);
  }
}

module.exports = {
  attachGateInputCapture,
  detachGateInputCapture,
  syncGateInputCapture,
};
