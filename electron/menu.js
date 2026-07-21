/**
 * Application menu — Listener, Artist, Developer, Pretty Lyrics Lab,
 * Web Voice Demo, About modes.
 */
const { app, BrowserWindow, Menu, shell, clipboard, dialog } = require('electron');
const path = require('path');
const { showAboutPanel } = require('./aboutPanel');
const logger = require('./logger');
const { appServerOrigin } = require('./appServer');

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

/** Absolute path to the rolling log directory. */
function logsDir() {
  return path.join(app.getPath('userData'), 'logs');
}

/**
 * Human-readable environment snapshot for support/debugging. Includes the
 * packaged app server origin so we can confirm the http(s) origin YouTube sees.
 */
function gatherDebugInfo() {
  const lines = [
    `App: ${app.name} ${app.getVersion()}`,
    `Packaged: ${app.isPackaged}`,
    `App server origin: ${appServerOrigin() ?? '(file:// — server not running)'}`,
    `Platform: ${process.platform} ${process.arch}`,
    `Electron: ${process.versions.electron}`,
    `Chrome: ${process.versions.chrome}`,
    `Node: ${process.versions.node}`,
    `userData: ${app.getPath('userData')}`,
    `Logs: ${logsDir()}`,
  ];
  return lines.join('\n');
}

/** Copy the debug snapshot to the clipboard and confirm via a small dialog. */
function copyDebugInfo() {
  const info = gatherDebugInfo();
  clipboard.writeText(info);
  logger.info('Debug info copied to clipboard');
  void dialog.showMessageBox({
    type: 'info',
    title: 'Debug Info Copied',
    message: 'Environment details copied to the clipboard.',
    detail: info,
    buttons: ['OK'],
  });
}

/** Bundle recent logs into one file and reveal it in the OS file manager. */
function exportLogsFromMenu() {
  const result = logger.exportLogs();
  if (result.ok) {
    shell.showItemInFolder(result.path);
  } else {
    void dialog.showMessageBox({
      type: 'error',
      title: 'Export Logs Failed',
      message: result.error ?? 'Unknown error',
      buttons: ['OK'],
    });
  }
}

/**
 * Diagnostics submenu — available in ALL builds (packaged included) so a
 * shipped app can still open DevTools, reach its logs, and report its
 * environment. Dev builds get the richer Debug menu too (reload, audio panel).
 */
function diagnosticsSubmenu(isDev) {
  const isMac = process.platform === 'darwin';
  return {
    label: 'Diagnostics',
    submenu: [
      {
        label: 'Toggle Developer Tools',
        // Avoid clashing with the dev-only Debug menu's identical accelerator.
        accelerator: isDev ? undefined : isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
        click: (_item, focusedWindow) => focusedWindow?.webContents.toggleDevTools(),
      },
      { type: 'separator' },
      { label: 'Open Logs Folder', click: () => shell.openPath(logsDir()) },
      { label: 'Export Logs…', click: () => exportLogsFromMenu() },
      { label: 'Copy Debug Info', click: () => copyDebugInfo() },
    ],
  };
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
        label: 'Web Voice Demo',
        accelerator: 'CmdOrCtrl+5',
        click: () => sendNavigate('web-voice'),
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
          click: () => shell.openPath(path.join(app.getPath('userData'), 'database')),
        },
      ],
    });
  }

  template.push(diagnosticsSubmenu(isDev));

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
