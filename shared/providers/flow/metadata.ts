import type { FlowCanonicalRef } from './canonicalize.ts';

export type FlowWorkMetadata = {
  title: string;
  artistName: string;
  coverUrl: string | null;
  playbackUrl: string;
  soundPrompt: string;
  lyrics: string;
  durationSeconds: number | null;
};

export function fallbackFlowMetadata(ref: FlowCanonicalRef): FlowWorkMetadata {
  return {
    title: 'Google Flow Song',
    artistName: 'Google Flow',
    coverUrl: null,
    playbackUrl: ref.publicClipUrl,
    soundPrompt: '',
    lyrics: '',
    durationSeconds: null,
  };
}

/** Parse dehydrated Next.js page data from a public Flow song page. */
export function parseFlowSongPagePayload(
  html: string,
  clipId: string,
): { song: FlowPageSong | null; author: FlowPageAuthor | null } {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!match) return { song: null, author: null };

  let data: FlowNextData;
  try {
    data = JSON.parse(match[1]) as FlowNextData;
  } catch {
    return { song: null, author: null };
  }

  const queries = data?.props?.sdc?.queryClient?.queries ?? [];
  let song: FlowPageSong | null = null;
  let author: FlowPageAuthor | null = null;

  for (const query of queries) {
    const payload = query?.state?.data;
    if (!payload || typeof payload !== 'object') continue;

    if (!song && payload.id === clipId && typeof payload.title === 'string') {
      song = payload as FlowPageSong;
      continue;
    }

    if (!author && typeof payload.username === 'string') {
      author = payload as FlowPageAuthor;
    }
  }

  return { song, author };
}

export function metadataFromFlowPage(
  ref: FlowCanonicalRef,
  song: FlowPageSong,
  author: FlowPageAuthor | null,
): FlowWorkMetadata {
  const durationRaw = song.duration?.value;
  const durationSeconds =
    typeof durationRaw === 'string' && durationRaw.trim()
      ? Number(durationRaw)
      : typeof durationRaw === 'number'
        ? durationRaw
        : null;

  const lyricsText = song.lyrics?.value?.text ?? '';
  const soundPrompt = song.operation?.sound_prompt?.trim() ?? '';

  const playbackUrl = song.audio_url?.trim() || ref.publicClipUrl;
  const coverUrl = song.image_url?.trim() || null;

  return {
    title: song.title?.trim() || 'Google Flow Song',
    artistName: author?.username?.trim() || 'Google Flow',
    coverUrl,
    playbackUrl,
    soundPrompt,
    lyrics: typeof lyricsText === 'string' ? lyricsText : '',
    durationSeconds: Number.isFinite(durationSeconds) && durationSeconds! > 0 ? durationSeconds : null,
  };
}

type FlowNextData = {
  props?: {
    sdc?: {
      queryClient?: {
        queries?: Array<{
          state?: { data?: FlowPageSong | FlowPageAuthor };
        }>;
      };
    };
  };
};

export type FlowPageSong = {
  id: string;
  title?: string;
  audio_url?: string | null;
  image_url?: string | null;
  duration?: { status?: string; value?: string | number | null };
  lyrics?: { status?: string; value?: { text?: string | null } | null };
  operation?: { sound_prompt?: string | null } | null;
};

export type FlowPageAuthor = {
  username?: string | null;
  fallback_name?: string | null;
};

/** GCS XML error bodies use NoSuchKey when a clip is private or unavailable. */
export function isFlowClipUnavailableBody(body: string): boolean {
  const text = body.trim();
  if (!text.startsWith('<?xml') && !text.startsWith('<Error')) return false;
  return text.includes('<Code>NoSuchKey</Code>') || text.includes('No such object');
}
