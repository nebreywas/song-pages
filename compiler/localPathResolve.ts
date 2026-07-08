import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildDevReadRoots, isPathUnderAnyRoot, normalizeReadRoots } from "./trustedReadRoots";

/** Resolve trusted read roots for path validation (project + home + optional extras). */
export function resolveReadRoots(projectRoot: string, extraReadRoots: string[] = []): string[] {
  return normalizeReadRoots([...buildDevReadRoots(projectRoot), ...extraReadRoots]);
}

/** Validate a client-supplied local path before ffmpeg reads it. */
export async function resolveTrustedLocalPath(
  projectRoot: string,
  rawPath: string,
  extraReadRoots: string[] = [],
): Promise<string | null> {
  const trimmed = rawPath.trim();
  if (!trimmed || !path.isAbsolute(trimmed)) return null;

  const resolved = path.resolve(trimmed);
  const readRoots = resolveReadRoots(projectRoot, extraReadRoots);
  if (!isPathUnderAnyRoot(resolved, readRoots)) return null;

  try {
    const stat = await fs.stat(resolved);
    if (!stat.isFile()) return null;
    return resolved;
  } catch {
    return null;
  }
}

/** Fail fast with a clear artist-facing message when a compile source file is missing. */
export async function assertReadableMediaFile(
  filePath: string,
  label: string,
  songTitle?: string,
): Promise<void> {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      throw new Error("not a file");
    }
  } catch {
    const songHint = songTitle ? ` for "${songTitle}"` : "";
    throw new Error(
      `Missing ${label}${songHint}: ${filePath}\n` +
        "The file was moved, renamed, or deleted. Re-select it in Artist Mode, then compile again.",
    );
  }
}

export function linkedFilePath(linkedRoot: string, key: string, originalName: string): string {
  const ext = path.extname(originalName) || ".bin";
  const safeKey = key.replace(/[^a-zA-Z0-9:_-]/g, "_");
  return path.join(linkedRoot, `${safeKey}${ext}`);
}

/** @deprecated Prefer os.homedir() via trustedReadRoots — kept for tests referencing home resolution. */
export function userHomeDirectory(): string {
  return os.homedir();
}
