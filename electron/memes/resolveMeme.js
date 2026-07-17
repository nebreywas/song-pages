/**
 * Main-process meme resolver.
 *
 * The Meme Field accepts DIRECT media URLs only (no provider awareness, no page
 * scraping). This module:
 *   1. Validates the URL points at a supported media file (shared parser).
 *   2. Probes it with a HEAD request (following redirects, revalidating each
 *      hop) to confirm it EXISTS, is an image/video, and is under the size cap.
 *
 * Running in the main process lets us reach hosts the renderer's CSP/CORS can't
 * and gives the controller clean up-front feedback ("not found" / "too large").
 */
const logger = require('../logger');
const { validateRemoteUrl } = require('../net/urlPolicy');

const MAX_REDIRECTS = 3;
const PROBE_TIMEOUT_MS = 8000;

function loadShared() {
  // The Electron main process has no TypeScript loader by default — register
  // tsx before requiring any shared `.ts` module (matches electron/artist2/*).
  require('tsx/cjs/api').register();
  const { parseMemeInput } = require('../../shared/memes/parseMemeInput.ts');
  const { MEME_MAX_BYTES } = require('../../shared/memes/types.ts');
  return { parseMemeInput, MEME_MAX_BYTES };
}

/**
 * HEAD-probe a media URL, following redirects and revalidating each hop.
 * @returns {Promise<{ ok: true, contentType: string | null, contentLength: number } | { ok: false, error: string }>}
 */
async function probeMediaUrl(url) {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const check = validateRemoteUrl(current, {
      purpose: 'meme-media',
      provenance: 'user-initiated',
    });
    if (!check.ok) return { ok: false, error: check.error || 'Link is not allowed.' };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(current, {
        method: 'HEAD',
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 SongPages/1.0' },
      });
    } catch {
      return { ok: false, error: 'Could not reach that link.' };
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) return { ok: false, error: 'Broken redirect at that link.' };
      current = new URL(location, current).href;
      continue;
    }

    // Some hosts reject HEAD — treat a clear "method not allowed" as existing.
    if (response.status === 405 || response.status === 501) {
      return { ok: true, contentType: null, contentLength: 0 };
    }

    if (response.status === 404 || response.status === 410) {
      return { ok: false, error: 'That file does not exist (404).' };
    }
    if (!response.ok) {
      return { ok: false, error: `That link returned an error (${response.status}).` };
    }

    const contentType = response.headers.get('content-type');
    const lengthHeader = response.headers.get('content-length');
    const contentLength = lengthHeader ? Number(lengthHeader) : 0;
    return { ok: true, contentType, contentLength };
  }
  return { ok: false, error: 'Too many redirects at that link.' };
}

/**
 * @param {string} rawInput URL the host typed into the Meme Field.
 * @returns {Promise<{ ok: true, media: import('../../shared/memes/types.ts').ResolvedMeme } | { ok: false, error: string }>}
 */
async function resolveMemeInput(rawInput) {
  const { parseMemeInput, MEME_MAX_BYTES } = loadShared();
  const parsed = parseMemeInput(rawInput);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const probe = await probeMediaUrl(parsed.media.url);
  if (!probe.ok) {
    logger.warn('Meme probe failed', { url: parsed.media.url, error: probe.error });
    return { ok: false, error: probe.error };
  }

  // Reject obvious non-media (e.g. an HTML error page served with 200).
  if (probe.contentType && !/^(image|video)\//i.test(probe.contentType)) {
    return { ok: false, error: 'That link is not an image or video.' };
  }

  if (probe.contentLength > MEME_MAX_BYTES) {
    const mb = (MEME_MAX_BYTES / (1024 * 1024)).toFixed(0);
    return { ok: false, error: `That file is larger than ${mb} MB.` };
  }

  return { ok: true, media: parsed.media };
}

module.exports = { resolveMemeInput };
