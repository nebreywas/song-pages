/**
 * Dedicated projection window for fullscreen visualizers.
 * Main window owns audio; FFT frames stream via IPC (one-way).
 */
const { BrowserWindow, screen } = require('electron');
const path = require('path');
const logger = require('./logger');

/** @type {import('electron').BrowserWindow | null} */
let visualizerWindow = null;

/** @type {import('electron').BrowserWindow | null} */
let mainWindowRef = null;

const DEV_SERVER_URL = 'http://localhost:5173';

function visualizerLoadUrl() {
  if (!require('electron').app.isPackaged) {
    return `${DEV_SERVER_URL}/visualizer-window/visualizer.html`;
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

  visualizerWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    minWidth: 640,
    minHeight: 360,
    title: 'Song Pages Visualizer',
    backgroundColor: '#04060c',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
      webSecurity: false,
      backgroundThrottling: false,
    },
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

  if (!require('electron').app.isPackaged) {
    visualizerWindow.loadURL(visualizerLoadUrl());
  } else {
    visualizerWindow.loadFile(visualizerLoadUrl());
  }

  logger.info('Visualizer window opened');
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
  setVisualizerFullScreen,
  isVisualizerWindowOpen,
  isVisualizerFullScreen,
  listDisplays,
  sendVisualizerConfig,
  sendVisualizerFrame,
};
