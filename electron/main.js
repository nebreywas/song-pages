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

registerCacheScheme();

/** @type {BrowserWindow | null} */
let mainWindow = null;

const DEV_SERVER_URL = 'http://localhost:5173';

function createMainWindow() {
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
      // Allow hls.js to fetch .m3u8/.ts from artist CDNs (no CORS headers on static hosts).
      webSecurity: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  installAppMenu(mainWindow, !app.isPackaged);

  if (!app.isPackaged) {
    mainWindow.loadURL(DEV_SERVER_URL);
    logger.debug('Loading Vite dev server', { url: DEV_SERVER_URL });
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
    logger.info('Loading production build', { path: indexPath });
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
