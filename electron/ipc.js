/**
 * IPC handlers — the only bridge between renderer requests and main-process
 * capabilities (dialogs, filesystem, SQLite, logging).
 */
const { app, dialog, ipcMain } = require('electron');
const fs = require('fs');
const database = require('./database');
const logger = require('./logger');

function registerIpcHandlers() {
  ipcMain.handle('app:getVersion', () => app.getVersion());

  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle('settings:get', (_event, key) => {
    return database.getSetting(key);
  });

  ipcMain.handle('settings:save', (_event, key, value) => {
    database.setSetting(key, value);
    logger.debug('Setting saved', { key });
    return true;
  });

  ipcMain.handle('logs:export', () => {
    const result = logger.exportLogs();
    logger.info('Log export requested', result);
    return result;
  });

  // Dev-only: read a bundled example page path for local navigation demos.
  ipcMain.handle('app:getExamplePageUrl', () => {
    if (!app.isPackaged) {
      return 'http://localhost:5173/example/index.html';
    }

    const path = require('path');
    const examplePath = path.join(__dirname, '..', 'dist', 'example', 'index.html');
    return `file://${examplePath}`;
  });
}

module.exports = { registerIpcHandlers };
