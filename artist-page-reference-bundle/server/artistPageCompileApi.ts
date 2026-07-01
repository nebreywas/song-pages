import type { ServerResponse } from "node:http";
import fs from "node:fs";
import type { Connect } from "vite";
import type { Plugin } from "vite";
import fsp from "node:fs/promises";
import path from "node:path";

import formidable from "formidable";

import {
  compileArtistPage,
  type CompileArtistManifest,
  type CompileFileMap,
} from "./artistPageCompileService";
import { linkedFilePath, resolveTrustedLocalPath } from "./localPathResolve";
import { cacheControlForStaticRequest } from "./staticSiteBuild";

const MIME_BY_EXT: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const BOT_DISCOURAGE_HEADERS: Record<string, string> = {
  "X-Robots-Tag": "noai, noimageai",
};

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function firstFieldValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function resolveStaticFile(exportsRoot: string, urlPrefix: string, urlPath: string): string | null {
  const relative = urlPath.replace(new RegExp(`^${urlPrefix}/?`), "");
  if (!relative || relative.includes("..")) return null;

  const resolved = path.resolve(exportsRoot, relative);
  const normalizedRoot = path.resolve(exportsRoot);
  if (resolved !== normalizedRoot && !resolved.startsWith(`${normalizedRoot}${path.sep}`)) {
    return null;
  }

  return resolved;
}

function serveStaticFile(
  res: ServerResponse,
  filePath: string,
  mimeByExt: Record<string, string>,
  requestUrl: string,
): void {
  const ext = path.extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader("Content-Type", mimeByExt[ext] ?? "application/octet-stream");
  res.setHeader("Cache-Control", cacheControlForStaticRequest(requestUrl, filePath));
  if (ext === ".m3u8" || ext === ".ts") {
    for (const [key, value] of Object.entries(BOT_DISCOURAGE_HEADERS)) {
      res.setHeader(key, value);
    }
  }
  fs.createReadStream(filePath).pipe(res);
}

function buildFileMap(files: formidable.Files): CompileFileMap {
  const map: CompileFileMap = new Map();

  for (const [field, entries] of Object.entries(files)) {
    const file = entries?.[0];
    if (file?.filepath) {
      map.set(field, file.filepath);
    }
  }

  return map;
}

async function cleanupUploads(fileMap: CompileFileMap): Promise<void> {
  await Promise.all(
    [...fileMap.values()].map((filepath) => fsp.unlink(filepath).catch(() => undefined)),
  );
}

/** Merge manifest localPath fields + multipart uploads into a single source map for compile. */
async function buildCompileFileMap(
  manifest: CompileArtistManifest,
  uploads: CompileFileMap,
  projectRoot: string,
): Promise<CompileFileMap> {
  const map: CompileFileMap = new Map(uploads);

  if (manifest.artistPhotoLocalPath) {
    const resolved = await resolveTrustedLocalPath(projectRoot, manifest.artistPhotoLocalPath);
    if (resolved) map.set("artist-photo", resolved);
  }

  for (const song of manifest.songs) {
    if (song.audioLocalPath) {
      const resolved = await resolveTrustedLocalPath(projectRoot, song.audioLocalPath);
      if (resolved) map.set(`audio-${song.id}`, resolved);
    }
    if (song.coverLocalPath) {
      const resolved = await resolveTrustedLocalPath(projectRoot, song.coverLocalPath);
      if (resolved) map.set(`cover-${song.id}`, resolved);
    }
    if (song.extraImageLocalPath) {
      const resolved = await resolveTrustedLocalPath(projectRoot, song.extraImageLocalPath);
      if (resolved) map.set(`extra-${song.id}`, resolved);
    }
  }

  return map;
}

function createArtistPageCompileMiddleware(projectRoot: string): Connect.NextHandleFunction {
  const artistPagesRoot = path.join(projectRoot, "artistpages");
  const uploadsRoot = path.join(projectRoot, "artist-page-compile", ".uploads");
  const linkedRoot = path.join(projectRoot, "artist-page-compile", "linked");

  return async (req, res, next) => {
    const url = req.url?.split("?")[0] ?? "";

    if (url.startsWith("/artistpages/")) {
      const filePath = resolveStaticFile(artistPagesRoot, "/artistpages", url);
      if (!filePath) {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }

      try {
        const stat = await fsp.stat(filePath);
        if (!stat.isFile()) {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }
        serveStaticFile(res, filePath, MIME_BY_EXT, req.url ?? "");
      } catch {
        res.statusCode = 404;
        res.end("Not found");
      }
      return;
    }

    if (url === "/api/dev/artist-page-link-file") {
      if (req.method !== "POST") {
        sendJson(res, 405, { ok: false, error: "Use POST" });
        return;
      }

      await fsp.mkdir(linkedRoot, { recursive: true });

      const form = formidable({
        uploadDir: uploadsRoot,
        keepExtensions: true,
        maxFileSize: 150 * 1024 * 1024,
        maxFiles: 1,
      });

      let fields: formidable.Fields;
      let files: formidable.Files;

      try {
        [fields, files] = await form.parse(req);
      } catch (err) {
        sendJson(res, 400, {
          ok: false,
          error: err instanceof Error ? err.message : "Invalid upload",
        });
        return;
      }

      const key = firstFieldValue(fields.key);
      const upload = files.file?.[0];
      if (!key || !upload?.filepath) {
        sendJson(res, 400, { ok: false, error: "Missing key or file" });
        return;
      }

      const dest = linkedFilePath(linkedRoot, key, upload.originalFilename ?? "file.bin");

      try {
        await fsp.mkdir(path.dirname(dest), { recursive: true });
        await fsp.copyFile(upload.filepath, dest);
        sendJson(res, 200, { ok: true, localPath: dest, fileName: path.basename(dest) });
      } catch (err) {
        sendJson(res, 500, {
          ok: false,
          error: err instanceof Error ? err.message : "Link failed",
        });
      } finally {
        await fsp.unlink(upload.filepath).catch(() => undefined);
      }
      return;
    }

    if (url !== "/api/dev/artist-page-compile") {
      next();
      return;
    }

    if (req.method !== "POST") {
      sendJson(res, 405, { ok: false, error: "Use POST" });
      return;
    }

    await fsp.mkdir(uploadsRoot, { recursive: true });

    const form = formidable({
      uploadDir: uploadsRoot,
      keepExtensions: true,
      maxFileSize: 150 * 1024 * 1024,
      maxFiles: 80,
    });

    let fields: formidable.Fields;
    let files: formidable.Files;

    try {
      [fields, files] = await form.parse(req);
    } catch (err) {
      sendJson(res, 400, {
        ok: false,
        error: err instanceof Error ? err.message : "Invalid upload",
      });
      return;
    }

    const manifestRaw = firstFieldValue(fields.manifest);
    if (!manifestRaw) {
      sendJson(res, 400, { ok: false, error: "Missing manifest JSON" });
      return;
    }

    let manifest: CompileArtistManifest;
    try {
      manifest = JSON.parse(manifestRaw) as CompileArtistManifest;
    } catch {
      sendJson(res, 400, { ok: false, error: "Invalid manifest JSON" });
      return;
    }

    const uploadMap = buildFileMap(files);
    const fileMap = await buildCompileFileMap(manifest, uploadMap, projectRoot);

    try {
      const result = await compileArtistPage({
        projectRoot,
        manifest,
        files: fileMap,
        uploadsDir: uploadsRoot,
      });

      sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      sendJson(res, 400, {
        ok: false,
        error: err instanceof Error ? err.message : "Compile failed",
      });
    } finally {
      await cleanupUploads(uploadMap);
    }
  };
}

/**
 * Dev-only: artist page compile API + static serving of artistpages/.
 * Not deployed to Vercel. See docs/artist-page-editor.md.
 */
export function devArtistPageCompilePlugin(projectRoot: string): Plugin {
  return {
    name: "dev-artist-page-compile",
    configureServer(server) {
      server.middlewares.use(createArtistPageCompileMiddleware(projectRoot));
    },
  };
}
