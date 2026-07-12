# SoundCloud Provider — Investigation & Implementation

**Status:** Shipped (custom playlists) · **Last updated:** July 2026  
**Canonical architecture:** [third-party-integrations.md](./third-party-integrations.md)

SoundCloud is the second **embed + parent API** integration after YouTube. It passes the [autoplay at track selection](./third-party-integrations.md#6-autoplay-at-track-selection-required-for-track-level-integrations) bar via the official [Widget API](https://developers.soundcloud.com/docs/api/html5-widget).

---

## Product scope

| In scope | Out of scope |
|----------|----------------|
| Single **public track** paste on custom playlists | Artist profiles, sets, playlists |
| Transport-driven play/pause/seek/next | REST API `stream` URLs (OAuth / Artist Pro) |
| oEmbed intake (no API key) | Private or `secret_token` links |
| `on.soundcloud.com` short links | Channel browsing, comments, reposts |

---

## Intake path

```
Paste URL → canonicalize (shared/providers/soundcloud)
         → resolve short link if needed (main process, soundcloud-shortlink)
         → oEmbed (soundcloud-oembed purpose)
         → parse track id from embed HTML
         → snapshot in user_playlist_songs
```

### Accepted URL shapes

- `https://soundcloud.com/{artist}/{track-slug}` — exactly two path segments; second segment must not be a reserved word (`sets`, `likes`, …)
- `https://on.soundcloud.com/…` — resolved via HEAD redirect chain in main process

### oEmbed

Endpoint: `https://soundcloud.com/oembed?format=json&url={permalink}&maxheight=81`

No API key required. Returns `title`, `author_name`, `thumbnail_url`, and `html` with an iframe `src`.

**Track id extraction:** Parse `api.soundcloud.com/tracks/{numericId}` from the oEmbed `html` field. Reject when the embed references `playlists/` instead.

**Non-obvious quirk:** oEmbed iframe `src` often **URL-encodes slashes** inside the widget query param:

```
api.soundcloud.com%2Ftracks%2F2154619488
```

The parser must accept both literal `/tracks/` and `%2Ftracks%2F` forms. See `shared/providers/soundcloud/metadata.ts` and `metadata.test.ts`.

### Snapshot fields

| Field | Value |
|-------|--------|
| `external_id` | Numeric SoundCloud track id |
| `page_url` | `songpages-soundcloud:track/{id}` |
| `playback_url` | Public permalink (share export) |
| `song_manifest_url` | `songpages-soundcloud:manifest/{id}` |
| `playback_scope` | `soundcloud` |
| `duration_seconds` | `null` at intake — backfilled on first play from Widget API |

---

## Playback

### Main listener

- Component: `SoundcloudPlayer` — loads `w.soundcloud.com/player/api.js`, creates iframe + `SC.Widget`
- Widget URL: `visual=false`, `show_artwork=false` (~81px compact bar)
- On `READY`: `widget.play()` when transport requests play (retry on timeout 0 — same pattern as YouTube)
- Events: `PLAY`, `PAUSE`, `PLAY_PROGRESS`, `FINISH`, `ERROR`
- `seekTo` uses **milliseconds** (Widget API); transport bar uses seconds

### VC Mode

When VC is open and the active layout has a **visualizer** cell, SoundCloud tracks swap the Butterchurn slot for SoundCloud's built-in waveform visual:

- VC component: `VcSoundcloudPlayer` — `visual=true`, full cell
- Main `SoundcloudSongPage` shows capture note; no dual widget
- Timing/ended/duration reported to main via `soundcloudTiming`, `soundcloudEnded`, `soundcloudDuration` IPC (parallel to YouTube)

Iframe audio cannot feed the Web Audio analyser — same tradeoff as YouTube.

### CSP

Both listener and VC windows allow:

- `script-src` … `https://w.soundcloud.com`
- `frame-src` … `https://w.soundcloud.com`

---

## Autoplay gate — result

**Passed.** Selecting a playlist row starts playback through Song Pages transport without a second click inside the widget. Repeat-one, seek, and queue advance on `FINISH` work via Widget API.

Contrast with [Bandcamp](./third-party-integrations.md#bandcamp--evaluated-2026-not-shipped) (rejected — no parent `play()` API).

---

## Code map

| Layer | Path |
|-------|------|
| Canonicalize + metadata | `shared/providers/soundcloud/` |
| Feature re-exports | `shared/soundcloud/soundcloudFeature.ts` |
| Main-process intake | `electron/listener/soundcloud/soundcloudSongs.js` |
| IPC | `listener:addSoundcloudSongToUserPlaylist` |
| UI intake | `SoundcloudAddPopover` |
| Song page | `SoundcloudSongPage` |
| Player | `src/listener/soundcloud/SoundcloudPlayer.tsx` |
| VC player | `src/vc-window/VcSoundcloudPlayer.tsx` |
| Transport branch | `ListenerMode` — `isSoundcloudSong()`, `isWidgetTransportSong()` |
| Share export | `shareableSongLink.ts` → `playback_url` permalink |

---

## Tests

- `shared/providers/soundcloud/canonicalize.test.ts` — URL classes
- `shared/providers/soundcloud/metadata.test.ts` — oEmbed HTML parsing (encoded slashes)
- `shared/soundcloud/soundcloudFeature.test.ts` — snapshot detection
- `electron/net/urlPolicy.test.mjs` — `soundcloud-oembed`, `soundcloud-shortlink`

---

## User-facing errors

| Situation | Message |
|-----------|---------|
| Profile URL | “That link is an artist profile, not a single track.” |
| Set / playlist | “SoundCloud playlists and sets are not supported — paste one track URL.” |
| oEmbed failure | “Could not load metadata for that SoundCloud link. Paste a public track URL.” |
| Not a track embed | “That SoundCloud link is not a single public track…” |

---

## Future (not planned)

- Direct `<audio>` via REST `stream` URLs — requires Artist Pro app + OAuth; not authorized “paste a share link” workflow
- SoundCloud playlists as import sources
- Background metadata refresh
