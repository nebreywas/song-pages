/**
 * Bridge from Electron main (CommonJS) to TypeScript compile service.
 */
const path = require('path');
const { app } = require('electron');
const { slugifySiteText } = require('./compiler-slugify');
const { ensureTsLoader } = require('./tsLoader');

class CompileSecurityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CompileSecurityError';
    this.code = 'COMPILE_SECURITY_REJECT';
  }
}

function loadCompileModules() {
  if (app.isPackaged) {
    return require('./compiler-dist/bundle.cjs');
  }
  ensureTsLoader();
  return {
    compileArtistPage: require('../compiler/artistPageCompileService.ts').compileArtistPage,
    buildStrictCompileFileMapFromManifest:
      require('../compiler/compileFileMapBuilder.ts').buildStrictCompileFileMapFromManifest,
    buildElectronReadRoots: require('../compiler/trustedReadRoots.ts').buildElectronReadRoots,
    CompileSecurityError: require('../compiler/compileFileMapBuilder.ts').CompileSecurityError,
  };
}

function rejectUntrustedPayload(field) {
  throw new CompileSecurityError(
    `Compile IPC rejects renderer-supplied ${field}. Paths and output are resolved in the main process.`,
  );
}

async function runCompile(payload) {
  const {
    compileArtistPage,
    buildStrictCompileFileMapFromManifest,
    buildElectronReadRoots,
  } = loadCompileModules();

  if (payload?.fileMap != null) {
    rejectUntrustedPayload('fileMap');
  }
  if (payload?.outputRoot != null && String(payload.outputRoot).trim()) {
    rejectUntrustedPayload('outputRoot');
  }

  const manifest = payload?.manifest;
  if (!manifest || typeof manifest !== 'object') {
    throw new CompileSecurityError('Compile requires a manifest object.');
  }

  const projectRoot = path.join(__dirname, '..');
  const userData = app.getPath('userData');
  const readRoots = buildElectronReadRoots(projectRoot, userData);
  const files = await buildStrictCompileFileMapFromManifest(manifest, projectRoot, readRoots);

  const slug = slugifySiteText(manifest.artistSlug);
  const outputRootOverride = path.join(userData, 'artistpages', slug);

  return compileArtistPage({
    projectRoot,
    manifest,
    files,
    uploadsDir: path.join(userData, 'compile-uploads'),
    outputRootOverride,
  });
}

module.exports = { runCompile, CompileSecurityError };
