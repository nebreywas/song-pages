/**
 * Collapse / restore the main window around the listener control bar.
 * Saves bounds before minify so expand returns to the prior layout.
 */

const DEFAULT_MIN_WIDTH = 900;
const DEFAULT_MIN_HEIGHT = 600;
const MINIFIED_MIN_WIDTH = 420;
const MINIFIED_MIN_HEIGHT = 96;

/** @type {Electron.Rectangle | null} */
let savedBounds = null;
/** @type {[number, number] | null} */
let savedMinimumSize = null;

/**
 * @param {import('electron').BrowserWindow | null | undefined} mainWindow
 * @param {{ minified: boolean; contentWidth?: number; contentHeight?: number }} payload
 */
function setListenerChromeMinified(mainWindow, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { ok: false, error: 'Main window unavailable.' };
  }

  const { minified, contentWidth, contentHeight } = payload;

  if (minified) {
    const width = Math.max(MINIFIED_MIN_WIDTH, Math.round(contentWidth || MINIFIED_MIN_WIDTH));
    const height = Math.max(MINIFIED_MIN_HEIGHT, Math.round(contentHeight || MINIFIED_MIN_HEIGHT));

    if (!savedBounds) {
      savedBounds = mainWindow.getBounds();
      savedMinimumSize = mainWindow.getMinimumSize();
    }

    mainWindow.setMinimumSize(MINIFIED_MIN_WIDTH, MINIFIED_MIN_HEIGHT);
    mainWindow.setContentSize(width, height, true);
    return { ok: true };
  }

  if (savedMinimumSize) {
    mainWindow.setMinimumSize(savedMinimumSize[0], savedMinimumSize[1]);
  } else {
    mainWindow.setMinimumSize(DEFAULT_MIN_WIDTH, DEFAULT_MIN_HEIGHT);
  }

  if (savedBounds) {
    mainWindow.setBounds(savedBounds);
    savedBounds = null;
    savedMinimumSize = null;
  }

  return { ok: true };
}

module.exports = {
  setListenerChromeMinified,
};
