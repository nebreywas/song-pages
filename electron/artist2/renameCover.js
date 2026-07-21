/**
 * Rename a cover image on disk to `{slug}-COVER[.n].{ext}` and update catalog pointers.
 */

const fs = require('fs');
const path = require('path');
const catalog = require('./catalog');
const { ensureTsLoader } = require('../tsLoader');

function loadCoverFilenameHelpers() {
  ensureTsLoader();
  return require('../../shared/artist2/coverFilename.ts');
}

function listBasenames(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => {
    try {
      return fs.statSync(path.join(dir, name)).isFile();
    } catch {
      return false;
    }
  });
}

/**
 * Rename `sourcePath` in place to a readable cover name derived from `objectName`.
 * Returns the final absolute path (unchanged when already correctly named).
 */
function renameCoverOnDisk(sourcePath, objectName) {
  const { buildCoverFilename, isAlreadyCoverNamed } = loadCoverFilenameHelpers();

  if (!sourcePath || typeof sourcePath !== 'string') {
    throw new Error('No cover file path to rename.');
  }
  const absolute = path.resolve(sourcePath.trim());
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    throw new Error('Cover file is missing on disk.');
  }

  const dir = path.dirname(absolute);
  const currentBase = path.basename(absolute);
  if (isAlreadyCoverNamed(currentBase, objectName)) {
    return { path: absolute, renamed: false, filename: currentBase };
  }

  const ext = path.extname(absolute) || '.jpeg';
  // Exclude the file we are renaming so we can reuse its slot if names collide oddly.
  const occupied = listBasenames(dir).filter(
    (name) => name.toLowerCase() !== currentBase.toLowerCase(),
  );
  const nextBase = buildCoverFilename(objectName, ext, occupied);
  const dest = path.join(dir, nextBase);

  if (path.resolve(dest) !== absolute) {
    fs.renameSync(absolute, dest);
  }

  return { path: dest, renamed: true, filename: nextBase };
}

/**
 * Rename cover for a Song, Album, or image Content object.
 * - inline artwork → update that object's artwork.path
 * - contentRef → rename the Content file and update Content.filePath
 * - content image → rename Content.filePath
 */
function renameCoverForObject(objectId) {
  const obj = catalog.getObject(objectId);
  if (!obj) throw new Error('Object not found.');

  if (obj.kind === 'content') {
    if (obj.contentType !== 'image') {
      throw new Error('Only image Content can be renamed as cover.');
    }
    const filePath = obj.payload?.filePath;
    const result = renameCoverOnDisk(filePath, obj.name);
    const updated = catalog.updateObject(obj.id, {
      payload: { filePath: result.path },
    });
    return {
      object: updated,
      content: updated,
      ...result,
    };
  }

  if (obj.kind !== 'song' && obj.kind !== 'album') {
    throw new Error('Cover rename is only available on Songs, Albums, or image Content.');
  }

  const artwork = obj.payload?.artwork;
  if (!artwork) throw new Error('This object has no artwork to rename.');

  if (artwork.mode === 'inline') {
    const result = renameCoverOnDisk(artwork.path, obj.name);
    const updated = catalog.updateObject(obj.id, {
      payload: { artwork: { mode: 'inline', path: result.path } },
    });
    return { object: updated, content: null, ...result };
  }

  if (artwork.mode === 'contentRef' && artwork.contentId) {
    const content = catalog.getObject(artwork.contentId);
    if (!content || content.kind !== 'content' || content.contentType !== 'image') {
      throw new Error('Referenced cover Content is missing.');
    }
    // Name from the parent Song/Album so the file reads as that object's cover.
    const result = renameCoverOnDisk(content.payload?.filePath, obj.name);
    const updatedContent = catalog.updateObject(content.id, {
      payload: { filePath: result.path },
    });
    // Parent object unchanged (still contentRef) — return fresh parent + content.
    const updatedParent = catalog.getObject(obj.id);
    return {
      object: updatedParent,
      content: updatedContent,
      ...result,
    };
  }

  throw new Error('No cover file is attached.');
}

module.exports = {
  renameCoverOnDisk,
  renameCoverForObject,
};
