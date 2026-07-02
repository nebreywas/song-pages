/**
 * Bridge from Electron main (CommonJS) to TypeScript compile service.
 */
const path = require('path');
const { app } = require('electron');
const { slugifySiteText } = require('./compiler-slugify');

function buildFileMapFromManifest(manifest) {
  const files = new Map();

  if (manifest.hasArtistPhoto && manifest.artistPhotoLocalPath?.trim()) {
    files.set('artist-photo', manifest.artistPhotoLocalPath.trim());
  }

  for (const song of manifest.songs || []) {
    if (song.hasAudio && song.audioLocalPath?.trim()) {
      files.set(`audio-${song.id}`, song.audioLocalPath.trim());
    }
    if (song.hasCover && song.coverLocalPath?.trim()) {
      files.set(`cover-${song.id}`, song.coverLocalPath.trim());
    }
    if (song.hasExtraImage && song.extraImageLocalPath?.trim()) {
      files.set(`extra-${song.id}`, song.extraImageLocalPath.trim());
    }
  }

  return files;
}

async function runCompile(payload) {
  let compileArtistPage;

  if (app.isPackaged) {
    // Single CJS bundle — marked v18 is ESM-only and cannot be require()'d from tsc output.
    ({ compileArtistPage } = require('./compiler-dist/bundle.cjs'));
  } else {
    require('tsx/cjs/api').register();
    ({ compileArtistPage } = require('../compiler/artistPageCompileService.ts'));
  }

  const projectRoot = path.join(__dirname, '..');
  const manifest = payload.manifest;
  const files = payload.fileMap
    ? new Map(payload.fileMap)
    : buildFileMapFromManifest(manifest);

  const slug = slugifySiteText(manifest.artistSlug);
  const outputRootOverride =
    payload.outputRoot || path.join(app.getPath('userData'), 'artistpages', slug);

  return compileArtistPage({
    projectRoot,
    manifest,
    files,
    uploadsDir: path.join(app.getPath('userData'), 'compile-uploads'),
    outputRootOverride,
  });
}

module.exports = { runCompile };
