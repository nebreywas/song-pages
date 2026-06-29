/**
 * Development-only menu utilities.
 *
 * These helpers are imported only when the app is not packaged so production
 * builds never ship debug menus or developer shortcuts.
 */
const { app, BrowserWindow, Menu, shell } = require('electron');

function installDevMenu() {
  const template = [
    {
      label: 'Debug',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.reload();
            }
          },
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.reloadIgnoringCache();
            }
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.toggleDevTools();
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Open User Data Folder',
          click: () => {
            shell.openPath(app.getPath('userData'));
          },
        },
        {
          label: 'Open SQLite Folder',
          click: () => {
            const path = require('path');
            shell.openPath(path.join(app.getPath('userData'), 'database'));
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

module.exports = { installDevMenu };
