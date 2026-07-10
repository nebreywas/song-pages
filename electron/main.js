/**
 * Electron main process — window lifecycle, menu, IPC, SQLite, logging.
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');
const logger = require('./logger');
const database = require('./database');
const { registerIpcHandlers } = require('./ipc');
const { installAppMenu } = require('./menu');
const listenerSubscribe = require('./listener/subscribe');
const { configureSongPageGuestSession } = require('./listener/guestSession');
const { registerCacheScheme, registerCacheProtocol } = require('./listener/cache/protocol');
const { devServerOrigin, devServerUrl } = require('./devServer');
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

/** Display name for menu bar / Dock — does not control the data folder when userData is pinned below. */
app.setName('Song Pages');

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
  const productionIndexPath = path.join(__dirname, '..', 'dist', 'index.html');
  const mainLoadTarget = isPackaged ? productionIndexPath : devServerUrl('/');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Song Pages',
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
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  installAppMenu(mainWindow, !app.isPackaged);

  if (!isPackaged) {
    void loadDevServer(mainWindow);
  } else {
    mainWindow.loadFile(productionIndexPath);
    logger.info('Loading production build', { path: productionIndexPath });
  }
}

async function refreshArtistsOnLaunch() {
  try {
    const results = await listenerSubscribe.refreshAllArtists();
    const refreshed = results.filter((r) => r.ok).length;
    if (refreshed > 0) {
      logger.info('Launch refresh completed', { refreshed, total: results.length });
    }
  } catch (error) {
    logger.warn('Launch refresh skipped', { error: String(error) });
  }
}

app.whenReady().then(async () => {
  logger.initLogger();
  registerCacheProtocol();
  configureSongPageGuestSession();
  database.initDatabase();
  const cacheManager = require('./listener/cacheManager');
  void cacheManager.purgeStaleCacheEntriesOnLaunch();
  require('./commands/commandService').initCommandService();
  registerIpcHandlers();
  createMainWindow();

  // Optional: refresh subscribed artists on launch when simple to do so.
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
