import fs from "node:fs/promises";
import path from "node:path";

/** Dev-only: validate a client-supplied local path before ffmpeg reads it. */
export async function resolveTrustedLocalPath(
  projectRoot: string,
  rawPath: string,
): Promise<string | null> {
  const trimmed = rawPath.trim();
  if (!trimmed || !path.isAbsolute(trimmed)) return null;

  const resolved = path.resolve(trimmed);
  const normalizedRoot = path.resolve(projectRoot);

  // Allow project tree and user home (typical Music/Downloads masters live outside repo).
  const home = process.env.HOME ? path.resolve(process.env.HOME) : null;
  const inProject = resolved === normalizedRoot || resolved.startsWith(`${normalizedRoot}${path.sep}`);
  const inHome = home !== null && (resolved === home || resolved.startsWith(`${home}${path.sep}`));

  if (!inProject && !inHome) return null;

  try {
    const stat = await fs.stat(resolved);
    if (!stat.isFile()) return null;
    return resolved;
  } catch {
    return null;
  }
}

export function linkedFilePath(linkedRoot: string, key: string, originalName: string): string {
  const ext = path.extname(originalName) || ".bin";
  const safeKey = key.replace(/[^a-zA-Z0-9:_-]/g, "_");
  return path.join(linkedRoot, `${safeKey}${ext}`);
}
