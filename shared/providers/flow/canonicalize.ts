import type { ProviderIntakeResult } from '../types.ts';
import {
  FLOW_CLIP_UUID_RE,
  FLOW_PAGE_PREFIX,
  FLOW_PRIVATE_CLIP_PATH_MARKER,
  FLOW_PROVIDER_ID,
  FLOW_PUBLIC_CLIP_HOST,
  FLOW_PUBLIC_CLIP_PATH_PREFIX,
  FLOW_PUBLIC_SHARE_BASE,
  FLOW_SONG_PAGE_HOSTS,
} from './constants.ts';

export type FlowCanonicalRef = {
  provider: typeof FLOW_PROVIDER_ID;
  clipId: string;
  externalId: string;
  /** Public share page on flowmusic.app. */
  canonicalShareUrl: string;
  /** Internal Song Pages page key — not a public HTTP URL. */
  canonicalPageUrl: string;
  /** Direct public GCS clip URL when known at intake. */
  publicClipUrl: string;
};

export type FlowCanonicalizeResult =
  | { ok: true; ref: FlowCanonicalRef }
  | { ok: false; error: string };

function buildRef(clipId: string): FlowCanonicalRef {
  const normalized = clipId.toLowerCase();
  return {
    provider: FLOW_PROVIDER_ID,
    clipId: normalized,
    externalId: normalized,
    canonicalShareUrl: `${FLOW_PUBLIC_SHARE_BASE}${normalized}`,
    canonicalPageUrl: `${FLOW_PAGE_PREFIX}${normalized}`,
    publicClipUrl: `https://${FLOW_PUBLIC_CLIP_HOST}${FLOW_PUBLIC_CLIP_PATH_PREFIX}${normalized}.m4a`,
  };
}

function isSignedGcsUrl(url: URL): boolean {
  return [...url.searchParams.keys()].some((key) => key.startsWith('X-Goog-'));
}

function parseClipIdFromShareUrl(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (!FLOW_SONG_PAGE_HOSTS.has(host)) return null;

  const parts = url.pathname.split('/').filter(Boolean);
  const songIndex = parts.indexOf('song');
  const id = songIndex >= 0 ? parts[songIndex + 1] : null;
  return id && FLOW_CLIP_UUID_RE.test(id) ? id.toLowerCase() : null;
}

function parseClipIdFromPublicClipUrl(url: URL): string | null {
  if (url.hostname !== FLOW_PUBLIC_CLIP_HOST) return null;
  if (!url.pathname.startsWith(FLOW_PUBLIC_CLIP_PATH_PREFIX)) return null;
  if (url.pathname.includes(FLOW_PRIVATE_CLIP_PATH_MARKER)) return null;
  if (isSignedGcsUrl(url)) {
    return null;
  }

  const file = url.pathname.slice(FLOW_PUBLIC_CLIP_PATH_PREFIX.length);
  const match = /^([0-9a-f-]{36})\.m4a$/i.exec(file);
  return match ? match[1].toLowerCase() : null;
}

/** True when input looks like a valid public Flow clip reference. */
export function validateFlowInput(input: string): boolean {
  return canonicalizeFlowInput(input).ok;
}

/**
 * Reduce pasted Flow share URLs / UUIDs to one canonical public work reference.
 * Private buckets, signed URLs, and non-public clip paths are rejected.
 */
export function canonicalizeFlowInput(input: string): FlowCanonicalizeResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: 'Enter a Google Flow song URL or clip UUID.' };
  }

  if (FLOW_CLIP_UUID_RE.test(trimmed)) {
    return { ok: true, ref: buildRef(trimmed) };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: 'Enter a valid Google Flow song URL or clip UUID.' };
  }

  if (url.protocol !== 'https:') {
    return { ok: false, error: 'Google Flow links must use https.' };
  }

  if (url.pathname.includes(FLOW_PRIVATE_CLIP_PATH_MARKER)) {
    return {
      ok: false,
      error: 'Private Google Flow clips are not supported — paste a public flowmusic.app song link.',
    };
  }

  if (isSignedGcsUrl(url)) {
    return {
      ok: false,
      error: 'Temporary signed Google Flow URLs are not supported — paste a public flowmusic.app song link.',
    };
  }

  const fromShare = parseClipIdFromShareUrl(url);
  if (fromShare) return { ok: true, ref: buildRef(fromShare) };

  const fromPublicClip = parseClipIdFromPublicClipUrl(url);
  if (fromPublicClip) return { ok: true, ref: buildRef(fromPublicClip) };

  return {
    ok: false,
    error: 'Could not find a valid public Google Flow song in that URL.',
  };
}

export function canonicalizeFlowProvider(input: string): ProviderIntakeResult<FlowCanonicalRef> {
  return canonicalizeFlowInput(input);
}
