/**
 * Preload script — exposes a minimal, audited API to the renderer.
 *
 * Never expose Node.js or ipcRenderer directly. The renderer is treated as
 * an untrusted environment; all native access flows through these methods.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('app', {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  getSettings: (key) => ipcRenderer.invoke('settings:get', key),
  saveSettings: (key, value) => ipcRenderer.invoke('settings:save', key, value),
  exportLogs: () => ipcRenderer.invoke('logs:export'),
  getExamplePageUrl: () => ipcRenderer.invoke('app:getExamplePageUrl'),
});
