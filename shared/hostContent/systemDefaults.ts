/**
 * Song Pages system fallback values when song + host fallbacks are unavailable.
 * Asset paths are app-bundled; text values match archive/specs/Host-content-design.md.
 */

import type { HostFallbackSlotId } from './constants';

export const SYSTEM_FALLBACK_ASSETS = {
  cover: 'src/assets/fallbacks/cover-fallback.png',
  'video-cover': 'src/assets/fallbacks/videocover-fallback.mp4',
  // Reuse the same bundled MP4 until a dedicated lyrics-video asset is added.
  'lyrics-video': 'src/assets/fallbacks/videocover-fallback.mp4',
  'artist-image': 'src/assets/fallbacks/artistimage-fallback.png',
} as const;

export const SYSTEM_FALLBACK_TEXT: Record<
  Extract<
    HostFallbackSlotId,
    'lyrics' | 'about-song' | 'artist-name' | 'song-title' | 'main-genre' | 'additional-genres'
  >,
  string
> = {
  lyrics: `La la la, la-la la la
Something should be sung here
La la la, la-la la la
But the words did not appear

Maybe there was heartbreak
Maybe there was rain
Maybe someone left someone
Then came back again

La la la, la-la la la
The lyrics weren't provided
La la la, la-la la la
So these will stand beside it

Sing a little louder
No one seems to mind
Every song needs something
Moving down the line

La la la, la-la la la
La la la again

Please enjoy the music
We're doing what we can
Sing whatever comes to mind
We fully understand

La la la, la-la la la
We've finally reached the end`,
  'about-song':
    "Normally we'd tell you something amazing about this song but we couldn't find any content provided by the artist or your host(s). Please accept our apology, but we're pretty certain they're the greatest songwriter of all time—and incredibly modest as well.",
  'artist-name': 'Currently Anonymous',
  'song-title': 'Greatest Song Ever! (After Freebird!)',
  'main-genre': 'Only the shadow knows!',
  'additional-genres': 'Our experts are still debating this.',
};

/**
 * Lyrics shown in VC when embed-based tracks (YouTube, SoundCloud) have no lyrics text.
 * Replaces the humorous system default — these providers never ship lyrics in our manifest.
 */
export const EMBED_PROVIDER_LYRICS_FALLBACK_TEXT = {
  youtube:
    "This content doesn't share lyrics text at this time. For YouTube you can turn on closed captions.",
  soundcloud:
    "This content doesn't share lyrics text at this time. For SoundCloud you'll just have to do without.",
} as const;

export const FALLBACK_SLOT_LABELS: Record<HostFallbackSlotId, string> = {
  cover: 'Cover Fallback',
  'video-cover': 'Video cover fallback',
  'lyrics-video': 'Lyrics video fallback',
  lyrics: 'Lyrics Fallback',
  'about-song': 'About song fallback',
  'artist-name': 'Artist name fallback',
  'artist-image': 'Artist image fallback',
  'song-title': 'Song name fallback',
  'main-genre': 'Main genre fallback',
  'additional-genres': 'Additional genres fallback',
};
