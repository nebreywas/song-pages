import type { ProviderIntakeResult } from '../types.ts';
import {
  SOUNDCLOUD_PAGE_PREFIX,
  SOUNDCLOUD_PROVIDER_ID,
  SOUNDCLOUD_RESERVED_SEGMENTS,
} from './constants.ts';

export type SoundcloudCanonicalRef = {
  provider: typeof SOUNDCLOUD_PROVIDER_ID;
  /** Public track permalink — canonical share URL. */
  permalink: string;
  externalId: string;
  canonicalWatchUrl: string;
  canonicalPageUrl: string;
  /** True when intake must follow redirects (on.soundcloud.com short links). */
  needsRedirectResolve: boolean;
};

export type SoundcloudDiscardedContext = {
  queryParams: Record<string, string>;
  notes: string[];
};

export type SoundcloudCanonicalizeSuccess = {
  ok: true;
  ref: SoundcloudCanonicalRef;
  discarded: SoundcloudDiscardedContext;
};

export type SoundcloudCanonicalizeResult =
  | SoundcloudCanonicalizeSuccess
  | { ok: false; error: string };

const SOUNDCLOUD_HOSTS = new Set(['soundcloud.com', 'm.soundcloud.com']);
const SHORT_LINK_HOSTS = new Set(['on.soundcloud.com']);

function canonicalPermalink(user: string, slug: string): string {
  return `https://soundcloud.com/${user}/${slug}`;
}

function canonicalPageUrl(trackId: string): string {
  return `${SOUNDCLOUD_PAGE_PREFIX}${trackId}`;
}

function buildRefFromPermalink(permalink: string, trackIdPlaceholder = 'pending'): SoundcloudCanonicalRef {
  return {
    provider: SOUNDCLOUD_PROVIDER_ID,
    permalink,
    externalId: trackIdPlaceholder,
    canonicalWatchUrl: permalink,
    canonicalPageUrl: canonicalPageUrl(trackIdPlaceholder),
    needsRedirectResolve: false,
  };
}

function collectDiscardedParams(url: URL): SoundcloudDiscardedContext {
  const queryParams: Record<string, string> = {};
  const notes: string[] = [];

  for (const [key, value] of url.searchParams.entries()) {
    queryParams[key] = value;
    if (key.startsWith('utm_') || key === 'fbclid' || key === 'gclid') {
      notes.push(`tracking (${key})`);
    } else {
      notes.push(`non-canonical query param (${key}=${value})`);
    }
  }

  return { queryParams, notes };
}

function parseTrackPermalinkFromUrl(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (!SOUNDCLOUD_HOSTS.has(host)) return null;

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length !== 2) return null;

  const [user, slug] = parts;
  if (!user || !slug) return null;
  if (SOUNDCLOUD_RESERVED_SEGMENTS.has(slug.toLowerCase())) return null;

  return canonicalPermalink(user, slug);
}

/** True when input looks like a SoundCloud track URL (pre-oEmbed). */
export function validateSoundcloudInput(input: string): boolean {
  return canonicalizeSoundcloudInput(input).ok;
}

/**
 * Reduce pasted URLs to a public track permalink shape.
 * Numeric track id and oEmbed validation happen in main-process intake.
 */
export function canonicalizeSoundcloudInput(input: string): SoundcloudCanonicalizeResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: 'Enter a SoundCloud track URL.' };
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();

    if (SHORT_LINK_HOSTS.has(host)) {
      return {
        ok: true,
        ref: {
          provider: SOUNDCLOUD_PROVIDER_ID,
          permalink: url.href,
          externalId: 'pending',
          canonicalWatchUrl: url.href,
          canonicalPageUrl: `${SOUNDCLOUD_PAGE_PREFIX}pending`,
          needsRedirectResolve: true,
        },
        discarded: collectDiscardedParams(url),
      };
    }

    const permalink = parseTrackPermalinkFromUrl(url);
    if (!permalink) {
      if (SOUNDCLOUD_HOSTS.has(host)) {
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length === 1) {
          return { ok: false, error: 'That link is an artist profile, not a single track.' };
        }
        if (parts.includes('sets')) {
          return { ok: false, error: 'SoundCloud playlists and sets are not supported — paste one track URL.' };
        }
      }
      return { ok: false, error: 'Paste a public SoundCloud track link (soundcloud.com/artist/track-name).' };
    }

    return {
      ok: true,
      ref: buildRefFromPermalink(permalink),
      discarded: collectDiscardedParams(url),
    };
  } catch {
    return { ok: false, error: 'Enter a valid SoundCloud track URL.' };
  }
}

/** Adapter for generic provider intake call sites. */
export function canonicalizeSoundcloudProvider(
  input: string,
): ProviderIntakeResult<SoundcloudCanonicalRef> {
  const result = canonicalizeSoundcloudInput(input);
  if (!result.ok) return result;
  return { ok: true, ref: result.ref };
}

/** Attach resolved numeric track id after oEmbed intake. */
export function withSoundcloudTrackId(
  ref: SoundcloudCanonicalRef,
  trackId: string,
): SoundcloudCanonicalRef {
  return {
    ...ref,
    externalId: trackId,
    canonicalPageUrl: canonicalPageUrl(trackId),
  };
}
