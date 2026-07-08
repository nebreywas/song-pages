/**
 * VC Controller window — host-only gate overlay and Kudo fire buttons.
 */
const { BrowserWindow } = require('electron');
const path = require('path');
const logger = require('./logger');
const commandService = require('./commands/commandService');
const { devServerUrl } = require('./devServer');
const {
  installTrustedNavigationPolicy,
  resolveAllowedDocumentUrl,
} = require('./trustedWindowNavigation');

/** @type {import('electron').BrowserWindow | null} */
let controllerWindow = null;

/** @type {import('electron').BrowserWindow | null} */
let mainWindowRef = null;

function controllerLoadTarget() {
  if (!require('electron').app.isPackaged) {
    return devServerUrl('/controller-window/controller.html');
  }
  return path.join(__dirname, '..', 'dist', 'controller-window', 'controller.html');
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
    controllerWindow.show();
    syncWindowRefs();
    commandService.broadcastMappingState();
    commandService.broadcastGateState();
  });

  if (!isPackaged) {
    controllerWindow.loadURL(loadTarget);
  } else {
    controllerWindow.loadFile(loadTarget);
  }

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

module.exports = {
  openControllerWindow,
  closeControllerWindow,
  isControllerWindowOpen,
  getControllerWindow,
};
