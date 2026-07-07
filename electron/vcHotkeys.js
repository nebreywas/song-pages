/**
 * Global VC host hotkeys — active while VC mode window is open.
 * Fires from either window focus (dual-monitor friendly).
 */
const { globalShortcut } = require('electron');
const logger = require('./logger');

/** @type {string[]} */
const registeredAccelerators = [];

/** @type {((action: string) => void) | null} */
let hotkeyHandler = null;

const VC_HOTKEYS = [
  { accelerator: 'CommandOrControl+Alt+C', action: 'cover' },
  { accelerator: 'CommandOrControl+Alt+F', action: 'host' },
  { accelerator: 'CommandOrControl+Alt+N', action: 'next' },
  { accelerator: 'CommandOrControl+Alt+P', action: 'praise' },
  { accelerator: 'CommandOrControl+Alt+R', action: 'remaining' },
  { accelerator: 'CommandOrControl+Alt+S', action: 'songInfo' },
  { accelerator: 'CommandOrControl+Alt+U', action: 'upcoming' },
  // Toggle bright red area/float outlines on the VC surface (debug only).
  { accelerator: 'CommandOrControl+Alt+D', action: 'debugOutlines' },
  // Toggle fullscreen layout editing — move/resize areas and floats on the VC surface.
  { accelerator: 'CommandOrControl+Alt+L', action: 'layoutMode' },
  // ALARE lyric scroll trim — small live correction (cleared only via ⌘⌥0).
  { accelerator: 'CommandOrControl+Alt+=', action: 'alareSpeedUp' },
  { accelerator: 'CommandOrControl+Alt+-', action: 'alareSpeedDown' },
  { accelerator: 'CommandOrControl+Alt+0', action: 'alareSpeedReset' },
];

function registerVcHotkeys(onHotkey) {
  unregisterVcHotkeys();
  hotkeyHandler = onHotkey;

  for (const { accelerator, action } of VC_HOTKEYS) {
    const ok = globalShortcut.register(accelerator, () => {
      if (hotkeyHandler) hotkeyHandler(action);
    });
    if (ok) {
      registeredAccelerators.push(accelerator);
    } else {
      logger.warn('VC hotkey registration failed', { accelerator });
    }
  }

  logger.debug('VC hotkeys registered', { count: registeredAccelerators.length });
}

function unregisterVcHotkeys() {
  for (const accelerator of registeredAccelerators) {
    globalShortcut.unregister(accelerator);
  }
  registeredAccelerators.length = 0;
  hotkeyHandler = null;
}

module.exports = { registerVcHotkeys, unregisterVcHotkeys };
