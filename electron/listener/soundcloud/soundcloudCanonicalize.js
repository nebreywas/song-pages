/**
 * SoundCloud canonicalization for the main process — keep in sync with
 * shared/providers/soundcloud/canonicalize.ts
 */

const SOUNDCLOUD_PAGE_PREFIX = 'songpages-soundcloud:track/';
const SOUNDCLOUD_PROVIDER_ID = 'soundcloud';

const SOUNDCLOUD_HOSTS = new Set(['soundcloud.com', 'm.soundcloud.com']);
const SHORT_LINK_HOSTS = new Set(['on.soundcloud.com']);

const RESERVED_SEGMENTS = new Set([
  'sets',
  'albums',
  'likes',
  'reposts',
  'followers',
  'following',
  'comments',
  'popular-tracks',
  'tracks',
  'groups',
  'stations',
]);

function canonicalPermalink(user, slug) {
  return `https://soundcloud.com/${user}/${slug}`;
}

function collectDiscardedParams(url) {
  const queryParams = {};
  const notes = [];

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

function parseTrackPermalinkFromUrl(url) {
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (!SOUNDCLOUD_HOSTS.has(host)) return null;

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length !== 2) return null;

  const [user, slug] = parts;
  if (!user || !slug) return null;
  if (RESERVED_SEGMENTS.has(slug.toLowerCase())) return null;

  return canonicalPermalink(user, slug);
}

function canonicalizeSoundcloudInput(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed) return { ok: false, error: 'Enter a SoundCloud track URL.' };

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
          return {
            ok: false,
            error: 'SoundCloud playlists and sets are not supported — paste one track URL.',
          };
        }
      }
      return {
        ok: false,
        error: 'Paste a public SoundCloud track link (soundcloud.com/artist/track-name).',
      };
    }

    return {
      ok: true,
      ref: {
        provider: SOUNDCLOUD_PROVIDER_ID,
        permalink,
        externalId: 'pending',
        canonicalWatchUrl: permalink,
        canonicalPageUrl: `${SOUNDCLOUD_PAGE_PREFIX}pending`,
        needsRedirectResolve: false,
      },
      discarded: collectDiscardedParams(url),
    };
  } catch {
    return { ok: false, error: 'Enter a valid SoundCloud track URL.' };
  }
}

function withSoundcloudTrackId(ref, trackId) {
  return {
    ...ref,
    externalId: trackId,
    canonicalPageUrl: `${SOUNDCLOUD_PAGE_PREFIX}${trackId}`,
  };
}

module.exports = {
  canonicalizeSoundcloudInput,
  withSoundcloudTrackId,
};
