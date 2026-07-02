/**
 * VC Mode projection window — visual mixer for listening parties.
 */
const { BrowserWindow, screen } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const logger = require('./logger');
const vcHotkeys = require('./vcHotkeys');

/** @type {import('electron').BrowserWindow | null} */
let vcWindow = null;

/** @type {import('electron').BrowserWindow | null} */
let mainWindowRef = null;

const DEV_SERVER_URL = 'http://localhost:5173';

function vcLoadTarget() {
  if (!require('electron').app.isPackaged) {
    return `${DEV_SERVER_URL}/vc-window/vc.html`;
  }
  return path.join(__dirname, '..', 'dist', 'vc-window', 'vc.html');
}

function sendToVc(channel, payload) {
  if (!vcWindow || vcWindow.isDestroyed()) return false;
  vcWindow.webContents.send(channel, payload);
  return true;
}

function sendVcState(payload) {
  sendToVc('vc:state', payload);
}

function sendVcFrame(payload) {
  sendToVc('vc:frame', payload);
}

function sendVcHotkey(action) {
  sendToVc('vc:hotkey', { action });
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('vc:hotkey', { action });
  }
}

function hostGraphicUrlFromPath(filePath) {
  if (!filePath || typeof filePath !== 'string') return null;
  try {
    return pathToFileURL(filePath).href;
  } catch {
    return null;
  }
}

/**
 * @param {import('electron').BrowserWindow} mainWindow
 * @param {{ fullscreen?: boolean }} [options]
 */
function openVcWindow(mainWindow, options = {}) {
  mainWindowRef = mainWindow;

  if (vcWindow && !vcWindow.isDestroyed()) {
    vcWindow.focus();
    if (options.fullscreen) vcWindow.setFullScreen(true);
    return { ok: true };
  }

  const display = screen.getPrimaryDisplay();
  const { x, y, width, height } = display.bounds;

  vcWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    minWidth: 800,
    minHeight: 500,
    title: 'Song Pages — VC Mode',
    backgroundColor: '#000000',
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

  vcWindow.on('closed', () => {
    vcWindow = null;
    vcHotkeys.unregisterVcHotkeys();
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.webContents.send('vc:closed');
    }
  });

  vcWindow.once('ready-to-show', () => {
    vcWindow.show();
    if (options.fullscreen) vcWindow.setFullScreen(true);
    vcHotkeys.registerVcHotkeys(sendVcHotkey);
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.webContents.send('vc:opened');
    }
  });

  vcWindow.webContents.once('did-finish-load', () => {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.webContents.send('vc:request-sync');
    }
  });

  if (!require('electron').app.isPackaged) {
    vcWindow.loadURL(vcLoadTarget());
  } else {
    vcWindow.loadFile(vcLoadTarget());
  }

  logger.info('VC Mode window opened');
  return { ok: true };
}

function closeVcWindow() {
  if (!vcWindow || vcWindow.isDestroyed()) return { ok: true };
  vcWindow.close();
  return { ok: true };
}

function setVcFullScreen(fullscreen) {
  if (!vcWindow || vcWindow.isDestroyed()) {
    return { ok: false, error: 'VC window is not open.' };
  }
  vcWindow.setFullScreen(Boolean(fullscreen));
  return { ok: true };
}

function isVcWindowOpen() {
  return Boolean(vcWindow && !vcWindow.isDestroyed());
}

function isVcFullScreen() {
  if (!vcWindow || vcWindow.isDestroyed()) return false;
  return vcWindow.isFullScreen();
}

module.exports = {
  openVcWindow,
  closeVcWindow,
  setVcFullScreen,
  isVcWindowOpen,
  isVcFullScreen,
  sendVcState,
  sendVcFrame,
  hostGraphicUrlFromPath,
};
