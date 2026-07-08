import type { CompileArtistManifest, CompileFileMap } from "./artistPageCompileService";
import { resolveTrustedLocalPath } from "./localPathResolve";

/** Structured rejection when compile IPC or manifest paths violate trust policy. */
export class CompileSecurityError extends Error {
  readonly code = "COMPILE_SECURITY_REJECT";

  constructor(message: string) {
    super(message);
    this.name = "CompileSecurityError";
  }
}

/**
 * Build compile input file map from manifest paths resolved in main.
 * Every referenced local path must exist as a regular file under trusted read roots.
 */
export async function buildStrictCompileFileMapFromManifest(
  manifest: CompileArtistManifest,
  projectRoot: string,
  readRoots: string[],
): Promise<CompileFileMap> {
  const map: CompileFileMap = new Map();

  if (manifest.hasArtistPhoto) {
    const raw = manifest.artistPhotoLocalPath?.trim();
    if (!raw) {
      throw new CompileSecurityError("Artist photo is enabled but manifest has no artistPhotoLocalPath.");
    }
    const resolved = await resolveTrustedLocalPath(projectRoot, raw, readRoots);
    if (!resolved) {
      throw new CompileSecurityError(
        `Artist photo path is outside trusted read roots or is not a readable file: ${raw}`,
      );
    }
    map.set("artist-photo", resolved);
  }

  for (const song of manifest.songs || []) {
    if (song.hasAudio) {
      const raw = song.audioLocalPath?.trim();
      if (!raw) {
        throw new CompileSecurityError(`Song "${song.title}" has audio enabled but no audioLocalPath.`);
      }
      const resolved = await resolveTrustedLocalPath(projectRoot, raw, readRoots);
      if (!resolved) {
        throw new CompileSecurityError(
          `Audio path for "${song.title}" is outside trusted read roots or is not a readable file: ${raw}`,
        );
      }
      map.set(`audio-${song.id}`, resolved);
    }

    if (song.hasCover) {
      const raw = song.coverLocalPath?.trim();
      if (!raw) {
        throw new CompileSecurityError(`Song "${song.title}" has cover enabled but no coverLocalPath.`);
      }
      const resolved = await resolveTrustedLocalPath(projectRoot, raw, readRoots);
      if (!resolved) {
        throw new CompileSecurityError(
          `Cover path for "${song.title}" is outside trusted read roots or is not a readable file: ${raw}`,
        );
      }
      map.set(`cover-${song.id}`, resolved);
    }

    if (song.hasExtraImage) {
      const raw = song.extraImageLocalPath?.trim();
      if (!raw) {
        throw new CompileSecurityError(`Song "${song.title}" has extra image enabled but no extraImageLocalPath.`);
      }
      const resolved = await resolveTrustedLocalPath(projectRoot, raw, readRoots);
      if (!resolved) {
        throw new CompileSecurityError(
          `Extra image path for "${song.title}" is outside trusted read roots or is not a readable file: ${raw}`,
        );
      }
      map.set(`extra-${song.id}`, resolved);
    }
  }

  return map;
}
