/**
 * Electron main process — window lifecycle, menu, IPC, SQLite, logging.
 * @see documentation/README.md — project index for agents and contributors
 */
const { app, BrowserWindow, nativeImage } = require('electron');
const path = require('path');
const pkg = require('../package.json');
const logger = require('./logger');
const database = require('./database');
const { registerIpcHandlers } = require('./ipc');
const { installAppMenu } = require('./menu');
const listenerSubscribe = require('./listener/subscribe');
const { configureSongPageGuestSession } = require('./listener/guestSession');
const { registerCacheScheme, registerCacheProtocol } = require('./listener/cache/protocol');
const { devServerOrigin, devServerUrl } = require('./devServer');
const { startAppServer, appDocUrl } = require('./appServer');
const {
  installTrustedNavigationPolicy,
  resolveAllowedDocumentUrl,
} = require('./trustedWindowNavigation');

registerCacheScheme();

/**
 * macOS Discord/OBS window capture only receives audio from the window owner's PID.
 * Chromium normally plays HTML media in a separate sandboxed "Audio Service" process,
 * so per-window share gets video but silence. Keep audio in the browser process.
 * @see https://issues.chromium.org/issues/40273019 (application audio + OOP audio)
 */
if (process.platform === 'darwin') {
  app.commandLine.appendSwitch('disable-features', 'AudioServiceOutOfProcess');
}

/** App icon — Dock, About panel (win/linux), and window icon. */
const APP_ICON_PATH = path.resolve(__dirname, '..', 'images', 'app-icon.png');

/** Display name for menu bar / Dock — does not control the data folder when userData is pinned below. */
app.setName('Song Pages');

/** macOS About text — native panel icon is bundle-bound; use electron/aboutPanel.js on macOS. */
function configureAboutPanel() {
  if (process.platform !== 'darwin' && process.platform !== 'win32' && process.platform !== 'linux') {
    return;
  }
  const options = {
    applicationName: 'Song Pages',
    applicationVersion: pkg.version,
    version: pkg.version,
    copyright: 'Song Pages © Ben Sawyer, 2026.',
  };
  if (process.platform === 'win32' || process.platform === 'linux') {
    options.iconPath = APP_ICON_PATH;
  }
  app.setAboutPanelOptions(options);
}

/** NSApplication icon — drives Dock and the native About panel graphic on macOS. */
function applyMacAppIcon() {
  if (process.platform !== 'darwin') return;
  const logo = nativeImage.createFromPath(APP_ICON_PATH);
  if (logo.isEmpty()) {
    logger.warn('macOS app icon missing', { path: APP_ICON_PATH });
    return;
  }
  if (app.dock) {
    app.dock.setIcon(logo);
  }
}

configureAboutPanel();

/**
 * Pin userData to a stable folder name. Without this, `app.setName()` or product renames
 * create a fresh ~/Library/Application Support/<name>/ tree (empty DB, lost subscriptions).
 */
app.setPath('userData', path.join(app.getPath('appData'), 'song-pages'));

/** @type {BrowserWindow | null} */
let mainWindow = null;

const DEV_SERVER_URL = devServerOrigin();

/** Load Vite dev server — bust Electron's aggressive localhost HTTP cache. */
async function loadDevServer(mainWindow) {
  const ses = mainWindow.webContents.session;
  await ses.clearCache();
  await ses.clearStorageData({ storages: ['cachestorage'] });
  const url = `${devServerUrl('/')}?dev=${Date.now()}`;
  await mainWindow.loadURL(url);
  mainWindow.setTitle('Song Pages (Dev)');
  logger.debug('Loading Vite dev server', { url: DEV_SERVER_URL, isPackaged: app.isPackaged });
}

function createMainWindow() {
  const isPackaged = app.isPackaged;
  // Packaged: loopback static server URL (real http origin for YouTube embeds).
  // Dev: Vite dev server (loaded via loadDevServer below).
  const mainLoadTarget = isPackaged ? appDocUrl('/index.html', true) : devServerUrl('/');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Song Pages',
    ...(process.platform === 'darwin' ? { icon: APP_ICON_PATH } : {}),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      // webview guests do not render when sandbox is enabled on the parent window.
      sandbox: false,
      nodeIntegration: false,
      webviewTag: true,
      // Keep playback + visualizer FFT polling running when projection window has focus.
      backgroundThrottling: false,
      // Allow hls.js to fetch .m3u8/.ts from artist CDNs (no CORS headers on static hosts).
      webSecurity: false,
    },
  });

  installTrustedNavigationPolicy(mainWindow, {
    role: 'main',
    allowedDocumentUrl: resolveAllowedDocumentUrl(mainLoadTarget, isPackaged),
    isPackaged,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    require('./commands/commandService').setWindowRefs({
      mainWindow,
      vcWindow: null,
      controllerWindow: null,
    });
    // Register the main window for VC transport forwarding up front so the
    // projector (visualizer window) can report events like `youtubeEnded` back
    // to main even when VC mode was never opened (e.g. mini-player compliance).
    require('./vcWindow').setMainWindowRef(mainWindow);
  });

  mainWindow.on('closed', () => {
    require('./vcWindow').setMainWindowRef(null);
    mainWindow = null;
  });

  installAppMenu(mainWindow, !app.isPackaged);

  if (!isPackaged) {
    void loadDevServer(mainWindow);
  } else {
    // loadURL over the loopback static server; file:// fallback is baked into
    // mainLoadTarget by appDocUrl if the server failed to start.
    void mainWindow.loadURL(mainLoadTarget);
    logger.info('Loading production build', { url: mainLoadTarget });
  }
}

async function refreshArtistsOnLaunch() {
  try {
    const results = await listenerSubscribe.refreshStaleArtistsOnLaunch();
    const refreshed = results.filter((r) => r.ok).length;
    if (refreshed > 0) {
      logger.info('Launch catalog refresh completed', { refreshed, total: results.length });
    }
  } catch (error) {
    logger.warn('Launch catalog refresh skipped', { error: String(error) });
  }
}

app.whenReady().then(async () => {
  applyMacAppIcon();
  logger.initLogger();
  registerCacheProtocol();
  configureSongPageGuestSession();
  database.initDatabase();
  const cacheManager = require('./listener/cacheManager');
  void cacheManager.purgeStaleCacheEntriesOnLaunch();
  require('./commands/commandService').initCommandService();
  registerIpcHandlers();

  // Packaged builds serve the renderer over http://127.0.0.1 so YouTube embeds
  // get a valid web origin. Start it before any window loads; on failure we log
  // and fall back to file:// (YouTube may error, but the app still opens).
  if (app.isPackaged) {
    try {
      await startAppServer();
    } catch (error) {
      logger.error('Falling back to file:// — app static server unavailable', {
        error: String(error),
      });
    }
  }

  createMainWindow();

  // Refresh subscribed catalogs older than the auto-refresh window (30 days).
  void refreshArtistsOnLaunch();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  database.closeDatabase();
});
