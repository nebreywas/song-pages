/**
 * Electron main process entry point.
 *
 * Responsibilities: window lifecycle, OS integration, IPC, SQLite, and logging.
 * Business logic belongs in the renderer — keep this file small.
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');
const logger = require('./logger');
const database = require('./database');
const { registerIpcHandlers } = require('./ipc');

/** @type {BrowserWindow | null} */
let mainWindow = null;

const DEV_SERVER_URL = 'http://localhost:5173';

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 640,
    minHeight: 480,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (!app.isPackaged) {
    mainWindow.loadURL(DEV_SERVER_URL);
    logger.debug('Loading Vite dev server', { url: DEV_SERVER_URL });
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
    logger.info('Loading production build', { path: indexPath });
  }
}

app.whenReady().then(() => {
  logger.initLogger();
  database.initDatabase();
  registerIpcHandlers();

  // Development utilities are compiled in via conditional require so production
  // builds never register debug menus or developer shortcuts.
  if (!app.isPackaged) {
    const { installDevMenu } = require('./dev-menu');
    installDevMenu();
    logger.debug('Development menu installed');
  }

  createMainWindow();

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
