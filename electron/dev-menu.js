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
          label: 'Toggle Audio Debug Panel',
          accelerator: process.platform === 'darwin' ? 'Cmd+Ctrl+Alt+A' : 'Ctrl+Alt+A',
          click: (_item, focusedWindow) => {
            if (!focusedWindow) return;
            focusedWindow.webContents.executeJavaScript(`
              localStorage.setItem('songpages:audio-debug-panel', '1');
              localStorage.setItem('songpages:audio-debug', '1');
              window.dispatchEvent(new Event('songpages-audio-debug-changed'));
            `);
          },
        },
        {
          label: 'Toggle Effects Lab Panel',
          accelerator: process.platform === 'darwin' ? 'Cmd+Ctrl+Alt+E' : 'Ctrl+Alt+E',
          click: (_item, focusedWindow) => {
            if (!focusedWindow) return;
            focusedWindow.webContents.executeJavaScript(`
              localStorage.setItem('songpages:effects-lab-panel', '1');
              window.dispatchEvent(new Event('songpages-effects-lab-changed'));
            `);
          },
        },
        {
          label: 'Toggle Meyda Lab Panel',
          accelerator: process.platform === 'darwin' ? 'Cmd+Ctrl+Alt+M' : 'Ctrl+Alt+M',
          click: (_item, focusedWindow) => {
            if (!focusedWindow) return;
            focusedWindow.webContents.executeJavaScript(`
              (function () {
                var key = 'songpages:meyda-lab-panel';
                var next = localStorage.getItem(key) === '1' ? '0' : '1';
                localStorage.setItem(key, next);
                window.dispatchEvent(new Event('songpages-meyda-lab-changed'));
              })();
            `);
          },
        },
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
