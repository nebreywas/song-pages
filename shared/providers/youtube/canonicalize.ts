import type { ProviderIntakeResult } from '../types.ts';
import {
  YOUTUBE_PAGE_PREFIX,
  YOUTUBE_PROVIDER_ID,
  YOUTUBE_VIDEO_ID_RE,
} from './constants.ts';

export type YoutubeCanonicalRef = {
  provider: typeof YOUTUBE_PROVIDER_ID;
  /** 11-character YouTube video id. */
  videoId: string;
  externalId: string;
  /** Canonical share / playback identity — watch URL with only `v`. */
  canonicalWatchUrl: string;
  /** Internal Song Pages page key — not a public HTTP URL. */
  canonicalPageUrl: string;
};

/** Query/path context stripped during canonicalization — for debugging and future opt-ins. */
export type YoutubeDiscardedContext = {
  /** Raw query params removed from the canonical watch URL. */
  queryParams: Record<string, string>;
  /** Human-readable notes (playlist context, timestamp, etc.). */
  notes: string[];
};

export type YoutubeCanonicalizeSuccess = {
  ok: true;
  ref: YoutubeCanonicalRef;
  discarded: YoutubeDiscardedContext;
};

export type YoutubeCanonicalizeResult = YoutubeCanonicalizeSuccess | { ok: false; error: string };

const YOUTUBE_HOSTS = new Set(['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be']);

/**
 * Params we intentionally drop — Song Pages represents one video, not a YouTube session.
 *
 * - list / index / start_radio / feature / pp / si / ab_channel: playlist, radio, mix, share funnels
 * - t / start / end / time_continue: deep-link timestamps (transport starts at 0 unless we add offset later)
 * - utm_* / fbclid / gclid: tracking
 */
const ALWAYS_DISCARD_QUERY_KEYS = new Set([
  'list',
  'index',
  'start_radio',
  'feature',
  'pp',
  'si',
  'ab_channel',
  't',
  'start',
  'end',
  'time_continue',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
]);

function canonicalWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function canonicalPageUrl(videoId: string): string {
  return `${YOUTUBE_PAGE_PREFIX}${videoId}`;
}

function buildRef(videoId: string): YoutubeCanonicalRef {
  return {
    provider: YOUTUBE_PROVIDER_ID,
    videoId,
    externalId: videoId,
    canonicalWatchUrl: canonicalWatchUrl(videoId),
    canonicalPageUrl: canonicalPageUrl(videoId),
  };
}

function noteForDiscardedParam(key: string, value: string): string | null {
  if (key === 'list') return `playlist context (list=${value})`;
  if (key === 'index') return `playlist index (index=${value})`;
  if (key === 'start_radio') return 'YouTube radio / mix (start_radio)';
  if (key === 't' || key === 'start' || key === 'time_continue') {
    return `start offset (${key}=${value}) — not applied; Song Pages transport starts at 0`;
  }
  if (key === 'end') return `end offset (end=${value})`;
  if (key.startsWith('utm_') || key === 'fbclid' || key === 'gclid') return `tracking (${key})`;
  if (key === 'feature' || key === 'pp' || key === 'si' || key === 'ab_channel') {
    return `recommendation / share funnel (${key}=${value})`;
  }
  return `non-canonical query param (${key}=${value})`;
}

function collectDiscardedParams(url: URL): YoutubeDiscardedContext {
  const queryParams: Record<string, string> = {};
  const notes: string[] = [];

  for (const [key, value] of url.searchParams.entries()) {
    if (key === 'v') continue;
    queryParams[key] = value;
    const note = noteForDiscardedParam(key, value);
    if (note) notes.push(note);
  }

  // Params we do not recognize still land in queryParams; note only known buckets above.
  for (const key of Object.keys(queryParams)) {
    if (!ALWAYS_DISCARD_QUERY_KEYS.has(key) && !notes.some((n) => n.includes(`(${key}=`))) {
      notes.push(`unknown query param (${key}=${queryParams[key]})`);
    }
  }

  return { queryParams, notes };
}

function parseVideoIdFromUrl(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, '');

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0] ?? '';
    return YOUTUBE_VIDEO_ID_RE.test(id) ? id : null;
  }

  if (!YOUTUBE_HOSTS.has(host)) return null;

  const fromQuery = url.searchParams.get('v');
  if (fromQuery && YOUTUBE_VIDEO_ID_RE.test(fromQuery)) return fromQuery;

  const parts = url.pathname.split('/').filter(Boolean);
  for (const segment of ['shorts', 'embed', 'live']) {
    const index = parts.indexOf(segment);
    const id = index >= 0 ? parts[index + 1] : null;
    if (id && YOUTUBE_VIDEO_ID_RE.test(id)) return id;
  }

  return null;
}

/** True when input looks like a valid YouTube video reference. */
export function validateYoutubeInput(input: string): boolean {
  return canonicalizeYoutubeInput(input).ok;
}

/**
 * Reduce pasted URLs / ids to one canonical work reference.
 * All playlist, radio, tracking, and timestamp parameters are stripped.
 */
export function canonicalizeYoutubeInput(input: string): YoutubeCanonicalizeResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'Enter a YouTube URL or 11-character video ID.' };

  if (YOUTUBE_VIDEO_ID_RE.test(trimmed)) {
    return {
      ok: true,
      ref: buildRef(trimmed),
      discarded: { queryParams: {}, notes: [] },
    };
  }

  try {
    const url = new URL(trimmed);
    const videoId = parseVideoIdFromUrl(url);
    if (!videoId) {
      return { ok: false, error: 'Could not find a valid YouTube video ID in that URL.' };
    }

    return {
      ok: true,
      ref: buildRef(videoId),
      discarded: collectDiscardedParams(url),
    };
  } catch {
    return { ok: false, error: 'Enter a valid YouTube URL or 11-character video ID.' };
  }
}

/** Adapter for generic provider intake call sites. */
export function canonicalizeYoutubeProvider(
  input: string,
): ProviderIntakeResult<YoutubeCanonicalRef> {
  const result = canonicalizeYoutubeInput(input);
  if (!result.ok) return result;
  return { ok: true, ref: result.ref };
}
