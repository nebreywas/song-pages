/**
 * Packaged Electron compile bundle entry — exports compile service + path trust helpers.
 */
export { compileArtistPage } from "./artistPageCompileService";
export type { CompileArtistManifest, CompileFileMap } from "./artistPageCompileService";
export { buildStrictCompileFileMapFromManifest, CompileSecurityError } from "./compileFileMapBuilder";
export { buildElectronReadRoots } from "./trustedReadRoots";
