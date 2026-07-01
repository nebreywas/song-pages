import { useEffect, useMemo, useState } from 'react';
import { renderMarkdownPreview } from '../lib/markdownPreview';
import { getApp } from '../lib/bridge';
import type { ArtistRow } from '../types/app';
import {
  formatArtistSongCount,
  listArtistSocialLinks,
  parseArtistSocial,
  resolveArtistPhotoUrl,
} from './artistDisplay';
import { SocialPlatformIcon } from './SocialIcons';

type ArtistInfoPanelProps = {
  artist: ArtistRow;
  busy: boolean;
  onRemove: () => void;
  onProfileUpdated?: (artist: ArtistRow) => void;
};

function subscriptionSiteUrl(artist: ArtistRow): string {
  return artist.site_url?.trim() || artist.site_root_normalized?.trim() || '';
}

/** Manifest-driven artist profile — shown instead of the site index in Listener Mode. */
export function ArtistInfoPanel({ artist, busy, onRemove, onProfileUpdated }: ArtistInfoPanelProps) {
  const [profileArtist, setProfileArtist] = useState(artist);
  /** Only show loading copy when we have no bio yet — avoids flash on background refresh. */
  const [awaitingInitialProfile, setAwaitingInitialProfile] = useState(!artist.artist_bio?.trim());

  // Reset immediately when the user selects a different artist.
  useEffect(() => {
    setProfileArtist(artist);
    setAwaitingInitialProfile(!artist.artist_bio?.trim());
  }, [artist.id]);

  // Background manifest refresh — keyed by artist id only (never re-run because parent re-rendered).
  useEffect(() => {
    const app = getApp();
    if (!app?.listener.ensureArtistManifest) return;

    let cancelled = false;
    const artistId = artist.id;

    void app.listener.ensureArtistManifest(artistId).then((result) => {
      if (cancelled) return;
      setAwaitingInitialProfile(false);
      if (!result.ok || !result.data || result.data.id !== artistId) return;
      setProfileArtist(result.data);
      onProfileUpdated?.(result.data);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onProfileUpdated intentionally omitted
  }, [artist.id]);

  const photoUrl = resolveArtistPhotoUrl(profileArtist);
  const socialLinks = listArtistSocialLinks(parseArtistSocial(profileArtist.artist_social_json));
  const songLabel = formatArtistSongCount(profileArtist.song_count);
  const bio = profileArtist.artist_bio?.trim() ?? '';
  const bioHtml = useMemo(() => (bio ? renderMarkdownPreview(bio) : ''), [bio]);
  const siteUrl = subscriptionSiteUrl(profileArtist);

  const openArtistSite = () => {
    if (!siteUrl) return;
    void getApp()?.openExternal(siteUrl);
  };

  return (
    <div className="artist-info-panel">
      <div className="artist-info-header">
        {photoUrl ? (
          <img className="artist-info-photo" src={photoUrl} alt="" />
        ) : (
          <div className="artist-info-photo artist-info-photo-placeholder" aria-hidden="true" />
        )}
        <div className="artist-info-heading">
          <div className="artist-info-title-row">
            <h2>{profileArtist.artist_name}</h2>
            <button type="button" className="btn danger artist-info-remove" onClick={onRemove} disabled={busy}>
              Remove artist
            </button>
          </div>
          <p className="artist-info-meta">{songLabel}</p>
        </div>
      </div>

      {awaitingInitialProfile && !bio ? (
        <p className="artist-info-bio empty">Loading artist profile…</p>
      ) : bioHtml ? (
        <div className="artist-info-bio markdown-body" dangerouslySetInnerHTML={{ __html: bioHtml }} />
      ) : (
        <p className="artist-info-bio empty">No bio provided.</p>
      )}

      {socialLinks.length ? (
        <nav className="artist-info-social" aria-label="Social">
          {socialLinks.map((link) => (
            <a
              key={link.url}
              className="social-icon-btn"
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
              title={link.label}
            >
              <SocialPlatformIcon platform={link.platform} />
            </a>
          ))}
        </nav>
      ) : null}

      {siteUrl ? (
        <p className="artist-info-subscription">
          You are subscribed to this artist via:{' '}
          <button type="button" className="link-btn artist-info-site-link" onClick={openArtistSite}>
            {siteUrl}
          </button>
        </p>
      ) : null}
    </div>
  );
}
