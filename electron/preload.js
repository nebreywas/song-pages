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
    resolveSongAccess: (songRef, source) =>
      ipcRenderer.invoke('listener:resolveSongAccess', songRef, source),
    countSunoDemoSongs: (playlistId) => ipcRenderer.invoke('listener:countSunoDemoSongs', playlistId),
    listSunoDemoPlaylists: () => ipcRenderer.invoke('listener:listSunoDemoPlaylists'),
    createSunoDemoPlaylist: () => ipcRenderer.invoke('listener:createSunoDemoPlaylist'),
    removeSunoDemoPlaylist: (playlistId) => ipcRenderer.invoke('listener:removeSunoDemoPlaylist', playlistId),
    renameSunoDemoPlaylist: (playlistId, name) =>
      ipcRenderer.invoke('listener:renameSunoDemoPlaylist', playlistId, name),
    listUserPlaylists: () => ipcRenderer.invoke('listener:listUserPlaylists'),
    createUserPlaylist: (name) => ipcRenderer.invoke('listener:createUserPlaylist', name),
    updateUserPlaylist: (playlistId, patch) =>
      ipcRenderer.invoke('listener:updateUserPlaylist', playlistId, patch),
    renameUserPlaylist: (playlistId, name) =>
      ipcRenderer.invoke('listener:renameUserPlaylist', playlistId, name),
    removeUserPlaylist: (playlistId) => ipcRenderer.invoke('listener:removeUserPlaylist', playlistId),
    addSongToUserPlaylist: (playlistId, song) =>
      ipcRenderer.invoke('listener:addSongToUserPlaylist', playlistId, song),
    addExternalSongToUserPlaylist: (playlistId, input) =>
      ipcRenderer.invoke('listener:addExternalSongToUserPlaylist', playlistId, input),
    addYoutubeSongToUserPlaylist: (playlistId, input) =>
      ipcRenderer.invoke('listener:addYoutubeSongToUserPlaylist', playlistId, input),
    addFlowSongToUserPlaylist: (playlistId, input) =>
      ipcRenderer.invoke('listener:addFlowSongToUserPlaylist', playlistId, input),
    addSoundcloudSongToUserPlaylist: (playlistId, input) =>
      ipcRenderer.invoke('listener:addSoundcloudSongToUserPlaylist', playlistId, input),
    moveSongToUserPlaylist: (payload) => ipcRenderer.invoke('listener:moveSongToUserPlaylist', payload),
    removeUserPlaylistSong: (songId) => ipcRenderer.invoke('listener:removeUserPlaylistSong', songId),
    addSunoDemoSong: (input, playlistId) => ipcRenderer.invoke('listener:addSunoDemoSong', input, playlistId),
    getPlaylistOrderState: (playlistKey, currentSongIds) =>
      ipcRenderer.invoke('listener:getPlaylistOrderState', playlistKey, currentSongIds),
    savePlaylistCustomOrder: (playlistKey, orderedSongIds) =>
      ipcRenderer.invoke('listener:savePlaylistCustomOrder', playlistKey, orderedSongIds),
    clearPlaylistCustomOrder: (playlistKey) =>
      ipcRenderer.invoke('listener:clearPlaylistCustomOrder', playlistKey),
    setCatalogSongSkipped: (artistId, externalId, skipped) =>
      ipcRenderer.invoke('listener:setCatalogSongSkipped', artistId, externalId, skipped),
    setUserPlaylistSongSkipped: (entryId, skipped) =>
      ipcRenderer.invoke('listener:setUserPlaylistSongSkipped', entryId, skipped),
    setLikedSongSkipped: (payload) => ipcRenderer.invoke('listener:setLikedSongSkipped', payload),
    removeLikedSong: (payload) => ipcRenderer.invoke('listener:removeLikedSong', payload),
    removeSunoDemoSong: (songId) => ipcRenderer.invoke('listener:removeSunoDemoSong', songId),
    cacheStats: () => ipcRenderer.invoke('listener:cacheStats'),
    cacheEvents: (limit) => ipcRenderer.invoke('listener:cacheEvents', limit),
    cacheClearEvents: () => ipcRenderer.invoke('listener:cacheClearEvents'),
    cacheClearAll: () => ipcRenderer.invoke('listener:cacheClearAll'),
    onPlaybackCommand: (callback) => {
      const handler = (_event, payload) => callback(payload);
      ipcRenderer.on('listener:playback-command', handler);
      return () => ipcRenderer.removeListener('listener:playback-command', handler);
    },
    onSubmissionPlaylistUpdated: (callback) => {
      const handler = (_event, playlistId) => callback(playlistId);
      ipcRenderer.on('listener:submission-playlist-updated', handler);
      return () => ipcRenderer.removeListener('listener:submission-playlist-updated', handler);
    },
    setChromeMinified: (payload) => ipcRenderer.invoke('listener:setChromeMinified', payload),
    recordSongHistoryStart: (input) => ipcRenderer.invoke('listener:recordSongHistoryStart', input),
    updateSongHistoryEntry: (entryId, patch) =>
      ipcRenderer.invoke('listener:updateSongHistoryEntry', entryId, patch),
    listSongHistory: (limit) => ipcRenderer.invoke('listener:listSongHistory', limit),
    clearSongHistory: () => ipcRenderer.invoke('listener:clearSongHistory'),
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

  visualizer: {
    open: (options) => ipcRenderer.invoke('visualizer:open', options),
    close: () => ipcRenderer.invoke('visualizer:close'),
    setFullScreen: (fullscreen) => ipcRenderer.invoke('visualizer:setFullScreen', fullscreen),
    status: () => ipcRenderer.invoke('visualizer:status'),
    listDisplays: () => ipcRenderer.invoke('visualizer:listDisplays'),
    sendConfig: (payload) => ipcRenderer.send('visualizer:sendConfig', payload),
    sendFrame: (payload) => ipcRenderer.send('visualizer:sendFrame', payload),
    onConfig: (callback) => {
      const handler = (_event, payload) => callback(payload);
      ipcRenderer.on('visualizer:config', handler);
      return () => ipcRenderer.removeListener('visualizer:config', handler);
    },
    onFrame: (callback) => {
      const handler = (_event, payload) => callback(payload);
      ipcRenderer.on('visualizer:frame', handler);
      return () => ipcRenderer.removeListener('visualizer:frame', handler);
    },
    onOpened: (callback) => {
      const handler = () => callback();
      ipcRenderer.on('visualizer:opened', handler);
      return () => ipcRenderer.removeListener('visualizer:opened', handler);
    },
    onClosed: (callback) => {
      const handler = () => callback();
      ipcRenderer.on('visualizer:closed', handler);
      return () => ipcRenderer.removeListener('visualizer:closed', handler);
    },
    onFullScreenChanged: (callback) => {
      const handler = (_event, fullscreen) => callback(fullscreen);
      ipcRenderer.on('visualizer:fullscreen-changed', handler);
      return () => ipcRenderer.removeListener('visualizer:fullscreen-changed', handler);
    },
    onRequestSync: (callback) => {
      const handler = () => callback();
      ipcRenderer.on('visualizer:request-sync', handler);
      return () => ipcRenderer.removeListener('visualizer:request-sync', handler);
    },
  },

  vc: {
    open: (options) => ipcRenderer.invoke('vc:open', options),
    close: () => ipcRenderer.invoke('vc:close'),
    setFullScreen: (fullscreen) => ipcRenderer.invoke('vc:setFullScreen', fullscreen),
    status: () => ipcRenderer.invoke('vc:status'),
    sendState: (payload) => ipcRenderer.send('vc:sendState', payload),
    sendFrame: (payload) => ipcRenderer.send('vc:sendFrame', payload),
    sendPlaybackStatus: (payload) => ipcRenderer.send('vc:sendPlaybackStatus', payload),
    sendTransport: (payload) => ipcRenderer.send('vc:sendTransport', payload),
    updateSurface: (patch) => ipcRenderer.send('vc:updateSurface', patch),
    commitSurface: (surface) => ipcRenderer.send('vc:commitSurface', surface),
    requestVisualizerRotate: () => ipcRenderer.send('vc:requestVisualizerRotate'),
    reportActiveVisualizer: (id) => ipcRenderer.send('vc:reportActiveVisualizer', id),
    syncActiveVisualizer: (id) => ipcRenderer.send('vc:syncActiveVisualizer', id),
    switchSurface: (designId) => ipcRenderer.send('vc:switchSurface', designId),
    togglePlayLock: () => ipcRenderer.send('vc:togglePlayLock'),
    togglePlayLockReleaseOnNext: () => ipcRenderer.send('vc:togglePlayLockReleaseOnNext'),
    setPlayLockReleaseOnNext: (enabled) => ipcRenderer.send('vc:setPlayLockReleaseOnNext', enabled === true),
    notifySubmissionPlaylistUpdated: (playlistId) =>
      ipcRenderer.send('vc:notifySubmissionPlaylistUpdated', playlistId),
    onState: (callback) => {
      const handler = (_event, payload) => callback(payload);
      ipcRenderer.on('vc:state', handler);
      return () => ipcRenderer.removeListener('vc:state', handler);
    },
    onFrame: (callback) => {
      const handler = (_event, payload) => callback(payload);
      ipcRenderer.on('vc:frame', handler);
      return () => ipcRenderer.removeListener('vc:frame', handler);
    },
    onHotkey: (callback) => {
      const handler = (_event, payload) => callback(payload);
      ipcRenderer.on('vc:hotkey', handler);
      return () => ipcRenderer.removeListener('vc:hotkey', handler);
    },
    onOpened: (callback) => {
      const handler = () => callback();
      ipcRenderer.on('vc:opened', handler);
      return () => ipcRenderer.removeListener('vc:opened', handler);
    },
    onClosed: (callback) => {
      const handler = () => callback();
      ipcRenderer.on('vc:closed', handler);
      return () => ipcRenderer.removeListener('vc:closed', handler);
    },
    onRequestSync: (callback) => {
      const handler = () => callback();
      ipcRenderer.on('vc:request-sync', handler);
      return () => ipcRenderer.removeListener('vc:request-sync', handler);
    },
    onPlaybackStatus: (callback) => {
      const handler = (_event, payload) => callback(payload);
      ipcRenderer.on('vc:playback-status', handler);
      return () => ipcRenderer.removeListener('vc:playback-status', handler);
    },
    onTransport: (callback) => {
      const handler = (_event, payload) => callback(payload);
      ipcRenderer.on('vc:transport', handler);
      return () => ipcRenderer.removeListener('vc:transport', handler);
    },
    onSurfacePatch: (callback) => {
      const handler = (_event, payload) => callback(payload);
      ipcRenderer.on('vc:surface-patch', handler);
      return () => ipcRenderer.removeListener('vc:surface-patch', handler);
    },
    onSurfaceCommit: (callback) => {
      const handler = (_event, payload) => callback(payload);
      ipcRenderer.on('vc:surface-commit', handler);
      return () => ipcRenderer.removeListener('vc:surface-commit', handler);
    },
    onProjectionWindowChanged: (callback) => {
      const handler = (_event, payload) => callback(payload);
      ipcRenderer.on('vc:projection-window-changed', handler);
      return () => ipcRenderer.removeListener('vc:projection-window-changed', handler);
    },
    onVisualizerRotateRequest: (callback) => {
      const handler = () => callback();
      ipcRenderer.on('vc:visualizer-rotate-request', handler);
      return () => ipcRenderer.removeListener('vc:visualizer-rotate-request', handler);
    },
    onActiveVisualizerReport: (callback) => {
      const handler = (_event, id) => callback(id);
      ipcRenderer.on('vc:active-visualizer', handler);
      return () => ipcRenderer.removeListener('vc:active-visualizer', handler);
    },
    onSyncActiveVisualizer: (callback) => {
      const handler = (_event, id) => callback(id);
      ipcRenderer.on('vc:sync-active-visualizer', handler);
      return () => ipcRenderer.removeListener('vc:sync-active-visualizer', handler);
    },
    onSwitchSurface: (callback) => {
      const handler = (_event, designId) => callback(designId);
      ipcRenderer.on('vc:switch-surface', handler);
      return () => ipcRenderer.removeListener('vc:switch-surface', handler);
    },
    onTogglePlayLock: (callback) => {
      const handler = () => callback();
      ipcRenderer.on('vc:toggle-play-lock', handler);
      return () => ipcRenderer.removeListener('vc:toggle-play-lock', handler);
    },
    onTogglePlayLockReleaseOnNext: (callback) => {
      const handler = () => callback();
      ipcRenderer.on('vc:toggle-play-lock-release-on-next', handler);
      return () => ipcRenderer.removeListener('vc:toggle-play-lock-release-on-next', handler);
    },
    onSetPlayLockReleaseOnNext: (callback) => {
      const handler = (_event, enabled) => callback(enabled === true);
      ipcRenderer.on('vc:set-play-lock-release-on-next', handler);
      return () => ipcRenderer.removeListener('vc:set-play-lock-release-on-next', handler);
    },
  },

  hostContent: {
    pickAndImportMedia: (payload) => ipcRenderer.invoke('hostContent:pickAndImportMedia', payload),
    resolveMediaUrl: (relativePath) => ipcRenderer.invoke('hostContent:resolveMediaUrl', relativePath),
    deleteMedia: (relativePath) => ipcRenderer.invoke('hostContent:deleteMedia', relativePath),
  },

  commands: {
    getState: () => ipcRenderer.invoke('commands:getState'),
    saveState: (state) => ipcRenderer.invoke('commands:saveState', state),
    dispatch: (invocation) => ipcRenderer.invoke('commands:dispatch', invocation),
    sendGatedKey: (key) => ipcRenderer.invoke('commands:gatedKey', key),
    onMappingState: (callback) => {
      const handler = (_event, payload) => callback(payload);
      ipcRenderer.on('commands:mapping-state', handler);
      return () => ipcRenderer.removeListener('commands:mapping-state', handler);
    },
    onGateState: (callback) => {
      const handler = (_event, payload) => callback(payload);
      ipcRenderer.on('commands:gate-state', handler);
      return () => ipcRenderer.removeListener('commands:gate-state', handler);
    },
    onGateEvent: (callback) => {
      const handler = (_event, payload) => callback(payload);
      ipcRenderer.on('commands:gate-event', handler);
      return () => ipcRenderer.removeListener('commands:gate-event', handler);
    },
    onInvoke: (callback) => {
      const handler = (_event, payload) => callback(payload);
      ipcRenderer.on('command:invoke', handler);
      return () => ipcRenderer.removeListener('command:invoke', handler);
    },
    setRuntimeContext: (context) => ipcRenderer.send('commands:setRuntimeContext', context),
    getRuntimeContext: () => ipcRenderer.invoke('commands:getRuntimeContext'),
    onRuntimeContext: (callback) => {
      const handler = (_event, payload) => callback(payload);
      ipcRenderer.on('commands:runtime-context', handler);
      return () => ipcRenderer.removeListener('commands:runtime-context', handler);
    },
    onRegistrationStatus: (callback) => {
      const handler = (_event, payload) => callback(payload);
      ipcRenderer.on('commands:registration-status', handler);
      return () => ipcRenderer.removeListener('commands:registration-status', handler);
    },
  },

  controller: {
    open: () => ipcRenderer.invoke('controller:open'),
    close: () => ipcRenderer.invoke('controller:close'),
    status: () => ipcRenderer.invoke('controller:status'),
    setAlwaysOnTop: (enabled) => ipcRenderer.invoke('controller:setAlwaysOnTop', enabled),
  },
});
