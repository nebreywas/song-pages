/**
 * Root Artist editor — identity and catalog context.
 *
 * Link fields use local draft state and save the full links object together.
 * Per-field immediate saves raced and could overwrite sibling links in SQLite.
 */

import { useEffect, useRef, useState } from 'react';

import type { Artist2Artist } from '@shared/artist2';

import { useDebouncedCallback } from './useDebouncedCallback';

const LINK_KEYS = ['website', 'instagram', 'spotify', 'youtube'] as const;
type LinkKey = (typeof LINK_KEYS)[number];

function emptyLinks(): Record<LinkKey, string> {
  return { website: '', instagram: '', spotify: '', youtube: '' };
}

function linksFromArtist(artist: Artist2Artist): Record<LinkKey, string> {
  const base = emptyLinks();
  for (const key of LINK_KEYS) {
    base[key] = artist.payload.links?.[key] ?? '';
  }
  return base;
}

type ArtistEditorProps = {
  artist: Artist2Artist;
  onChangeName: (name: string) => void;
  onPatchPayload: (payload: Record<string, unknown>) => void;
};

export function ArtistEditor({ artist, onChangeName, onPatchPayload }: ArtistEditorProps) {
  const [name, setName] = useState(artist.name);
  const [bio, setBio] = useState(artist.payload.bio ?? '');
  const [slug, setSlug] = useState(artist.payload.slug ?? '');
  const [deploySiteUrl, setDeploySiteUrl] = useState(artist.payload.deploySiteUrl ?? '');
  const [homeHeadline, setHomeHeadline] = useState(artist.payload.site?.homeHeadline ?? '');
  const [homeIntro, setHomeIntro] = useState(artist.payload.site?.homeIntro ?? '');
  const [links, setLinks] = useState<Record<LinkKey, string>>(() => linksFromArtist(artist));

  const bioRef = useRef(bio);
  const slugRef = useRef(slug);
  const deploySiteUrlRef = useRef(deploySiteUrl);
  const homeHeadlineRef = useRef(homeHeadline);
  const homeIntroRef = useRef(homeIntro);
  const linksRef = useRef(links);
  bioRef.current = bio;
  slugRef.current = slug;
  deploySiteUrlRef.current = deploySiteUrl;
  homeHeadlineRef.current = homeHeadline;
  homeIntroRef.current = homeIntro;
  linksRef.current = links;

  // Reset draft only when switching artists — not on every save (updatedAt).
  useEffect(() => {
    setName(artist.name);
    setBio(artist.payload.bio ?? '');
    setSlug(artist.payload.slug ?? '');
    setDeploySiteUrl(artist.payload.deploySiteUrl ?? '');
    setHomeHeadline(artist.payload.site?.homeHeadline ?? '');
    setHomeIntro(artist.payload.site?.homeIntro ?? '');
    setLinks(linksFromArtist(artist));
  }, [artist.id]);

  const debouncedName = useDebouncedCallback(onChangeName, 400);
  const debouncedPayload = useDebouncedCallback(() => {
    onPatchPayload({
      bio: bioRef.current,
      slug: slugRef.current.trim() || undefined,
      deploySiteUrl: deploySiteUrlRef.current.trim() || undefined,
      site: {
        homeHeadline: homeHeadlineRef.current.trim(),
        homeIntro: homeIntroRef.current.trim(),
      },
      links: { ...linksRef.current },
    });
  }, 400);

  return (
    <div className="a2-editor">
      <header className="a2-editor-header">
        <div>
          <p className="a2-kicker">Artist</p>
          <input
            className="a2-title-input"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              debouncedName(event.target.value);
            }}
            aria-label="Artist name"
          />
        </div>
      </header>

      <section className="a2-section">
        <h3>Identity</h3>
        <p className="a2-help">
          The Artist owns the catalog. Songs, Containers (Albums / Playlists), and Content all belong
          to this root. Slug and deploy URL feed compile when you are ready to publish.
        </p>
        <label className="a2-field">
          <span>URL slug (compile)</span>
          <input
            value={slug}
            placeholder="auto from name if empty"
            onChange={(event) => {
              setSlug(event.target.value);
              slugRef.current = event.target.value;
              debouncedPayload();
            }}
          />
        </label>
        <label className="a2-field">
          <span>Deploy site URL</span>
          <input
            value={deploySiteUrl}
            placeholder="https://your-cdn.example.com"
            onChange={(event) => {
              setDeploySiteUrl(event.target.value);
              deploySiteUrlRef.current = event.target.value;
              debouncedPayload();
            }}
          />
        </label>
        <label className="a2-field">
          <span>Biography</span>
          <textarea
            rows={6}
            value={bio}
            onChange={(event) => {
              setBio(event.target.value);
              debouncedPayload();
            }}
          />
        </label>
      </section>

      <section className="a2-section">
        <h3>Site (stub)</h3>
        <p className="a2-help">
          Home Page presentation fields for later Pages / compile. Not emitted into the static site
          yet — authoring surface only.
        </p>
        <label className="a2-field">
          <span>Home headline</span>
          <input
            value={homeHeadline}
            placeholder="Welcome to …"
            onChange={(event) => {
              setHomeHeadline(event.target.value);
              homeHeadlineRef.current = event.target.value;
              debouncedPayload();
            }}
          />
        </label>
        <label className="a2-field">
          <span>Home intro</span>
          <textarea
            rows={4}
            value={homeIntro}
            placeholder="Short landing blurb"
            onChange={(event) => {
              setHomeIntro(event.target.value);
              homeIntroRef.current = event.target.value;
              debouncedPayload();
            }}
          />
        </label>
      </section>

      <section className="a2-section">
        <h3>Links</h3>
        {LINK_KEYS.map((key) => (
          <label key={key} className="a2-field">
            <span>{key}</span>
            <input
              value={links[key]}
              onChange={(event) => {
                const value = event.target.value;
                setLinks((prev) => {
                  const next = { ...prev, [key]: value };
                  linksRef.current = next;
                  return next;
                });
                debouncedPayload();
              }}
            />
          </label>
        ))}
      </section>
    </div>
  );
}
