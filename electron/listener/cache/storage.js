const crypto = require('crypto');
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const { app } = require('electron');

function getCacheRoot() {
  return path.join(app.getPath('userData'), 'cache');
}

function createOpaqueCacheId() {
  return crypto.randomBytes(4).toString('hex');
}

function getEntryDir(cacheId) {
  return path.join(getCacheRoot(), cacheId);
}

async function ensureCacheRoot() {
  await fsPromises.mkdir(getCacheRoot(), { recursive: true });
}

async function writeEntryFile(cacheId, filename, data) {
  const entryDir = getEntryDir(cacheId);
  await fsPromises.mkdir(entryDir, { recursive: true });
  const filePath = path.join(entryDir, filename);
  await fsPromises.writeFile(filePath, data);
  return filePath;
}

async function readEntryFile(cacheId, filename) {
  return fsPromises.readFile(path.join(getEntryDir(cacheId), filename));
}

async function entryFileExists(cacheId, filename) {
  try {
    await fsPromises.access(path.join(getEntryDir(cacheId), filename));
    return true;
  } catch {
    return false;
  }
}

async function measureEntryBytes(cacheId) {
  const entryDir = getEntryDir(cacheId);
  try {
    const names = await fsPromises.readdir(entryDir);
    let total = 0;
    for (const name of names) {
      const stat = await fsPromises.stat(path.join(entryDir, name));
      if (stat.isFile()) total += stat.size;
    }
    return total;
  } catch {
    return 0;
  }
}

async function removeEntryDir(cacheId) {
  const entryDir = getEntryDir(cacheId);
  try {
    await fsPromises.rm(entryDir, { recursive: true, force: true });
  } catch {
    /* already gone */
  }
}

function resolveEntryFilePath(cacheId, filename) {
  const entryDir = getEntryDir(cacheId);
  const resolved = path.resolve(entryDir, filename);
  if (!resolved.startsWith(path.resolve(entryDir))) {
    throw new Error('Invalid cache path.');
  }
  return resolved;
}

function removeEntryDirSync(cacheId) {
  fs.rmSync(getEntryDir(cacheId), { recursive: true, force: true });
}

module.exports = {
  getCacheRoot,
  createOpaqueCacheId,
  getEntryDir,
  ensureCacheRoot,
  writeEntryFile,
  readEntryFile,
  entryFileExists,
  measureEntryBytes,
  removeEntryDir,
  removeEntryDirSync,
  resolveEntryFilePath,
};
