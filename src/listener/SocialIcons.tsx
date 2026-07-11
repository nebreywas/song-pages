import type { ComponentType, ReactNode } from 'react';
import type { ArtistSocialIds } from '../types/app';
import { SOUNDCLOUD_ICON_PATHS, SOUNDCLOUD_ICON_VIEW_BOX } from '@shared/social/soundcloudIcon';

type SocialIconProps = {
  className?: string;
};

/** Same brand glyphs as compiler/socialIcons.ts — flat silhouette style for artist sites. */
function SocialIconSvg({ className, children }: SocialIconProps & { children: ReactNode }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      {children}
    </svg>
  );
}

export function IconSocialInstagram({ className }: SocialIconProps) {
  return (
    <SocialIconSvg className={className}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 11-2.881.001 1.44 1.44 0 012.881-.001z" />
    </SocialIconSvg>
  );
}

export function IconSocialTiktok({ className }: SocialIconProps) {
  return (
    <SocialIconSvg className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </SocialIconSvg>
  );
}

export function IconSocialYoutube({ className }: SocialIconProps) {
  return (
    <SocialIconSvg className={className}>
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </SocialIconSvg>
  );
}

export function IconSocialSpotify({ className }: SocialIconProps) {
  return (
    <SocialIconSvg className={className}>
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </SocialIconSvg>
  );
}

export function IconSocialSoundcloud({ className }: SocialIconProps) {
  return (
    <svg className={className} viewBox={SOUNDCLOUD_ICON_VIEW_BOX} aria-hidden="true" fill="currentColor">
      {SOUNDCLOUD_ICON_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

const SOCIAL_ICON_COMPONENTS: Record<keyof ArtistSocialIds, ComponentType<SocialIconProps>> = {
  instagram: IconSocialInstagram,
  tiktok: IconSocialTiktok,
  youtube: IconSocialYoutube,
  spotify: IconSocialSpotify,
  soundcloud: IconSocialSoundcloud,
};

export function SocialPlatformIcon({
  platform,
  className,
}: {
  platform: keyof ArtistSocialIds;
  className?: string;
}) {
  const Icon = SOCIAL_ICON_COMPONENTS[platform];
  return Icon ? <Icon className={className} /> : null;
}
