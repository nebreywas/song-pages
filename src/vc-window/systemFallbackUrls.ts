import { SYSTEM_FALLBACK_ASSETS } from '@shared/hostContent';

/** Vite-resolved URLs for bundled system fallback assets (empty until files are added). */
const rawUrls = import.meta.glob<string>('../assets/fallbacks/*', {
  eager: true,
  query: '?url',
  import: 'default',
});

const FILE_TO_KEY: Record<string, keyof typeof SYSTEM_FALLBACK_ASSETS> = {
  'cover-fallback.png': 'cover',
  'artistimage-fallback.png': 'artist-image',
  'videocover-fallback.mp4': 'video-cover',
};

const FALLBACK_URLS: Partial<Record<keyof typeof SYSTEM_FALLBACK_ASSETS, string>> = {};

for (const [path, url] of Object.entries(rawUrls)) {
  const filename = path.split('/').pop() ?? '';
  const key = FILE_TO_KEY[filename];
  if (key) FALLBACK_URLS[key] = url;
}

export function systemFallbackUrl(key: keyof typeof SYSTEM_FALLBACK_ASSETS): string | null {
  return FALLBACK_URLS[key] ?? null;
}
