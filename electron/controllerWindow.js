/**
 * VC Controller window — host-only gate overlay and Kudo fire buttons.
 */
const { BrowserWindow } = require('electron');
const path = require('path');
const logger = require('./logger');
const commandService = require('./commands/commandService');
const {
  installTrustedNavigationPolicy,
  resolveAllowedDocumentUrl,
} = require('./trustedWindowNavigation');

/** @type {import('electron').BrowserWindow | null} */
let controllerWindow = null;

/** @type {import('electron').BrowserWindow | null} */
let mainWindowRef = null;

/** Remember host preference across controller close/reopen during a session. */
let controllerAlwaysOnTop = false;

function applyControllerAlwaysOnTop() {
  if (!controllerWindow || controllerWindow.isDestroyed()) return;
  controllerWindow.setAlwaysOnTop(controllerAlwaysOnTop, 'floating');
}

function controllerLoadTarget() {
  // Dev → Vite; packaged → loopback static server (consistent origin).
  return require('./appServer').appDocUrl(
    '/controller-window/controller.html',
    require('electron').app.isPackaged,
  );
}

function syncWindowRefs() {
  const vcWindow = require('./vcWindow');
  commandService.setWindowRefs({
    mainWindow: mainWindowRef,
    vcWindow: vcWindow.getVcWindow(),
    controllerWindow,
  });
}

function openControllerWindow(mainWindow) {
  mainWindowRef = mainWindow;

  if (controllerWindow && !controllerWindow.isDestroyed()) {
    controllerWindow.show();
    controllerWindow.focus();
    applyControllerAlwaysOnTop();
    syncWindowRefs();
    return { ok: true };
  }

  const isPackaged = require('electron').app.isPackaged;
  const loadTarget = controllerLoadTarget();

  controllerWindow = new BrowserWindow({
    width: 420,
    height: 640,
    minWidth: 320,
    minHeight: 400,
    title: 'Song Pages — VC Controller',
    backgroundColor: '#12151c',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  installTrustedNavigationPolicy(controllerWindow, {
    role: 'controller',
    allowedDocumentUrl: resolveAllowedDocumentUrl(loadTarget, isPackaged),
    isPackaged,
  });

  controllerWindow.on('closed', () => {
    controllerWindow = null;
    commandService.closeGate('controller-closed');
    syncWindowRefs();
  });

  controllerWindow.once('ready-to-show', () => {
    applyControllerAlwaysOnTop();
    controllerWindow.show();
    syncWindowRefs();
    commandService.broadcastMappingState();
    commandService.broadcastGateState();
  });

  // loadTarget is always a URL now (http in both dev and packaged).
  controllerWindow.loadURL(loadTarget);

  syncWindowRefs();
  logger.info('VC Controller window opened');
  return { ok: true };
}

function closeControllerWindow() {
  if (!controllerWindow || controllerWindow.isDestroyed()) return { ok: true };
  controllerWindow.close();
  return { ok: true };
}

function isControllerWindowOpen() {
  return Boolean(controllerWindow && !controllerWindow.isDestroyed());
}

function getControllerWindow() {
  return controllerWindow && !controllerWindow.isDestroyed() ? controllerWindow : null;
}

function sendControllerVcState(payload) {
  if (!controllerWindow || controllerWindow.isDestroyed()) return;
  controllerWindow.webContents.send('vc:state', payload);
}

function setControllerAlwaysOnTop(enabled) {
  controllerAlwaysOnTop = Boolean(enabled);
  applyControllerAlwaysOnTop();
  return { ok: true, data: { alwaysOnTop: controllerAlwaysOnTop } };
}

function getControllerAlwaysOnTop() {
  if (controllerWindow && !controllerWindow.isDestroyed()) {
    return controllerWindow.isAlwaysOnTop();
  }
  return controllerAlwaysOnTop;
}

module.exports = {
  openControllerWindow,
  closeControllerWindow,
  isControllerWindowOpen,
  getControllerWindow,
  sendControllerVcState,
  setControllerAlwaysOnTop,
  getControllerAlwaysOnTop,
};
