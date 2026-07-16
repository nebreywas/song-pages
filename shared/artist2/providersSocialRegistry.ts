/**
 * Versioned provider / social / distribution registry for Song link rows.
 * Logos are optional — a missing asset must never block adding a link.
 */

export type ProviderCapability = 'streaming' | 'social' | 'distribution';

export type ProviderSocialRegistryEntry = {
  id: string;
  name: string;
  domain?: string;
  description?: string;
  /** Optional relative or absolute logo path; may be null. */
  logoAsset?: string | null;
  capabilities: ProviderCapability[];
  enabled: boolean;
  sortOrder: number;
};

/**
 * Single shared registry (streaming + social + distribution).
 * Expand in place; settings UI can filter by capability later.
 */
export const PROVIDERS_SOCIAL_REGISTRY: ProviderSocialRegistryEntry[] = [
  // Streaming
  { id: 'suno', name: 'Suno', domain: 'suno.com', capabilities: ['streaming'], enabled: true, sortOrder: 10 },
  { id: 'spotify', name: 'Spotify', domain: 'spotify.com', capabilities: ['streaming'], enabled: true, sortOrder: 20 },
  { id: 'bandcamp', name: 'Bandcamp', domain: 'bandcamp.com', capabilities: ['streaming'], enabled: true, sortOrder: 30 },
  { id: 'soundcloud', name: 'SoundCloud', domain: 'soundcloud.com', capabilities: ['streaming', 'distribution'], enabled: true, sortOrder: 40 },
  { id: 'google-flow', name: 'Google Flow Music', domain: 'music.youtube.com', capabilities: ['streaming'], enabled: true, sortOrder: 50 },
  { id: 'apple-music', name: 'Apple Music', domain: 'music.apple.com', capabilities: ['streaming'], enabled: true, sortOrder: 60 },
  { id: 'deezer', name: 'Deezer', domain: 'deezer.com', capabilities: ['streaming'], enabled: true, sortOrder: 70 },
  { id: 'tidal', name: 'Tidal', domain: 'tidal.com', capabilities: ['streaming'], enabled: true, sortOrder: 80 },
  { id: 'youtube', name: 'YouTube', domain: 'youtube.com', capabilities: ['streaming'], enabled: true, sortOrder: 90 },
  { id: 'amazon-music', name: 'Amazon Music', domain: 'music.amazon.com', capabilities: ['streaming'], enabled: true, sortOrder: 100 },
  { id: 'tencent-music', name: 'Tencent Music', domain: 'y.qq.com', capabilities: ['streaming'], enabled: true, sortOrder: 110 },
  // Social
  { id: 'instagram', name: 'Instagram', domain: 'instagram.com', capabilities: ['social'], enabled: true, sortOrder: 200 },
  { id: 'facebook', name: 'Facebook', domain: 'facebook.com', capabilities: ['social'], enabled: true, sortOrder: 210 },
  { id: 'twitter-x', name: 'Twitter / X', domain: 'x.com', capabilities: ['social'], enabled: true, sortOrder: 220 },
  { id: 'tiktok', name: 'TikTok', domain: 'tiktok.com', capabilities: ['social'], enabled: true, sortOrder: 230 },
  { id: 'bluesky', name: 'Bluesky', domain: 'bsky.app', capabilities: ['social'], enabled: true, sortOrder: 240 },
  { id: 'mastodon', name: 'Mastodon', domain: 'mastodon.social', capabilities: ['social'], enabled: true, sortOrder: 250 },
  // Distribution (private by default in the editor)
  { id: 'cd-baby', name: 'CD Baby', domain: 'cdbaby.com', capabilities: ['distribution'], enabled: true, sortOrder: 300 },
  { id: 'distrokid', name: 'DistroKid', domain: 'distrokid.com', capabilities: ['distribution'], enabled: true, sortOrder: 310 },
  { id: 'soundcloud-distribution', name: 'SoundCloud Distribution', domain: 'soundcloud.com', capabilities: ['distribution'], enabled: true, sortOrder: 320 },
];

export function providersByCapability(
  capability: ProviderCapability,
): ProviderSocialRegistryEntry[] {
  return PROVIDERS_SOCIAL_REGISTRY.filter(
    (entry) => entry.enabled && entry.capabilities.includes(capability),
  ).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function findProviderById(id: string | null | undefined): ProviderSocialRegistryEntry | null {
  if (!id) return null;
  return PROVIDERS_SOCIAL_REGISTRY.find((entry) => entry.id === id) ?? null;
}

/** Display name with domain fallback when no logo is available. */
export function providerDisplayLabel(entry: ProviderSocialRegistryEntry): string {
  if (entry.domain) return `${entry.name} (${entry.domain})`;
  return entry.name;
}
