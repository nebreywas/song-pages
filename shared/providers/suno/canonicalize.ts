import { SUNO_CLIP_UUID_RE, SUNO_PROVIDER_ID, SUNO_SHARE_HOSTS, SUNO_SHORT_SHARE_TOKEN_RE } from './constants.ts';

export type SunoCanonicalRef = {
  provider: typeof SUNO_PROVIDER_ID;
  /** Present when known; short share links resolve this in main process. */
  clipUuid: string | null;
  externalId: string;
  /** Original share URL when clip UUID is not yet known. */
  shareUrl?: string;
};

export type SunoCanonicalizeResult =
  | { ok: true; ref: SunoCanonicalRef }
  | { ok: false; error: string };

function buildRef(clipUuid: string): SunoCanonicalRef {
  const normalized = clipUuid.toLowerCase();
  return {
    provider: SUNO_PROVIDER_ID,
    clipUuid: normalized,
    externalId: normalized,
  };
}

function buildShortShareRef(shareUrl: string, token: string): SunoCanonicalRef {
  return {
    provider: SUNO_PROVIDER_ID,
    clipUuid: null,
    externalId: token,
    shareUrl,
  };
}

function parseSunoSharePath(pathname: string): { clipUuid: string } | { shortToken: string } | null {
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

/** Sync shape check — main process may still resolve redirects and HTML fallbacks. */
export function canonicalizeSunoInput(input: string): SunoCanonicalizeResult {
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

    if ('clipUuid' in sharePath) {
      return { ok: true, ref: buildRef(sharePath.clipUuid) };
    }

    return { ok: true, ref: buildShortShareRef(parsed.toString(), sharePath.shortToken) };
  } catch {
    return { ok: false, error: 'That does not look like a valid Suno link or clip UUID.' };
  }
}
