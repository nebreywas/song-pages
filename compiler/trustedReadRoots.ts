import os from "node:os";
import path from "node:path";

/** Normalize and dedupe trusted read roots (order preserved). */
export function normalizeReadRoots(roots: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const root of roots) {
    const resolved = path.resolve(root);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    out.push(resolved);
  }
  return out;
}

/** True when `resolvedPath` is the root itself or a descendant file path under it. */
export function isPathUnderRoot(resolvedPath: string, root: string): boolean {
  const resolved = path.resolve(resolvedPath);
  const normalizedRoot = path.resolve(root);
  return resolved === normalizedRoot || resolved.startsWith(`${normalizedRoot}${path.sep}`);
}

export function isPathUnderAnyRoot(resolvedPath: string, roots: string[]): boolean {
  return roots.some((root) => isPathUnderRoot(resolvedPath, root));
}

/**
 * Electron compile read roots:
 * - project tree
 * - user home (os.homedir — cross-platform)
 * - application userData and managed subfolders
 *
 * External volumes / NAS mounts are NOT auto-trusted. Future authorization can extend
 * `extraReadRoots` (picker, remembered project root, approved media root).
 */
export function buildElectronReadRoots(projectRoot: string, userDataPath: string): string[] {
  return normalizeReadRoots([
    projectRoot,
    os.homedir(),
    userDataPath,
    path.join(userDataPath, "compile-uploads"),
    path.join(userDataPath, "artistpages"),
    path.join(userDataPath, "host-content"),
  ]);
}

/** Dev Vite compile API — project + home only (uploads live under project linked dir). */
export function buildDevReadRoots(projectRoot: string): string[] {
  return normalizeReadRoots([projectRoot, os.homedir()]);
}
