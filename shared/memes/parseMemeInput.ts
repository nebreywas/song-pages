/**
 * Validate a host-pasted meme link. The link MUST point directly at a media
 * file — there is no page/link resolution and no provider awareness. We accept
 * animated (or static) images and short videos by file extension:
 *
 *   images → .gif .png .apng .webp   (rendered in an <img>)
 *   videos → .mp4 .webm .m4v         (rendered in a <video>)
 *
 * Pure — does no network I/O. Existence and size are checked separately by the
 * main-process probe (electron/memes/resolveMeme.js).
 */
import type { MemeMediaType, ResolvedMeme } from './types';

export type MemeInputResult =
  | { ok: false; error: string }
  | { ok: true; media: ResolvedMeme };

/** file extension → how the projector should render it. */
const MEDIA_EXTENSIONS: Record<string, MemeMediaType> = {
  gif: 'gif',
  apng: 'gif',
  png: 'gif',
  webp: 'gif',
  mp4: 'video',
  webm: 'video',
  m4v: 'video',
};

function fileExtension(pathname: string): string | null {
  const lastSegment = pathname.split('/').pop() ?? '';
  const dot = lastSegment.lastIndexOf('.');
  if (dot < 0 || dot === lastSegment.length - 1) return null;
  return lastSegment.slice(dot + 1).toLowerCase();
}

/**
 * Parse and validate a pasted media link.
 * @param raw The raw string from the Meme Field.
 */
export function parseMemeInput(raw: string): MemeInputResult {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return { ok: false, error: 'Enter a media link.' };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: 'That is not a valid URL.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Links must start with http(s).' };
  }

  const ext = fileExtension(parsed.pathname);
  if (!ext || !(ext in MEDIA_EXTENSIONS)) {
    return {
      ok: false,
      error: 'Link must point directly to a .gif, .png, .webp, .mp4, or .webm file.',
    };
  }

  return {
    ok: true,
    media: { mediaType: MEDIA_EXTENSIONS[ext], url: parsed.href },
  };
}
