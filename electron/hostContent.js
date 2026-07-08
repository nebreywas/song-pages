/**
 * Host Content media storage in app userData.
 */

const { app, dialog, nativeImage } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const HOST_GRAPHIC_MAX_BYTES = 5 * 1024 * 1024;
const HOST_VIDEO_MAX_BYTES = 12 * 1024 * 1024;
const HOST_MEDIA_MAX_PX = 2560;
const GRAPHIC_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'heic', 'webp', 'gif']);

function extensionOf(filePath) {
  const match = /\.([^.\\/]+)$/i.exec(filePath);
  return match ? match[1].toLowerCase() : '';
}

function validateGraphicFile(filePath, fileSizeBytes, widthPx, heightPx) {
  const ext = extensionOf(filePath);
  if (!GRAPHIC_EXTENSIONS.has(ext)) {
    return 'File must be (.png/.jpg/.heic/.gif/.webp) format.';
  }
  if (fileSizeBytes > HOST_GRAPHIC_MAX_BYTES) return 'File size can not exceed 5mb';
  if (widthPx > HOST_MEDIA_MAX_PX || heightPx > HOST_MEDIA_MAX_PX) {
    return 'Image or video size can not exceed  2560 x 2560';
  }
  return null;
}

function validateVideoFile(filePath, fileSizeBytes) {
  if (extensionOf(filePath) !== 'mp4') return 'File must be .mp4 format.';
  if (fileSizeBytes > HOST_VIDEO_MAX_BYTES) return 'File size can not exceed 12mb';
  return null;
}

function hostContentRoot() {
  return path.join(app.getPath('userData'), 'host-content');
}

/** Reject path traversal — resolved path must stay under host-content root. */
function isPathUnderRoot(absolutePath, rootDir) {
  const root = path.resolve(rootDir);
  const resolved = path.resolve(absolutePath);
  return resolved === root || resolved.startsWith(`${root}${path.sep}`);
}

function resolveMediaPath(relativePath) {
  if (!relativePath || typeof relativePath !== 'string') return null;

  const trimmed = relativePath.trim();
  if (!trimmed || path.isAbsolute(trimmed) || trimmed.includes('\0')) return null;

  const root = path.resolve(hostContentRoot());
  const absolute = path.resolve(root, trimmed.replace(/^\//, ''));
  if (!isPathUnderRoot(absolute, root)) return null;
  if (!fs.existsSync(absolute)) return null;
  return absolute;
}

function hostMediaDir() {
  return path.join(hostContentRoot(), 'media');
}

function ensureHostMediaDir() {
  fs.mkdirSync(hostMediaDir(), { recursive: true });
}

function readImageDimensions(filePath) {
  const image = nativeImage.createFromPath(filePath);
  const size = image.getSize();
  return { widthPx: size.width || 0, heightPx: size.height || 0 };
}

function copyMedia(sourcePath, itemId) {
  ensureHostMediaDir();
  const ext = path.extname(sourcePath).toLowerCase();
  const fileName = `${itemId}-${Date.now()}${ext}`;
  const destPath = path.join(hostMediaDir(), fileName);
  fs.copyFileSync(sourcePath, destPath);
  const relative = path.join('media', fileName).replace(/\\/g, '/');
  const fileSizeBytes = fs.statSync(destPath).size;
  return { relative, absolute: destPath, fileSizeBytes };
}

async function pickMediaFile(kind) {
  const filters =
    kind === 'video'
      ? [{ name: 'Video', extensions: ['mp4'] }]
      : [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'heic', 'webp', 'gif'] }];

  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters,
  });

  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
}

function registerHostContentIpc(ipcMain) {
  ipcMain.handle('hostContent:pickAndImportMedia', async (_event, payload = {}) => {
    try {
      const kind = payload.kind === 'video' ? 'video' : 'graphic';
      const itemId = typeof payload.itemId === 'string' ? payload.itemId : crypto.randomUUID();
      const sourcePath = await pickMediaFile(kind);
      if (!sourcePath) return { ok: false, canceled: true };

      const fileSizeBytes = fs.statSync(sourcePath).size;

      if (kind === 'graphic') {
        const { widthPx, heightPx } = readImageDimensions(sourcePath);
        const error = validateGraphicFile(sourcePath, fileSizeBytes, widthPx, heightPx);
        if (error) return { ok: false, error };
        const copied = copyMedia(sourcePath, itemId);
        return {
          ok: true,
          mediaPath: copied.relative,
          widthPx,
          heightPx,
          fileSizeBytes: copied.fileSizeBytes,
        };
      }

      const error = validateVideoFile(sourcePath, fileSizeBytes);
      if (error) return { ok: false, error };
      const copied = copyMedia(sourcePath, itemId);
      return {
        ok: true,
        mediaPath: copied.relative,
        widthPx: 0,
        heightPx: 0,
        fileSizeBytes: copied.fileSizeBytes,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: message };
    }
  });

  ipcMain.handle('hostContent:resolveMediaUrl', (_event, relativePath) => {
    const absolute = resolveMediaPath(relativePath);
    if (!absolute) return null;
    // pathToFileURL encodes spaces and other characters safely for renderer img/video src.
    return pathToFileURL(absolute).href;
  });

  ipcMain.handle('hostContent:deleteMedia', (_event, relativePath) => {
    const absolute = resolveMediaPath(relativePath);
    if (!absolute) return false;
    try {
      fs.unlinkSync(absolute);
      return true;
    } catch {
      return false;
    }
  });
}

module.exports = {
  hostContentRoot,
  hostMediaDir,
  resolveMediaPath,
  registerHostContentIpc,
};
