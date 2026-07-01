import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { escapeHtmlText } from "./staticSiteUtils";
import { SONG_PAGES_SITE_CSP_META } from "../shared/siteCsp";

const execFileAsync = promisify(execFile);

export type StaticSiteBuildInfo = {
  /** Unique identifier for this generation — used as `?v=` on local assets. */
  buildVersion: string;
  /** ISO-8601 UTC timestamp when the build started. */
  generatedAt: string;
};

const LOCAL_ASSET_EXTENSIONS =
  /\.(?:css|js|mjs|map|jpg|jpeg|png|gif|webp|svg|ico|woff2?|ttf|otf|eot|html|m3u8|ts)$/i;

/** True when the URL points at a same-origin static asset (not http(s) / protocol-relative). */
export function isLocalStaticAssetUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || trimmed === "#" || trimmed.startsWith("#")) return false;
  if (/^(?:https?:|\/\/|mailto:|tel:|javascript:|data:)/i.test(trimmed)) return false;
  return LOCAL_ASSET_EXTENSIONS.test(trimmed.split("?")[0]?.split("#")[0] ?? "");
}

/** Append (or replace) a cache-bust query param without touching external URLs. */
export function appendBuildVersionToLocalUrl(url: string, buildVersion: string): string {
  if (!isLocalStaticAssetUrl(url)) return url;

  const hashIndex = url.indexOf("#");
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;

  const queryIndex = withoutHash.indexOf("?");
  const pathname = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : "";

  const params = new URLSearchParams(query);
  params.set("v", buildVersion);

  const nextQuery = params.toString();
  return `${pathname}?${nextQuery}${hash}`;
}

async function tryGitShortHash(projectRoot: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: projectRoot,
    });
    const hash = stdout.trim();
    return hash || null;
  } catch {
    return null;
  }
}

/**
 * Create a build identifier for a static site generation run.
 * Format: compact UTC timestamp, optionally suffixed with git short hash.
 */
export async function createStaticSiteBuildInfo(projectRoot: string): Promise<StaticSiteBuildInfo> {
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const gitHash = await tryGitShortHash(projectRoot);
  const buildVersion = gitHash ? `${stamp}-${gitHash}` : stamp;

  return { buildVersion, generatedAt };
}

/** Insert `<meta name="build-version">` for deployment verification in devtools. */
export function injectBuildVersionMeta(html: string, buildVersion: string): string {
  if (/name=["']build-version["']/i.test(html)) return html;

  const meta = `<meta name="build-version" content="${escapeHtmlText(buildVersion)}" />`;
  const viewportMatch = html.match(/<meta\s+name=["']viewport["'][^>]*>/i);
  if (viewportMatch?.[0]) {
    return html.replace(viewportMatch[0], `${viewportMatch[0]}\n    ${meta}`);
  }

  const charsetMatch = html.match(/<meta\s+charset=["'][^"']*["']\s*\/?>/i);
  if (charsetMatch?.[0]) {
    return html.replace(charsetMatch[0], `${charsetMatch[0]}\n    ${meta}`);
  }

  return html.replace(/<head>/i, `<head>\n    ${meta}`);
}

function versionAttributeUrls(html: string, buildVersion: string, attribute: string): string {
  const pattern = new RegExp(`(${attribute})=(["'])([^"']+)\\2`, "gi");
  return html.replace(pattern, (match, name: string, quote: string, rawUrl: string) => {
    const versioned = appendBuildVersionToLocalUrl(rawUrl, buildVersion);
    if (versioned === rawUrl) return match;
    return `${name}=${quote}${versioned}${quote}`;
  });
}

/** Version `manifest` / `page` entries embedded in the site playlist JSON block. */
function versionPlaylistJsonInHtml(html: string, buildVersion: string): string {
  return html.replace(
    /(<script\s+type=["']application\/json["']\s+id=["']site-playlist["']>)([\s\S]*?)(<\/script>)/i,
    (full, open: string, json: string, close: string) => {
      try {
        const playlist = JSON.parse(json) as unknown;
        if (!Array.isArray(playlist)) return full;

        for (const entry of playlist) {
          if (!entry || typeof entry !== "object") continue;
          const row = entry as Record<string, unknown>;
          if (typeof row.manifest === "string") {
            row.manifest = appendBuildVersionToLocalUrl(row.manifest, buildVersion);
          }
          if (typeof row.page === "string") {
            row.page = appendBuildVersionToLocalUrl(row.page, buildVersion);
          }
        }

        const serialized = JSON.stringify(playlist).replace(/</g, "\\u003c");
        return `${open}${serialized}${close}`;
      } catch {
        return full;
      }
    },
  );
}

/**
 * Final HTML pass: build meta tag + automatic `?v=BUILD_VERSION` on every local asset URL.
 * Templates stay unchanged — all rewriting happens here in the generation pipeline.
 */
export function injectContentSecurityPolicy(html: string): string {
  if (html.includes("Content-Security-Policy")) {
    return html;
  }
  return html.replace("<head>", `<head>\n    ${SONG_PAGES_SITE_CSP_META}`);
}

export function finalizeStaticHtml(html: string, buildVersion: string): string {
  let out = injectContentSecurityPolicy(html);
  out = injectBuildVersionMeta(out, buildVersion);
  for (const attribute of ["href", "src", "data-cover-src"]) {
    out = versionAttributeUrls(out, buildVersion, attribute);
  }
  out = versionPlaylistJsonInHtml(out, buildVersion);
  return out;
}

/** Version hard-coded relative asset paths inside copied JS (e.g. HLS manifest source). */
export function versionLocalAssetsInJs(source: string, buildVersion: string): string {
  return source.replace(
    /(["'])((?:\.\.?\/)[^"'?#]+?\.(?:m3u8|js|css|jpg|jpeg|png|webp|svg|html))(\?[^"']*)?\1/g,
    (_match, quote: string, assetPath: string) => {
      const versioned = appendBuildVersionToLocalUrl(assetPath, buildVersion);
      return `${quote}${versioned}${quote}`;
    },
  );
}

/** Append build version to segment URIs listed in an HLS media playlist. */
export function versionHlsManifestContent(content: string, buildVersion: string): string {
  return content
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;
      return appendBuildVersionToLocalUrl(trimmed, buildVersion);
    })
    .join("\n");
}

export async function writeBuildJson(
  outputRoot: string,
  buildInfo: StaticSiteBuildInfo,
): Promise<void> {
  const payload = {
    buildVersion: buildInfo.buildVersion,
    generatedAt: buildInfo.generatedAt,
  };
  await fs.writeFile(path.join(outputRoot, "build.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function walkFiles(dir: string, onFile: (filePath: string) => Promise<void>): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(fullPath, onFile);
    } else if (entry.isFile()) {
      await onFile(fullPath);
    }
  }
}

/** Rewrite every `manifest.m3u8` under the output tree so segment requests are cache-busted too. */
export async function versionHlsManifestsInTree(outputRoot: string, buildVersion: string): Promise<void> {
  await walkFiles(outputRoot, async (filePath) => {
    if (path.extname(filePath).toLowerCase() !== ".m3u8") return;
    const raw = await fs.readFile(filePath, "utf8");
    const versioned = versionHlsManifestContent(raw, buildVersion);
    if (versioned !== raw) {
      await fs.writeFile(filePath, versioned, "utf8");
    }
  });
}

/**
 * Cache-Control suitable for static site hosting:
 * HTML + build.json → revalidate; versioned assets → long-lived immutable cache.
 */
export function cacheControlForStaticRequest(requestUrl: string, filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath).toLowerCase();

  if (ext === ".html" || (ext === ".json" && baseName === "build.json")) {
    return "no-cache";
  }

  const query = requestUrl.includes("?") ? requestUrl.split("?")[1]?.split("#")[0] ?? "" : "";
  const params = new URLSearchParams(query);
  if (params.has("v")) {
    return "public, max-age=31536000, immutable";
  }

  return "no-cache";
}
