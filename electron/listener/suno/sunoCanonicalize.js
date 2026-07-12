/**
 * Suno canonicalization for the main process — keep in sync with
 * shared/providers/suno/canonicalize.ts
 */

const SUNO_PROVIDER_ID = 'suno';
const SUNO_CLIP_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SUNO_SHARE_HOSTS = new Set(['suno.com', 'www.suno.com']);
const SUNO_SHORT_SHARE_TOKEN_RE = /^[A-Za-z0-9_-]{8,32}$/;

function buildRef(clipUuid) {
  const normalized = clipUuid.toLowerCase();
  return {
    provider: SUNO_PROVIDER_ID,
    clipUuid: normalized,
    externalId: normalized,
  };
}

function buildShortShareRef(shareUrl, token) {
  return {
    provider: SUNO_PROVIDER_ID,
    clipUuid: null,
    externalId: token,
    shareUrl,
  };
}

function parseSunoSharePath(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  const songIndex = parts.findIndex((part) => part.toLowerCase() === 'song');
  if (songIndex >= 0) {
    const candidate = parts[songIndex + 1];
    if (candidate && SUNO_CLIP_UUID_RE.test(candidate)) {
      return { clipUuid: candidate };
    }
    return null;
  }

  if (parts[0].toLowerCase() === 's') {
    const token = parts[1];
    if (token && SUNO_SHORT_SHARE_TOKEN_RE.test(token)) {
      return { shortToken: token };
    }
  }

  return null;
}

/** Sync shape check — resolveInputToSongId may still follow redirects for short links. */
function canonicalizeSunoInput(input) {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Paste a Suno share link or clip UUID.' };
  }

  if (SUNO_CLIP_UUID_RE.test(trimmed)) {
    return { ok: true, ref: buildRef(trimmed) };
  }

  try {
    const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    if (!SUNO_SHARE_HOSTS.has(parsed.hostname.toLowerCase())) {
      return { ok: false, error: 'That is not a recognized Suno song link.' };
    }

    const sharePath = parseSunoSharePath(parsed.pathname);
    if (!sharePath) {
      return { ok: false, error: 'Could not find a Suno song id in that link.' };
    }

    if (sharePath.clipUuid) {
      return { ok: true, ref: buildRef(sharePath.clipUuid) };
    }

    return { ok: true, ref: buildShortShareRef(parsed.toString(), sharePath.shortToken) };
  } catch {
    return { ok: false, error: 'That does not look like a valid Suno link or clip UUID.' };
  }
}

module.exports = {
  canonicalizeSunoInput,
};
