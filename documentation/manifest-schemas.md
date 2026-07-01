# Song Pages Manifest Schemas (PoC v1)

Song Pages sites publish three JSON manifest files alongside HTML, CSS, JS, and HLS media. These are **compiler outputs** — generated artifacts, not hand-edited source files.

Every manifest includes `schemaVersion: 1` for forward compatibility.

## File Locations

| File | Location | Primary consumer |
|------|----------|------------------|
| `songpages-artist.json` | Site root | Identity, bio, social links |
| `songpages-catalog.json` | Site root | **Listener import** — playable library |
| `songpages-song.json` | `songs/{slug}/` | Rich song metadata (lazy-loaded) |

Example site root: `https://sawyerhouse-music.b-cdn.net`

```
/
  songpages-artist.json
  songpages-catalog.json
  index.html
  songs/
    ma-cherie.html
    ma-cherie/
      songpages-song.json
      manifest.m3u8
      cover.jpg
```

## Path Conventions

- **Catalog manifest** uses paths relative to the site root (e.g. `songs/ma-cherie/manifest.m3u8`).
- **Song manifest** uses paths relative to the song folder where convenient (e.g. `cover.jpg`, `manifest.m3u8`).
- **Listener** resolves all paths against the normalized subscription base URL entered at import time.
- **`siteRoot`** in manifests is helpful metadata. If it conflicts with the subscription URL, the listener prefers the subscription URL and may log a warning.

## Cache Busting

Manifests include `buildVersion` echoing the compiler's cache-bust token. Asset URLs in HTML use `?v=buildVersion`. The listener may append the same query parameter when fetching HLS manifests during development on Bunny.net CDN.

---

## songpages-artist.json

Artist identity and presentation. Not the primary playback index.

```json
{
  "schemaVersion": 1,
  "siteRoot": "https://sawyerhouse-music.b-cdn.net",
  "artistSlug": "sawyerhousemusic",
  "artistName": "Ben Sawyer",
  "bio": "Artist biography text.",
  "photoUrl": "images/artist.jpg",
  "social": {
    "instagram": "",
    "tiktok": "",
    "youtube": "",
    "spotify": "",
    "soundcloud": ""
  },
  "catalogUrl": "songpages-catalog.json",
  "buildVersion": "20260628T212857Z-454af1b",
  "generatedAt": "2026-06-28T21:28:57.000Z"
}
```

---

## songpages-catalog.json

Primary file for listener import. Contains enough data to list and play songs without fetching individual song manifests.

```json
{
  "schemaVersion": 1,
  "siteRoot": "https://sawyerhouse-music.b-cdn.net",
  "artistSlug": "sawyerhousemusic",
  "artistName": "Ben Sawyer",
  "artistPhotoUrl": "images/artist.jpg",
  "buildVersion": "20260628T212857Z-454af1b",
  "generatedAt": "2026-06-28T21:28:57.000Z",
  "songs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "slug": "ma-cherie",
      "title": "Ma chérie",
      "album": "",
      "year": "",
      "caption": "Fun song with a bit of French",
      "coverUrl": "songs/ma-cherie/cover.jpg",
      "pageUrl": "songs/ma-cherie.html",
      "playbackUrl": "songs/ma-cherie/manifest.m3u8",
      "songManifestUrl": "songs/ma-cherie/songpages-song.json",
      "playbackScope": "full",
      "playbackQuality": "high"
    }
  ]
}
```

### Catalog song fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Stable UUID from editor |
| `slug` | yes | URL slug |
| `title` | yes | Display title |
| `album` | no | Album name |
| `year` | no | Release year string |
| `caption` | no | Short description |
| `coverUrl` | no | Root-relative cover image |
| `pageUrl` | yes | Root-relative canonical song page |
| `playbackUrl` | yes | Root-relative HLS manifest |
| `songManifestUrl` | yes | Root-relative song manifest |
| `playbackScope` | yes | `full` or `preview` |
| `playbackQuality` | yes | `high` or `degraded` |

Lyrics and about text live in `songpages-song.json` only.

---

## songpages-song.json

Rich per-song metadata. Loaded lazily when the listener needs detail beyond the catalog entry.

```json
{
  "schemaVersion": 1,
  "siteRoot": "https://sawyerhouse-music.b-cdn.net",
  "artistSlug": "sawyerhousemusic",
  "artistName": "Ben Sawyer",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "slug": "ma-cherie",
  "title": "Ma chérie",
  "album": "",
  "year": "",
  "caption": "Fun song with a bit of French",
  "about": "Longer description of the song.",
  "lyrics": "Song lyrics text.",
  "coverUrl": "cover.jpg",
  "extraImageUrl": "extra.jpg",
  "pageUrl": "../ma-cherie.html",
  "playbackUrl": "manifest.m3u8",
  "streamLinks": {
    "youtube": "",
    "spotify": "",
    "soundcloud": ""
  },
  "playbackScope": "full",
  "playbackQuality": "high",
  "buildVersion": "20260628T212857Z-454af1b"
}
```

---

## Listener Import Flow

1. User enters artist base URL (e.g. `https://sawyerhouse-music.b-cdn.net`).
2. Listener normalizes trailing slashes.
3. Listener fetches `{baseUrl}/songpages-catalog.json`.
4. Optionally fetches `{baseUrl}/songpages-artist.json` for enriched artist metadata.
5. Catalog songs are stored in SQLite with resolved absolute URLs for pages and playback.
6. Playback uses HLS via `playbackUrl`. Canonical song page loads in embedded webview via `pageUrl`.
7. `songpages-song.json` fetched only when needed (not required for basic playback).

## Debug Fallback (Not Canonical)

Sites compiled before this manifest system may embed playlist JSON in `#site-playlist` inside HTML. The listener may support parsing this for development only. The intended architecture is manifest-based.

---

## Desktop App Presentation Mode

When Listener Mode displays a canonical song page, the app loads:

```
{songPageUrl}?songpagesApp=1&v=...
```

Compiled templates detect `songpagesApp=1` and add class `songpages-app-client` to `<html>`. Elements marked `data-songpages-client-chrome` are hidden. The site footer player script exits early.

**Electron does not inject styles or scripts into guest pages** — presentation is compiler-controlled.

See `documentation/guest-rendering-security.md` for the full trust model, CSP, and navigation policy.

| Hidden in app mode | Reason |
|---------------------|--------|
| `#site-player-footer` | Desktop app has its own player |
| Home button | App provides library navigation |
| Inline play buttons | App controls playback |

Standalone browser visits (no query param) show the full site unchanged.
