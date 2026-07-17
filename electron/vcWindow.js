/**
 * Projector: VC Mode — visual mixer for listening parties.
 * Playback audio is mirrored here so window-only screen share includes music.
 */
const { BrowserWindow, screen } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const logger = require('./logger');
const commandService = require('./commands/commandService');
const controllerWindow = require('./controllerWindow');
const {
  installTrustedNavigationPolicy,
  resolveAllowedDocumentUrl,
} = require('./trustedWindowNavigation');

/** @type {import('electron').BrowserWindow | null} */
let vcWindow = null;

/** @type {import('electron').BrowserWindow | null} */
let mainWindowRef = null;

const DEV_SERVER_URL = require('./devServer').devServerOrigin();

const VC_MIN_WIDTH = 800;
const VC_MIN_HEIGHT = 500;
const PROJECTION_WINDOW_REPORT_DEBOUNCE_MS = 400;

/** @type {ReturnType<typeof setTimeout> | null} */
let projectionWindowReportTimer = null;

/** Last non-fullscreen bounds — kept so fullscreen toggles do not lose windowed size. */
let lastWindowedBounds = null;

function normalizeProjectionWindow(bounds) {
  if (!bounds || typeof bounds !== 'object') return null;
  const width = Math.max(VC_MIN_WIDTH, Math.round(Number(bounds.width) || 0));
  const height = Math.max(VC_MIN_HEIGHT, Math.round(Number(bounds.height) || 0));
  const x = Math.round(Number(bounds.x) || 0);
  const y = Math.round(Number(bounds.y) || 0);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  return {
    x,
    y,
    width,
    height,
    isFullScreen: bounds.isFullScreen === true,
  };
}

function readWindowedBounds(win) {
  if (!win || win.isDestroyed() || win.isFullScreen()) return lastWindowedBounds;
  const [x, y] = win.getPosition();
  const [width, height] = win.getSize();
  const bounds = { x, y, width, height, isFullScreen: false };
  lastWindowedBounds = bounds;
  return bounds;
}

function emitProjectionWindowChanged(immediate = false) {
  if (!vcWindow || vcWindow.isDestroyed() || !mainWindowRef || mainWindowRef.isDestroyed()) {
    return;
  }

  const send = () => {
    if (!vcWindow || vcWindow.isDestroyed() || !mainWindowRef || mainWindowRef.isDestroyed()) {
      return;
    }
    if (vcWindow.isFullScreen()) {
      const base = lastWindowedBounds ?? readWindowedBounds(vcWindow);
      if (!base) return;
      mainWindowRef.webContents.send('vc:projection-window-changed', {
        ...base,
        isFullScreen: true,
      });
      return;
    }
    const bounds = readWindowedBounds(vcWindow);
    if (!bounds) return;
    mainWindowRef.webContents.send('vc:projection-window-changed', bounds);
  };

  if (immediate) {
    if (projectionWindowReportTimer != null) {
      clearTimeout(projectionWindowReportTimer);
      projectionWindowReportTimer = null;
    }
    send();
    return;
  }

  if (projectionWindowReportTimer != null) {
    clearTimeout(projectionWindowReportTimer);
  }
  projectionWindowReportTimer = setTimeout(() => {
    projectionWindowReportTimer = null;
    send();
  }, PROJECTION_WINDOW_REPORT_DEBOUNCE_MS);
}

function attachProjectionWindowListeners(win) {
  win.on('resize', () => emitProjectionWindowChanged());
  win.on('move', () => emitProjectionWindowChanged());
  win.on('enter-full-screen', () => emitProjectionWindowChanged(true));
  win.on('leave-full-screen', () => emitProjectionWindowChanged(true));
  win.on('close', () => emitProjectionWindowChanged(true));
}

function applyProjectionWindow(bounds) {
  if (!vcWindow || vcWindow.isDestroyed() || !bounds) return;
  if (bounds.isFullScreen) {
    if (bounds.width && bounds.height) {
      lastWindowedBounds = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isFullScreen: false,
      };
    }
    vcWindow.setFullScreen(true);
    return;
  }
  if (vcWindow.isFullScreen()) {
    vcWindow.setFullScreen(false);
  }
  vcWindow.setBounds({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  });
  lastWindowedBounds = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    isFullScreen: false,
  };
}

function vcLoadTarget() {
  // Dev → Vite; packaged → loopback static server (http origin for YouTube).
  return require('./appServer').appDocUrl(
    '/vc-window/vc.html',
    require('electron').app.isPackaged,
  );
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

/** Forward Effects Lab performance pads from the main player onto the VC audio graph. */
function sendVcPerformanceEffect(payload) {
  return sendToVc('vc:performance-effect', payload);
}

function syncCommandWindowRefs() {
  commandService.setWindowRefs({
    mainWindow: mainWindowRef,
    vcWindow: vcWindow && !vcWindow.isDestroyed() ? vcWindow : null,
    controllerWindow: controllerWindow.getControllerWindow(),
  });
}

/** VC window reports mirrored playback state so main can defer speaker muting. */
function forwardVcPlaybackStatus(payload) {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('vc:playback-status', payload);
  }
}

function forwardVcTransport(payload) {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('vc:transport', payload);
  }
}

/** VC window layout edits — persist surface geometry in the main window. */
function forwardVcSurfacePatch(payload) {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('vc:surface-patch', payload);
  }
}

/** VC window finished layout mode — persist full surface geometry immediately. */
function forwardVcSurfaceCommit(payload) {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('vc:surface-commit', payload);
  }
}

function forwardVcVisualizerRotateRequest() {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('vc:visualizer-rotate-request');
  }
}

/** VC surface picked a new active visualizer — keep Butterchurn mirror in sync on main. */
function forwardVcActiveVisualizerReport(id) {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('vc:active-visualizer', id);
  }
}

/** Main player stepped visualizer — keep VC projection surface in sync. */
function forwardVcSyncActiveVisualizer(id) {
  sendToVc('vc:sync-active-visualizer', id);
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
 * @param {{ fullscreen?: boolean; projectionWindow?: Record<string, unknown> }} [options]
 */
function openVcWindow(mainWindow, options = {}) {
  mainWindowRef = mainWindow;

  const savedBounds = normalizeProjectionWindow(options.projectionWindow);

  if (vcWindow && !vcWindow.isDestroyed()) {
    if (savedBounds) {
      applyProjectionWindow(savedBounds);
    }
    vcWindow.focus();
    if (options.fullscreen) vcWindow.setFullScreen(true);
    return { ok: true };
  }

  const display = screen.getPrimaryDisplay();
  const { x, y, width, height } = display.bounds;

  const isPackaged = require('electron').app.isPackaged;
  const loadTarget = vcLoadTarget();

  vcWindow = new BrowserWindow({
    x: savedBounds?.x ?? x,
    y: savedBounds?.y ?? y,
    width: savedBounds?.width ?? width,
    height: savedBounds?.height ?? height,
    minWidth: VC_MIN_WIDTH,
    minHeight: VC_MIN_HEIGHT,
    title: 'Projector: VC Mode',
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
      // Mirrored playback must start without a click in this window (Discord/Twitch capture).
      autoplayPolicy: 'no-user-gesture-required',
    },
  });

  if (savedBounds && !savedBounds.isFullScreen) {
    lastWindowedBounds = {
      x: savedBounds.x,
      y: savedBounds.y,
      width: savedBounds.width,
      height: savedBounds.height,
      isFullScreen: false,
    };
  }

  attachProjectionWindowListeners(vcWindow);

  installTrustedNavigationPolicy(vcWindow, {
    role: 'vc',
    allowedDocumentUrl: resolveAllowedDocumentUrl(loadTarget, isPackaged),
    isPackaged,
  });

  vcWindow.on('closed', () => {
    vcWindow = null;
    commandService.setVcModeActive(false);
    controllerWindow.closeControllerWindow();
    syncCommandWindowRefs();
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.webContents.send('vc:closed');
    }
  });

  vcWindow.once('ready-to-show', () => {
    // macOS can reset bounds on first show — re-apply saved size before displaying.
    if (savedBounds) {
      applyProjectionWindow(savedBounds);
    }
    vcWindow.show();
    if (savedBounds?.isFullScreen || options.fullscreen) {
      vcWindow.setFullScreen(true);
    }
    commandService.setVcModeActive(true);
    syncCommandWindowRefs();
    commandService.registerActiveShortcuts();
    controllerWindow.openControllerWindow(mainWindowRef);
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.webContents.send('vc:opened');
    }
  });

  vcWindow.webContents.once('did-finish-load', () => {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.webContents.send('vc:request-sync');
    }
  });

  // loadTarget is always a URL now (http in both dev and packaged; file:// only
  // as a fallback), so loadURL handles every case.
  vcWindow.loadURL(loadTarget);

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

function getVcWindow() {
  return vcWindow && !vcWindow.isDestroyed() ? vcWindow : null;
}

function getMainWindowRef() {
  return mainWindowRef && !mainWindowRef.isDestroyed() ? mainWindowRef : null;
}

/**
 * Register the main listener window at app startup.
 *
 * Why: the projector (visualizer window) reports playback events — most
 * importantly `youtubeEnded` — back to the main window over the VC transport
 * channel (`forwardVcTransport`). That channel targets `mainWindowRef`, which
 * was previously only assigned inside `openVcWindow`. In the mini-player
 * YouTube-compliance flow the projector opens WITHOUT VC mode ever running, so
 * `mainWindowRef` stayed null and the projector's `youtubeEnded` was silently
 * dropped — the video stalled on its last frame and never advanced. Setting the
 * ref up front makes the projector→main transport reliable regardless of
 * whether VC mode has been opened.
 */
function setMainWindowRef(mainWindow) {
  mainWindowRef = mainWindow ?? null;
}

module.exports = {
  openVcWindow,
  closeVcWindow,
  setVcFullScreen,
  isVcWindowOpen,
  isVcFullScreen,
  getVcWindow,
  getMainWindowRef,
  setMainWindowRef,
  syncCommandWindowRefs,
  sendVcState,
  sendVcFrame,
  sendVcPerformanceEffect,
  hostGraphicUrlFromPath,
  forwardVcPlaybackStatus,
  forwardVcTransport,
  forwardVcSurfacePatch,
  forwardVcSurfaceCommit,
  forwardVcVisualizerRotateRequest,
  forwardVcActiveVisualizerReport,
  forwardVcSyncActiveVisualizer,
};
