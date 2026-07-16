/**
 * Branded About window — macOS native About ignores runtime icons in dev (Electron.app bundle).
 */
const { BrowserWindow, nativeImage } = require('electron');
const path = require('path');
const pkg = require('../package.json');

const LOGO_PATH = path.resolve(__dirname, '..', 'images', 'app-icon.png');

/** @type {BrowserWindow | null} */
let aboutWindow = null;

/** @param {import('electron').BrowserWindow | null | undefined} _parentWindow */
function showAboutPanel(_parentWindow) {
  if (aboutWindow && !aboutWindow.isDestroyed()) {
    aboutWindow.focus();
    return aboutWindow;
  }

  const logo = nativeImage.createFromPath(LOGO_PATH);
  const logoDataUrl = logo.isEmpty() ? '' : logo.toDataURL();

  aboutWindow = new BrowserWindow({
    width: 340,
    height: 340,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    closable: true,
    show: false,
    title: 'About Song Pages',
    backgroundColor: '#323232',
    webPreferences: {
      sandbox: true,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  aboutWindow.on('closed', () => {
    aboutWindow = null;
  });

  aboutWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape' && aboutWindow && !aboutWindow.isDestroyed()) {
      aboutWindow.close();
    }
  });

  const htmlPath = path.join(__dirname, 'about-panel.html');
  void aboutWindow
    .loadFile(htmlPath)
    .then(() =>
      aboutWindow.webContents.executeJavaScript(`
        document.getElementById('logo').src = ${JSON.stringify(logoDataUrl)};
        document.getElementById('version').textContent = 'Version ${pkg.version} (${pkg.version})';
      `),
    )
    .then(() => {
      if (!aboutWindow || aboutWindow.isDestroyed()) return;
      aboutWindow.center();
      aboutWindow.show();
    });

  return aboutWindow;
}

module.exports = { showAboutPanel };
