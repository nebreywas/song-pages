/**
 * IPC handlers — bridge between renderer and main-process capabilities.
 */
const { app, dialog, ipcMain, shell, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const database = require('./database');
const logger = require('./logger');
const listenerLibrary = require('./listener/library');
const listenerSubscribe = require('./listener/subscribe');
const { bindSongPageGuestById } = require('./listener/guestSecurity');
const visualizerWindow = require('./visualizerWindow');
const vcWindow = require('./vcWindow');
const { registerHostContentIpc } = require('./hostContent');

function registerIpcHandlers() {
  registerHostContentIpc(ipcMain);
  ipcMain.handle('app:getVersion', () => app.getVersion());

  ipcMain.handle('app:openExternal', (_event, url) => {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
      return { ok: false, error: 'Invalid URL.' };
    }
    void shell.openExternal(url.trim());
    return { ok: true };
  });

  ipcMain.handle('dialog:openFile', async (_event, options = {}) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      ...options,
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle('settings:get', (_event, key) => database.getSetting(key));

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

  // --- Listener Mode ---

  ipcMain.handle('listener:listArtists', () => listenerLibrary.listArtists());

  ipcMain.handle('listener:listSongs', (_event, artistId) => {
    const likedSongs = require('./listener/likedSongs');
    if (artistId === 0) {
      return likedSongs.listLikedSongs();
    }
    if (artistId) {
      return listenerLibrary.listSongsForArtist(artistId);
    }
    return listenerLibrary.listAllSongs();
  });

  ipcMain.handle('listener:countLikedSongs', () => {
    const likedSongs = require('./listener/likedSongs');
    return likedSongs.countLikedSongs();
  });

  ipcMain.handle('listener:listLikedSongIds', () => {
    const likedSongs = require('./listener/likedSongs');
    return likedSongs.listLikedSongIds();
  });

  ipcMain.handle('listener:isSongLiked', (_event, songId) => {
    const likedSongs = require('./listener/likedSongs');
    return likedSongs.isSongLiked(songId);
  });

  ipcMain.handle('listener:toggleLikeSong', (_event, songId) => {
    try {
      const likedSongs = require('./listener/likedSongs');
      return { ok: true, data: likedSongs.toggleLikeSong(songId) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: message };
    }
  });

  ipcMain.handle('listener:setLikedSongAvailability', (_event, songId, unavailable) => {
    const likedSongs = require('./listener/likedSongs');
    return likedSongs.setLikedSongAvailability(songId, unavailable);
  });

  ipcMain.handle('listener:probeSongAvailability', async (_event, pageUrl, playbackUrl) => {
    try {
      const { probeSongAvailability } = require('./listener/songAvailability');
      const result = await probeSongAvailability(pageUrl, playbackUrl);
      return { ok: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: message };
    }
  });

  ipcMain.handle('listener:resolveSongAccess', async (_event, songId, source) => {
    try {
      const cacheManager = require('./listener/cacheManager');
      return await cacheManager.resolveSongAccess(songId, source);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: message };
    }
  });

  ipcMain.handle('listener:cacheStats', () => {
    try {
      const cacheManager = require('./listener/cacheManager');
      return { ok: true, data: cacheManager.getCacheStats() };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: message };
    }
  });

  ipcMain.handle('listener:cacheEvents', (_event, limit) => {
    try {
      const cacheManager = require('./listener/cacheManager');
      return { ok: true, data: cacheManager.getCacheEvents(limit) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: message };
    }
  });

  ipcMain.handle('listener:cacheClearEvents', () => {
    try {
      const cacheManager = require('./listener/cacheManager');
      cacheManager.clearCacheEvents();
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: message };
    }
  });

  ipcMain.handle('listener:subscribe', async (_event, siteUrl) => {
    try {
      return { ok: true, data: await listenerSubscribe.subscribeArtist(siteUrl) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Subscribe failed', { siteUrl, error: message });
      return { ok: false, error: message };
    }
  });

  ipcMain.handle('listener:refreshArtist', async (_event, artistId) => {
    try {
      return { ok: true, data: await listenerSubscribe.refreshArtist(artistId) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: message };
    }
  });

  ipcMain.handle('listener:refreshAll', async () => {
    return listenerSubscribe.refreshAllArtists();
  });

  ipcMain.handle('listener:removeArtist', (_event, artistId) => {
    listenerLibrary.deleteArtist(artistId);
    return true;
  });

  ipcMain.handle('listener:ensureArtistManifest', async (_event, artistId) => {
    try {
      const artist = await listenerSubscribe.ensureArtistManifest(artistId);
      return { ok: true, data: artist };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: message };
    }
  });

  ipcMain.handle('listener:fetchSongManifest', async (_event, url) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return { ok: true, data: await response.json() };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: message };
    } finally {
      clearTimeout(timer);
    }
  });

  ipcMain.handle('listener:bindSongPageGuest', (_event, guestWebContentsId, allowedPageUrl) => {
    return bindSongPageGuestById(guestWebContentsId, allowedPageUrl);
  });

  ipcMain.handle('listener:updateSongDuration', (_event, songId, durationSeconds) => {
    return listenerLibrary.updateSongDurationSeconds(songId, durationSeconds);
  });

  // --- Artist Mode (compile) ---

  ipcMain.handle('artist:pickAudio', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'MP3', extensions: ['mp3'] }],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('artist:pickImage', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png'] }],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('artist:pickOutputFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('artist:compile', async (_event, payload) => {
    try {
      const { runCompile } = require('./compiler-bridge');
      const result = await runCompile(payload);
      return { ok: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Compile failed', { error: message });
      return { ok: false, error: message };
    }
  });

  ipcMain.handle('artist:openOutputFolder', (_event, folderPath) => {
    if (folderPath && fs.existsSync(folderPath)) {
      shell.openPath(folderPath);
      return true;
    }
    return false;
  });

  ipcMain.handle('artist:loadProjects', () => {
    const stored = database.getSetting('artist:projects', null);
    if (stored) return stored;

    const legacy = database.getSetting('artist:draft', null);
    if (legacy) {
      const migrated = {
        version: 2,
        activeProjectId: legacy.projectId || null,
        projects: [
          {
            ...legacy,
            projectId: legacy.projectId || require('crypto').randomUUID(),
          },
        ],
      };
      if (!migrated.activeProjectId) {
        migrated.activeProjectId = migrated.projects[0].projectId;
      }
      database.setSetting('artist:projects', migrated);
      return migrated;
    }

    return null;
  });

  ipcMain.handle('artist:saveProjects', (_event, state) => {
    database.setSetting('artist:projects', state);
    return true;
  });

  /** @deprecated Legacy single-draft key — kept for migration reads only. */
  ipcMain.handle('artist:loadDraft', () => {
    return database.getSetting('artist:draft', null);
  });

  ipcMain.handle('artist:saveDraft', (_event, draft) => {
    database.setSetting('artist:draft', draft);
    return true;
  });

  ipcMain.handle('artist:checkFfmpeg', async () => {
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);
    try {
      await execFileAsync('ffmpeg', ['-version']);
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: 'ffmpeg was not found on PATH. Install ffmpeg to compile Song Pages sites.',
      };
    }
  });

  ipcMain.handle('artist:readMp3Bytes', async (_event, filePath) => {
    try {
      if (!filePath || !fs.existsSync(filePath)) {
        return { ok: false, error: 'File not found.' };
      }
      const buffer = fs.readFileSync(filePath);
      // Return bytes to renderer — jsmediatags needs FileReader (browser APIs).
      return { ok: true, data: Uint8Array.from(buffer) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: message };
    }
  });

  // --- Visualizer projection window ---

  ipcMain.handle('visualizer:open', (event, options = {}) => {
    const mainWindow = BrowserWindow.fromWebContents(event.sender);
    if (!mainWindow) return { ok: false, error: 'Main window not found.' };
    return visualizerWindow.openVisualizerWindow(mainWindow, options);
  });

  ipcMain.handle('visualizer:close', () => visualizerWindow.closeVisualizerWindow());

  ipcMain.handle('visualizer:setFullScreen', (_event, fullscreen) =>
    visualizerWindow.setVisualizerFullScreen(fullscreen),
  );

  ipcMain.handle('visualizer:status', () => ({
    ok: true,
    data: {
      open: visualizerWindow.isVisualizerWindowOpen(),
      fullscreen: visualizerWindow.isVisualizerFullScreen(),
    },
  }));

  ipcMain.handle('visualizer:listDisplays', () => ({
    ok: true,
    data: visualizerWindow.listDisplays(),
  }));

  ipcMain.on('visualizer:sendConfig', (_event, payload) => {
    visualizerWindow.sendVisualizerConfig(payload);
  });

  ipcMain.on('visualizer:sendFrame', (_event, payload) => {
    visualizerWindow.sendVisualizerFrame(payload);
  });

  // --- VC Mode window ---

  ipcMain.handle('vc:open', (event, options = {}) => {
    const mainWindow = BrowserWindow.fromWebContents(event.sender);
    if (!mainWindow) return { ok: false, error: 'Main window not found.' };
    return vcWindow.openVcWindow(mainWindow, options);
  });

  ipcMain.handle('vc:close', () => vcWindow.closeVcWindow());

  ipcMain.handle('vc:setFullScreen', (_event, fullscreen) => vcWindow.setVcFullScreen(fullscreen));

  ipcMain.handle('vc:status', () => ({
    ok: true,
    data: { open: vcWindow.isVcWindowOpen(), fullscreen: vcWindow.isVcFullScreen() },
  }));

  ipcMain.on('vc:sendState', (_event, payload) => {
    vcWindow.sendVcState(payload);
  });

  ipcMain.on('vc:sendFrame', (_event, payload) => {
    vcWindow.sendVcFrame(payload);
  });

  ipcMain.on('vc:sendPlaybackStatus', (_event, payload) => {
    vcWindow.forwardVcPlaybackStatus(payload);
  });

  ipcMain.on('vc:sendTransport', (_event, payload) => {
    vcWindow.forwardVcTransport(payload);
  });

  ipcMain.on('vc:updateSurface', (_event, payload) => {
    vcWindow.forwardVcSurfacePatch(payload);
  });

  ipcMain.on('vc:commitSurface', (_event, payload) => {
    vcWindow.forwardVcSurfaceCommit(payload);
  });

  ipcMain.on('vc:requestVisualizerRotate', () => {
    vcWindow.forwardVcVisualizerRotateRequest();
  });

  ipcMain.on('vc:reportActiveVisualizer', (_event, id) => {
    if (typeof id === 'string') {
      vcWindow.forwardVcActiveVisualizerReport(id);
    }
  });
}

module.exports = { registerIpcHandlers };

