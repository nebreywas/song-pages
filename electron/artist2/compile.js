/**
 * Artist 2.0 compile — build manifest from SQLite catalog, run existing compile pipeline.
 */

const catalog = require('./catalog');
const { runCompile } = require('../compiler-bridge');

function loadBuildCompileManifest() {
  require('tsx/cjs/api').register();
  return require('../../shared/artist2/buildCompileManifest.ts');
}

/** Preview compile readiness without running ffmpeg. */
function getCompilePreview(artistId) {
  const artist = catalog.getArtist(artistId);
  if (!artist) throw new Error('Artist not found.');

  const objects = catalog.listObjects(artistId);
  const songs = objects.filter((row) => row.kind === 'song');
  const albums = objects.filter((row) => row.kind === 'album');
  const content = objects.filter((row) => row.kind === 'content');
  const memberships = catalog.listMembershipsForArtist(artistId);

  const { buildArtist2CompileManifest } = loadBuildCompileManifest();
  return buildArtist2CompileManifest({ artist, songs, albums, content, memberships });
}

async function compileArtistCatalog(artistId) {
  const preview = getCompilePreview(artistId);
  if (preview.manifest.songs.length === 0) {
    throw new Error('Nothing to compile — add at least one song with audio.');
  }

  const result = await runCompile({ manifest: preview.manifest });
  return {
    ...result,
    warnings: preview.warnings,
    skippedSongs: preview.skippedSongs,
  };
}

module.exports = {
  getCompilePreview,
  compileArtistCatalog,
};
