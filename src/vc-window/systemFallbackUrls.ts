import { SYSTEM_FALLBACK_ASSETS } from '@shared/hostContent';

/** Vite-resolved URLs for bundled system fallback assets (empty until files are added). */
const rawUrls = import.meta.glob<string>('../assets/fallbacks/*', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** One bundled file may back multiple system fallback slots. */
const FILE_TO_KEYS: Record<string, Array<keyof typeof SYSTEM_FALLBACK_ASSETS>> = {
  'cover-fallback.png': ['cover'],
  'artistimage-fallback.png': ['artist-image'],
  'videocover-fallback.mp4': ['video-cover', 'lyrics-video'],
};

const FALLBACK_URLS: Partial<Record<keyof typeof SYSTEM_FALLBACK_ASSETS, string>> = {};

for (const [path, url] of Object.entries(rawUrls)) {
  const filename = path.split('/').pop() ?? '';
  const keys = FILE_TO_KEYS[filename];
  if (!keys) continue;
  for (const key of keys) {
    FALLBACK_URLS[key] = url;
  }
}

export function systemFallbackUrl(key: keyof typeof SYSTEM_FALLBACK_ASSETS): string | null {
  return FALLBACK_URLS[key] ?? null;
}
