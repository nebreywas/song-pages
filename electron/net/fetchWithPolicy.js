/**
 * Fetch helper with purpose-specific URL validation on each redirect hop and
 * streaming response size enforcement.
 */
const { validateRemoteUrl } = require('./urlPolicy');

const DEFAULT_MAX_BYTES = 1024 * 1024;

/**
 * @param {string} initialUrl
 * @param {{
 *   purpose: import('./urlPolicy').UrlPurpose;
 *   provenance?: import('./urlPolicy').UrlProvenance;
 *   maxBytes?: number;
 *   maxRedirects?: number;
 *   timeoutMs?: number;
 *   method?: string;
 *   headers?: Record<string, string>;
 *   expectJson?: boolean;
 *   skipBody?: boolean;
 * }} options
 */
async function fetchWithUrlPolicy(initialUrl, options) {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRedirects = options.maxRedirects ?? 5;
  const timeoutMs = options.timeoutMs ?? 30000;
  const method = options.method ?? 'GET';
  const expectJson = options.expectJson !== false;
  const skipBody = options.skipBody === true;

  let currentUrl = initialUrl;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const check = validateRemoteUrl(currentUrl, {
      purpose: options.purpose,
      provenance: options.provenance,
    });
    if (!check.ok) {
      throw new Error(check.error || 'URL policy rejected request.');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(currentUrl, {
        method,
        redirect: 'manual',
        signal: controller.signal,
        headers: options.headers,
      });
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`Redirect (${response.status}) missing Location header.`);
      }
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${currentUrl}`);
    }

    // Availability probes only need status — do not buffer HTML/HLS bodies.
    if (method === 'HEAD' || skipBody) {
      if (response.body) {
        try {
          await response.body.cancel();
        } catch {
          // Body may already be consumed — probe result stands on response.ok.
        }
      }
      if (method === 'HEAD') {
        return { ok: true, status: response.status };
      }
      return expectJson ? null : '';
    }

    const body = response.body;
    if (!body) {
      return expectJson ? null : '';
    }

    const reader = body.getReader();
    const chunks = [];
    let total = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        throw new Error(`Response exceeds ${maxBytes} byte limit.`);
      }
      chunks.push(value);
    }

    const text = Buffer.concat(chunks).toString('utf8');
    if (!expectJson) {
      return text;
    }
    return JSON.parse(text);
  }

  throw new Error(`Too many redirects (>${maxRedirects}).`);
}

module.exports = { fetchWithUrlPolicy, DEFAULT_MAX_BYTES };
