/**
 * Purpose-specific remote URL validation for main-process fetch boundaries.
 *
 * Design principle: authorization/provenance beats HTTPS-only rules.
 * localhost, LAN, and self-hosted http(s) remain valid for subscribed catalogs.
 *
 * DNS rebinding is not fully mitigated here — hostname checks alone cannot prevent
 * all rebinding attacks. Documented limitation; do not expand into a full network framework.
 */

/** @typedef {'subscribe-catalog' | 'refresh-catalog' | 'fetch-song-manifest' | 'probe-song-availability' | 'youtube-oembed' | 'soundcloud-oembed' | 'soundcloud-shortlink' | 'flow-song-page' | 'flow-public-clip' | 'meme-media'} UrlPurpose */

/** @typedef {'user-initiated' | 'catalog-context' | 'song-context' | 'none'} UrlProvenance */

const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

function parseHttpUrl(raw) {
  try {
    return new URL(String(raw || '').trim());
  } catch {
    return null;
  }
}

function isLoopbackHost(hostname) {
  const h = hostname.toLowerCase();
  return h === 'localhost' || h.endsWith('.localhost') || h === '127.0.0.1' || h === '::1' || h === '[::1]';
}

function parseIpv4(hostname) {
  const parts = hostname.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return null;
  }
  return parts;
}

function isPrivateOrLocalAddress(hostname) {
  if (isLoopbackHost(hostname)) return true;

  const ipv4 = parseIpv4(hostname);
  if (ipv4) {
    const [a, b] = ipv4;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 127) return true;
    return false;
  }

  const h = hostname.toLowerCase();
  if (h.endsWith('.local')) return true;
  if (h.endsWith('.internal')) return true;

  return false;
}

/**
 * @param {string} url
 * @param {{ purpose: UrlPurpose, provenance?: UrlProvenance }} options
 */
function validateRemoteUrl(url, options) {
  const parsed = parseHttpUrl(url);
  if (!parsed) {
    return { ok: false, code: 'URL_INVALID', error: 'Invalid URL.' };
  }

  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    return { ok: false, code: 'URL_SCHEME', error: 'URL must use http or https.' };
  }

  const provenance = options.provenance || 'none';
  const isPrivate = isPrivateOrLocalAddress(parsed.hostname);

  switch (options.purpose) {
    case 'subscribe-catalog':
    case 'refresh-catalog':
      return { ok: true, url: parsed.href, provenance };

    case 'fetch-song-manifest':
      if (provenance === 'catalog-context' || provenance === 'user-initiated') {
        return { ok: true, url: parsed.href, provenance };
      }
      if (isPrivate) {
        return {
          ok: false,
          code: 'URL_PROVENANCE',
          error: 'Manifest fetch to private or local targets requires catalog context.',
        };
      }
      return { ok: true, url: parsed.href, provenance };

    case 'probe-song-availability':
      if (provenance === 'song-context' || provenance === 'catalog-context') {
        return { ok: true, url: parsed.href, provenance };
      }
      return {
        ok: false,
        code: 'URL_PROVENANCE',
        error: 'Availability probe requires song or catalog context.',
      };

    case 'youtube-oembed': {
      const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
      if (host === 'youtube.com' && parsed.pathname === '/oembed') {
        return { ok: true, url: parsed.href, provenance };
      }
      return {
        ok: false,
        code: 'URL_HOST',
        error: 'YouTube metadata must use the public oEmbed endpoint.',
      };
    }

    case 'soundcloud-oembed': {
      const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
      if (host === 'soundcloud.com' && parsed.pathname === '/oembed') {
        return { ok: true, url: parsed.href, provenance };
      }
      return {
        ok: false,
        code: 'URL_HOST',
        error: 'SoundCloud metadata must use the public oEmbed endpoint.',
      };
    }

    case 'soundcloud-shortlink': {
      const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
      if (host === 'on.soundcloud.com') {
        return { ok: true, url: parsed.href, provenance };
      }
      if (host === 'soundcloud.com' || host === 'm.soundcloud.com') {
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (parts.length === 2 && parts[0] && parts[1] && parts[1].toLowerCase() !== 'sets') {
          return { ok: true, url: parsed.href, provenance };
        }
      }
      return {
        ok: false,
        code: 'URL_HOST',
        error: 'SoundCloud short link resolution must land on a public track page.',
      };
    }

    case 'flow-song-page': {
      const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
      if (host === 'flowmusic.app' && /^\/song\/[0-9a-f-]{36}\/?$/i.test(parsed.pathname)) {
        return { ok: true, url: parsed.href, provenance };
      }
      return {
        ok: false,
        code: 'URL_HOST',
        error: 'Google Flow metadata must use a public flowmusic.app song page.',
      };
    }

    case 'flow-public-clip': {
      if (parsed.hostname !== 'storage.googleapis.com') {
        return { ok: false, code: 'URL_HOST', error: 'Google Flow clip must use storage.googleapis.com.' };
      }
      if (!parsed.pathname.startsWith('/producer-app-public/clips/')) {
        return {
          ok: false,
          code: 'URL_HOST',
          error: 'Google Flow clip must use the public producer-app-public bucket.',
        };
      }
      if (parsed.pathname.includes('producer-app-private')) {
        return { ok: false, code: 'URL_HOST', error: 'Private Google Flow clips are not supported.' };
      }
      if ([...parsed.searchParams.keys()].some((key) => key.startsWith('X-Goog-'))) {
        return { ok: false, code: 'URL_HOST', error: 'Signed Google Flow URLs are not supported.' };
      }
      if (!/^\/producer-app-public\/clips\/[0-9a-f-]{36}\.m4a$/i.test(parsed.pathname)) {
        return { ok: false, code: 'URL_HOST', error: 'Google Flow clip path must be a public .m4a file.' };
      }
      return { ok: true, url: parsed.href, provenance };
    }

    case 'meme-media': {
      // Host pastes a direct media URL into the VC controller Meme Field.
      // Require explicit user provenance and block private/local targets to
      // avoid turning the Meme Field into an SSRF probe against the host's LAN.
      if (provenance !== 'user-initiated') {
        return {
          ok: false,
          code: 'URL_PROVENANCE',
          error: 'Meme links must be user-initiated.',
        };
      }
      if (isPrivate) {
        return {
          ok: false,
          code: 'URL_PROVENANCE',
          error: 'Meme links must point to a public URL.',
        };
      }
      return { ok: true, url: parsed.href, provenance };
    }

    default:
      return { ok: false, code: 'URL_PURPOSE', error: 'Unknown URL validation purpose.' };
  }
}

module.exports = {
  validateRemoteUrl,
  isPrivateOrLocalAddress,
  parseHttpUrl,
};
