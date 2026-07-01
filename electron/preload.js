/**
 * Preload — exposes audited API to the renderer via contextBridge.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('app', {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  getSettings: (key) => ipcRenderer.invoke('settings:get', key),
  saveSettings: (key, value) => ipcRenderer.invoke('settings:save', key, value),
  exportLogs: () => ipcRenderer.invoke('logs:export'),
  onNavigate: (callback) => {
    const handler = (_event, mode) => callback(mode);
    ipcRenderer.on('app:navigate', handler);
    return () => ipcRenderer.removeListener('app:navigate', handler);
  },
  onOpenSettings: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('app:open-settings', handler);
    return () => ipcRenderer.removeListener('app:open-settings', handler);
  },

  listener: {
    listArtists: () => ipcRenderer.invoke('listener:listArtists'),
    listSongs: (artistId) => ipcRenderer.invoke('listener:listSongs', artistId),
    subscribe: (siteUrl) => ipcRenderer.invoke('listener:subscribe', siteUrl),
    refreshArtist: (artistId) => ipcRenderer.invoke('listener:refreshArtist', artistId),
    refreshAll: () => ipcRenderer.invoke('listener:refreshAll'),
    removeArtist: (artistId) => ipcRenderer.invoke('listener:removeArtist', artistId),
    ensureArtistManifest: (artistId) =>
      ipcRenderer.invoke('listener:ensureArtistManifest', artistId),
    fetchSongManifest: (url) => ipcRenderer.invoke('listener:fetchSongManifest', url),
    bindSongPageGuest: (guestWebContentsId, allowedPageUrl) =>
      ipcRenderer.invoke('listener:bindSongPageGuest', guestWebContentsId, allowedPageUrl),
    updateSongDuration: (songId, durationSeconds) =>
      ipcRenderer.invoke('listener:updateSongDuration', songId, durationSeconds),
    countLikedSongs: () => ipcRenderer.invoke('listener:countLikedSongs'),
    listLikedSongIds: () => ipcRenderer.invoke('listener:listLikedSongIds'),
    isSongLiked: (songId) => ipcRenderer.invoke('listener:isSongLiked', songId),
    toggleLikeSong: (songId) => ipcRenderer.invoke('listener:toggleLikeSong', songId),
    setLikedSongAvailability: (songId, unavailable) =>
      ipcRenderer.invoke('listener:setLikedSongAvailability', songId, unavailable),
    probeSongAvailability: (pageUrl, playbackUrl) =>
      ipcRenderer.invoke('listener:probeSongAvailability', pageUrl, playbackUrl),
    resolveSongAccess: (songId, source) =>
      ipcRenderer.invoke('listener:resolveSongAccess', songId, source),
    cacheStats: () => ipcRenderer.invoke('listener:cacheStats'),
    cacheEvents: (limit) => ipcRenderer.invoke('listener:cacheEvents', limit),
    cacheClearEvents: () => ipcRenderer.invoke('listener:cacheClearEvents'),
  },

  artist: {
    pickAudio: () => ipcRenderer.invoke('artist:pickAudio'),
    pickImage: () => ipcRenderer.invoke('artist:pickImage'),
    pickOutputFolder: () => ipcRenderer.invoke('artist:pickOutputFolder'),
    compile: (payload) => ipcRenderer.invoke('artist:compile', payload),
    openOutputFolder: (folderPath) => ipcRenderer.invoke('artist:openOutputFolder', folderPath),
    loadProjects: () => ipcRenderer.invoke('artist:loadProjects'),
    saveProjects: (state) => ipcRenderer.invoke('artist:saveProjects', state),
    loadDraft: () => ipcRenderer.invoke('artist:loadDraft'),
    saveDraft: (draft) => ipcRenderer.invoke('artist:saveDraft', draft),
    checkFfmpeg: () => ipcRenderer.invoke('artist:checkFfmpeg'),
    readMp3Bytes: (filePath) => ipcRenderer.invoke('artist:readMp3Bytes', filePath),
  },
});
