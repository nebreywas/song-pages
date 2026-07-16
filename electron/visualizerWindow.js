/**
 * Projector window — Song Page / Visualizer / Video theater.
 * Main window owns queue authority; FFT / video transport stream via IPC.
 */
const { BrowserWindow, screen } = require('electron');
const path = require('path');
const logger = require('./logger');
const { devServerUrl } = require('./devServer');
const {
  installTrustedNavigationPolicy,
  resolveAllowedDocumentUrl,
} = require('./trustedWindowNavigation');

/** @type {import('electron').BrowserWindow | null} */
let visualizerWindow = null;

/** @type {import('electron').BrowserWindow | null} */
let mainWindowRef = null;

function visualizerLoadUrl() {
  if (!require('electron').app.isPackaged) {
    return devServerUrl('/visualizer-window/visualizer.html');
  }
  return path.join(__dirname, '..', 'dist', 'visualizer-window', 'visualizer.html');
}

function sendToVisualizer(channel, payload) {
  if (!visualizerWindow || visualizerWindow.isDestroyed()) return false;
  visualizerWindow.webContents.send(channel, payload);
  return true;
}

function sendVisualizerConfig(payload) {
  sendToVisualizer('visualizer:config', payload);
}

function sendVisualizerFrame(payload) {
  sendToVisualizer('visualizer:frame', payload);
}

/**
 * @param {import('electron').BrowserWindow} mainWindow
 * @param {{ fullscreen?: boolean; displayId?: number | null }} [options]
 */
function openVisualizerWindow(mainWindow, options = {}) {
  mainWindowRef = mainWindow;

  if (visualizerWindow && !visualizerWindow.isDestroyed()) {
    visualizerWindow.focus();
    if (options.fullscreen) {
      visualizerWindow.setFullScreen(true);
    }
    return { ok: true };
  }

  const targetDisplay =
    options.displayId != null
      ? screen.getAllDisplays().find((display) => display.id === options.displayId) ?? screen.getPrimaryDisplay()
      : screen.getPrimaryDisplay();

  const { x, y, width, height } = targetDisplay.bounds;

  const isPackaged = require('electron').app.isPackaged;
  const loadTarget = visualizerLoadUrl();

  visualizerWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    minWidth: 640,
    minHeight: 360,
    title: 'Projector: Song Page',
    backgroundColor: '#04060c',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      // Song Page projection uses <webview> guests (same as the main Listener window).
      // webviewTag must be on; sandbox breaks guest rendering in the parent.
      sandbox: false,
      webviewTag: true,
      nodeIntegration: false,
      webSecurity: false,
      backgroundThrottling: false,
    },
  });

  installTrustedNavigationPolicy(visualizerWindow, {
    role: 'visualizer',
    allowedDocumentUrl: resolveAllowedDocumentUrl(loadTarget, isPackaged),
    isPackaged,
  });

  visualizerWindow.on('closed', () => {
    visualizerWindow = null;
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.webContents.send('visualizer:closed');
    }
  });

  visualizerWindow.on('enter-full-screen', () => {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.webContents.send('visualizer:fullscreen-changed', true);
    }
  });

  visualizerWindow.on('leave-full-screen', () => {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.webContents.send('visualizer:fullscreen-changed', false);
    }
  });

  visualizerWindow.once('ready-to-show', () => {
    visualizerWindow.show();
    if (options.fullscreen) {
      visualizerWindow.setFullScreen(true);
    }
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.webContents.send('visualizer:opened');
    }
  });

  visualizerWindow.webContents.once('did-finish-load', () => {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.webContents.send('visualizer:request-sync');
    }
  });

  if (!isPackaged) {
    visualizerWindow.loadURL(loadTarget);
  } else {
    visualizerWindow.loadFile(loadTarget);
  }

  logger.info('Projector window opened');
  return { ok: true };
}

/** Keep the OS window title in sync with Song Page / Visualizer / Video. */
function setVisualizerWindowTitle(title) {
  if (!visualizerWindow || visualizerWindow.isDestroyed()) {
    return { ok: false, error: 'Projector window is not open.' };
  }
  const next = typeof title === 'string' && title.trim() ? title.trim() : 'Projector: Song Page';
  visualizerWindow.setTitle(next);
  return { ok: true };
}

function closeVisualizerWindow() {
  if (!visualizerWindow || visualizerWindow.isDestroyed()) {
    return { ok: true };
  }
  visualizerWindow.close();
  return { ok: true };
}

function setVisualizerFullScreen(fullscreen) {
  if (!visualizerWindow || visualizerWindow.isDestroyed()) {
    return { ok: false, error: 'Visualizer window is not open.' };
  }
  visualizerWindow.setFullScreen(Boolean(fullscreen));
  return { ok: true };
}

function isVisualizerWindowOpen() {
  return Boolean(visualizerWindow && !visualizerWindow.isDestroyed());
}

function isVisualizerFullScreen() {
  if (!visualizerWindow || visualizerWindow.isDestroyed()) return false;
  return visualizerWindow.isFullScreen();
}

function listDisplays() {
  return screen.getAllDisplays().map((display) => ({
    id: display.id,
    label: display.label || `Display ${display.id}`,
    primary: display.id === screen.getPrimaryDisplay().id,
    bounds: display.bounds,
  }));
}

module.exports = {
  openVisualizerWindow,
  closeVisualizerWindow,
  setVisualizerWindowTitle,
  setVisualizerFullScreen,
  isVisualizerWindowOpen,
  isVisualizerFullScreen,
  listDisplays,
  sendVisualizerConfig,
  sendVisualizerFrame,
};
