/**
 * Application menu — Listener, Artist, Developer, Pretty Lyrics Lab, About modes.
 */
const { app, BrowserWindow, Menu, shell } = require('electron');
const { showAboutPanel } = require('./aboutPanel');

/** @type {import('electron').BrowserWindow | null} */
let mainWindowRef = null;

function sendNavigate(mode) {
  const win = BrowserWindow.getFocusedWindow() || mainWindowRef;
  if (win && !win.isDestroyed()) {
    win.webContents.send('app:navigate', mode);
  }
}

function sendOpenSettings() {
  const win = BrowserWindow.getFocusedWindow() || mainWindowRef;
  if (win && !win.isDestroyed()) {
    win.webContents.send('app:open-settings');
  }
}

/** Reopen VC Controller if the host closed it while VC Mode (or keybinding setup) is active. */
function showVcControllerWindow() {
  if (!mainWindowRef || mainWindowRef.isDestroyed()) return;
  const { openControllerWindow } = require('./controllerWindow');
  openControllerWindow(mainWindowRef);
}

function buildAppMenu(isDev) {
  const isMac = process.platform === 'darwin';

  /** @type {import('electron').MenuItemConstructorOptions[]} */
  const template = [];

  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        {
          label: `About ${app.name}`,
          click: () => showAboutPanel(mainWindowRef),
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }

  template.push({
    label: 'Song Pages',
    submenu: [
      {
        label: 'Listener',
        accelerator: 'CmdOrCtrl+1',
        click: () => sendNavigate('listener'),
      },
      {
        label: 'Artist',
        accelerator: 'CmdOrCtrl+2',
        click: () => sendNavigate('artist'),
      },
      {
        label: 'Artist 2.0',
        accelerator: 'CmdOrCtrl+Shift+2',
        click: () => sendNavigate('artist2'),
      },
      {
        label: 'Developer',
        accelerator: 'CmdOrCtrl+3',
        click: () => sendNavigate('developer'),
      },
      {
        label: 'Pretty Lyrics Lab',
        accelerator: 'CmdOrCtrl+4',
        click: () => sendNavigate('pretty-lyrics'),
      },
      {
        label: 'About',
        click: () => sendNavigate('about'),
      },
      { type: 'separator' },
      {
        label: 'Settings…',
        accelerator: 'CmdOrCtrl+,',
        click: () => sendOpenSettings(),
      },
      { type: 'separator' },
      {
        label: 'Show VC Controller',
        click: () => showVcControllerWindow(),
      },
    ],
  });

  if (isDev) {
    template.push({
      label: 'Debug',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: (_item, focusedWindow) => focusedWindow?.reload(),
        },
        {
          label: 'Force Reload (ignore cache)',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: (_item, focusedWindow) => focusedWindow?.webContents.reloadIgnoringCache(),
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: (_item, focusedWindow) => focusedWindow?.webContents.toggleDevTools(),
        },
        { type: 'separator' },
        {
          label: 'Toggle Audio Debug Panel',
          accelerator: 'Alt+Command+A',
          click: (_item, focusedWindow) => {
            focusedWindow?.webContents.executeJavaScript(
              `window.dispatchEvent(new Event('songpages-audio-debug-toggle'));`,
            );
          },
        },
        {
          label: 'Open User Data Folder',
          click: () => shell.openPath(app.getPath('userData')),
        },
        {
          label: 'Open SQLite Folder',
          click: () => {
            const path = require('path');
            shell.openPath(path.join(app.getPath('userData'), 'database'));
          },
        },
      ],
    });
  }

  template.push({
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
    ],
  });

  template.push({
    label: 'Window',
    submenu: [{ role: 'minimize' }, { role: 'close' }],
  });

  return Menu.buildFromTemplate(template);
}

function installAppMenu(mainWindow, isDev) {
  mainWindowRef = mainWindow;
  const menu = buildAppMenu(isDev);
  Menu.setApplicationMenu(menu);
}

module.exports = { installAppMenu, sendNavigate };
