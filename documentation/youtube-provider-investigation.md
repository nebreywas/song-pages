# YouTube Provider — Intake & Metadata Investigation

**Status:** Architectural investigation (post-spike)  
**Date:** July 2026  
**Context:** The embedded YouTube playback experiment succeeded. This document answers what we can normalize, what metadata is officially available, and how YouTube should fit a generic provider intake model without making Song Pages provider-centric.

---

## Executive summary

| Question | Answer |
|----------|--------|
| Can we reliably normalize YouTube URLs? | **Yes.** Reduce any supported paste to `{ provider: youtube, videoId }` plus a canonical `https://www.youtube.com/watch?v={id}` URL. |
| Can we retrieve useful metadata via official mechanisms? | **Partially at intake; duration at playback.** oEmbed gives title + channel; thumbnails are derivable from video id; IFrame API gives duration after embed loads. |
| Can we cache metadata to feel native? | **Yes.** Store title, artist/channel, cover, duration on the playlist snapshot row; refresh optionally, not on every play. |
| Does this generalize? | **Yes.** A small `ProviderIntake` contract (`validate` → `canonicalize` → `extractMetadata` → separate playback adapter) keeps ListenerMode playlist-centric. |

**Code anchors (investigation + minimal implementation):**

- Generic types: `shared/providers/types.ts`
- YouTube intake: `shared/providers/youtube/`
- Renderer/feature re-exports: `shared/youtube/youtubeFeature.ts`
- Main-process mirror: `electron/listener/youtube/youtubeCanonicalize.js`

---

## Philosophy (playlist-centric, not provider-centric)

Song Pages treats a YouTube video as **one playlist entry** — a single work with a stable id — not as a YouTube browsing session.

**In scope**

- Play one video inside the official embed
- Advance via Song Pages transport when the video ends
- Open provider-specific navigation (More videos, channel, etc.) in the **system browser**

**Out of scope (defer to youtube.com)**

- Channel browsing, comments, recommendations, YouTube playlists, radio/mix (`start_radio`), end screens

Normalization intentionally **discards** parameters that imply session context rather than a single work.

---

# Part 1 — Canonical YouTube URLs

## Canonical representation

After intake, Song Pages stores:

```
Provider:   youtube
Video ID:   VIDEOID          (11-char external_id)
Page key:   songpages-youtube:watch/VIDEOID
Watch URL:  https://www.youtube.com/watch?v=VIDEOID
Scope:      playback_scope = 'youtube'
```

Only **`v`** is preserved in the public watch URL. Everything else is stripped.

## Supported input formats

| Format | Example | Extracted id |
|--------|---------|--------------|
| Bare id | `ExeQM08TwbE` | `ExeQM08TwbE` |
| Watch URL | `https://www.youtube.com/watch?v=VIDEOID` | `v` query param |
| Short URL | `https://youtu.be/VIDEOID` | path segment |
| Mobile | `https://m.youtube.com/watch?v=VIDEOID` | `v` query param |
| Music | `https://music.youtube.com/watch?v=VIDEOID` | `v` query param |
| Shorts | `https://www.youtube.com/shorts/VIDEOID` | path segment |
| Embed | `https://www.youtube.com/embed/VIDEOID` | path segment |
| Live path | `https://www.youtube.com/live/VIDEOID` | path segment |

## Parameters — preserve vs discard

### Preserved

| Item | Reason |
|------|--------|
| `v` (video id) | Primary identity of the work |
| Path forms that resolve to the same id | Equivalent entry points to one video |

### Discarded (with reasoning)

| Parameter(s) | Reason |
|--------------|--------|
| `list`, `index` | YouTube **playlist context** — Song Pages has its own playlist order |
| `start_radio` | **Radio / mix** — provider session, not one work |
| `feature`, `pp`, `si`, `ab_channel` | **Share / recommendation funnels** — not part of work identity |
| `t`, `start`, `time_continue`, `end` | **Deep-link timestamps** — Song Pages transport starts at 0 unless we later add an explicit `startOffsetSeconds` field |
| `utm_*`, `fbclid`, `gclid` | **Tracking** — no semantic value for the library |
| Unknown query params | Stripped from canonical URL; recorded in `discarded.queryParams` for debugging |

### Timestamp policy (explicit decision)

We **discard** `t` / `start` at intake for v1.

- **Why:** Playlist transport owns position; importing a timestamp from a share link is surprising when the row appears mid-playlist.
- **Future:** Optional `start_offset_seconds` on the snapshot if product wants “start at 0:42” behavior, applied once at `playSong` via IFrame `seekTo` — still playlist-controlled, not URL-controlled.

## Discarded context audit trail

`canonicalizeYoutubeInput()` returns:

```ts
{
  ok: true,
  ref: { provider, videoId, canonicalWatchUrl, canonicalPageUrl, ... },
  discarded: { queryParams: Record<string, string>, notes: string[] }
}
```

This supports logging and future UI (“Imported as single video; playlist/radio context ignored”) without persisting YouTube session state.

---

# Part 2 — Metadata investigation

## Mechanisms evaluated

### 1. oEmbed (official, no API key) — **intake time, main process**

Endpoint: `https://www.youtube.com/oembed?url={watchUrl}&format=json`

| Field | Available | Notes |
|-------|-----------|-------|
| Title | ✅ | `title` |
| Channel / author | ✅ | `author_name`, `author_url` |
| Thumbnail | ✅ | `thumbnail_url` (often `hqdefault` or similar) |
| Duration | ❌ | Not in oEmbed |
| Video id verification | ✅ | Implicit via URL passed to oEmbed |

**When:** On add-to-playlist (already implemented in `youtubeSongs.js`).  
**Failure:** Fallback title “YouTube Video”, artist “YouTube”; row still created.

### 2. Thumbnail CDN (official URL pattern) — **intake, no network**

`https://img.youtube.com/vi/{videoId}/hqdefault.jpg`

| Field | Available |
|-------|-----------|
| Thumbnail | ✅ Always derivable from id |

**When:** At intake (and as fallback if oEmbed omits `thumbnail_url`).  
**Note:** Higher-res variants exist (`maxresdefault`, `mqdefault`) but availability varies per video; `hqdefault` is a safe default.

### 3. IFrame Player API — **playback time, renderer**

Used by `YoutubePlayer.tsx` after embed `onReady`.

| Field | Available | Requires playback |
|-------|-----------|---------------------|
| Duration | ✅ | `getDuration()` — often 0 until media loads; reliable once playing |
| Current time | ✅ | `getCurrentTime()` |
| Title / author | ⚠️ Partial | `getVideoData()` → `{ video_id, title, author }` — availability varies; not required if oEmbed ran at intake |
| Video id | ✅ | `getVideoData().video_id` or known from snapshot |

**When:** First successful play (or `onReady` + `PLAYING`). Persist `duration_seconds` to snapshot (already wired via `handleYoutubeDuration` → `persistSongDuration`).

### 4. YouTube Data API v3 — **not recommended for embed model**

Requires API key, quota, OAuth for some fields, separate ToS/quota management. Provides rich metadata (duration, tags, category, statistics) but **outside** the embedding model we're targeting. Defer unless product needs bulk catalog features.

### 5. HTML scraping — **avoid**

Violates intended integration model, brittle, ToS risk. Not considered.

## Recommended metadata pipeline

```
┌─────────────────┐     oEmbed + derived thumb     ┌──────────────────────┐
│  User pastes    │ ─────────────────────────────► │  Playlist snapshot   │
│  URL / id       │     title, channel, cover      │  user_playlist_songs │
└─────────────────┘                                └──────────┬───────────┘
                                                                │
                     IFrame getDuration() on first play         │
                                                                ▼
                                                     duration_seconds cached
```

| Field | Source | When | Cache location |
|-------|--------|------|----------------|
| `external_id` | Canonicalize | Intake | `external_id` |
| `title` | oEmbed → fallback | Intake | `title` |
| `artist_name` | oEmbed `author_name` → fallback | Intake | `artist_name` |
| `cover_url` | oEmbed or `hqdefault` URL | Intake | `cover_url` |
| `duration_seconds` | IFrame `getDuration()` | First play | `duration_seconds` |
| `playback_url` | Canonical watch URL | Intake | `playback_url` |
| `page_url` | Internal `songpages-youtube:watch/{id}` | Intake | `page_url` |

## Refresh policy (recommended)

| Event | Refresh? |
|-------|----------|
| Every play | **No** — unnecessary network |
| Re-add duplicate video | **No change** — return existing row |
| User explicit “Refresh metadata” (future) | **Yes** — re-run oEmbed |
| Title empty at intake (oEmbed failed) | **Optional lazy retry** on next add attempt only |
| Duration still null after play | **Yes** — write once when IFrame reports &gt; 0 |

Automatic daily refresh is **not** recommended — titles rarely change and quota/policy matter for future APIs.

---

# Part 3 — Capability report

## What is immediately available (no playback)

- Video id (from URL canonicalization)
- Canonical watch URL
- Thumbnail URL (derived)
- Title + channel (oEmbed, network permitting)

## What requires playback / embed

- Duration (IFrame API)
- Reliable current time / ended events
- Optional `getVideoData()` confirmation of title/author

## Browser / Electron limitations

| Topic | Limitation |
|-------|------------|
| Autoplay | May require user gesture in some environments; Electron desktop generally OK after user initiated play |
| IFrame API | Player not fully callable until `onReady`; methods guarded in `YoutubePlayer` |
| Permissions Policy | YouTube probes `compute-pressure`; delegate via iframe `allow` + parent policy (already patched) |
| CSP | Must allow `script-src` / `frame-src` for `youtube.com` / `s.ytimg.com` |
| Console noise | `web-share`, `compute-pressure` violations from YT scripts — benign |

## API limitations

| API | Limitation |
|-----|------------|
| oEmbed | No duration; no view counts; fails offline |
| IFrame | No comments, no related-video control beyond `rel=0` playerVars; embed-only surface |
| Data API v3 | Not in current architecture |

## Autoplay & embedding

- Use official **IFrame Player API** with `enablejsapi=1` (injected by widget)
- `autoplay=1` in `playerVars` when Song Pages transport starts play
- Video must remain **visible** (ads / Premium behavior)
- Provider chrome that escapes embed (More videos, etc.) → **system browser** (current behavior — keep)

## ToS / policy considerations (high level, not legal advice)

- **Allowed:** IFrame embed per [YouTube API Terms](https://developers.google.com/youtube/terms/api-services-terms-of-service); oEmbed for metadata; linking out to full YouTube experience
- **Avoid:** Downloading/separating audio stream; stripping ads from embed; scraping watch pages; circumventing embed restrictions
- **Premium / signed-in:** Subscriber ad-free inside embed may require future Google identity work — out of scope for v1

---

# Part 4 — Provider architecture (isolated, generalizable)

## Contract

```ts
type ProviderIntake<TRef, TMetadata> = {
  provider: ProviderId;
  validate(input: string): boolean;
  canonicalize(input: string): ProviderIntakeResult<TRef>;
  extractMetadata(ref: TRef): Promise<ProviderMetadataResult<TMetadata>>;
};

// Playback is intentionally separate — renderer creates IFrame / audio graph:
// createPlaybackProvider(ref) → handled by ListenerMode branch + provider player component
```

YouTube is the **first implementation** under `shared/providers/youtube/`.

## Boundary rules

| Layer | Knows about YouTube? |
|-------|----------------------|
| `shared/providers/youtube/*` | Yes — all provider logic here |
| `shared/youtube/youtubeFeature.ts` | Thin re-exports for stable imports |
| `electron/listener/youtube/*` | Main-process intake + oEmbed only |
| `ListenerMode` | Only `isYoutubeSong()` branch + `YoutubeSongPage` — no URL parsing |
| Playlist export / queue | Uses generic `SongRow` fields + `playback_scope` |

## Future providers (…)

Same shape:

1. `canonicalize` → stable `externalId` + internal `page_url` scheme  
2. `extractMetadata` → intake-time official API  
3. `playback_scope` + dedicated player component or direct audio URL  
4. No changes to shuffle/repeat/VC transport except scope checks  

**Autoplay gate:** Track-level paste integrations must start playback from Song Pages transport without a second click inside the provider widget — see [third-party-integrations.md §6](./third-party-integrations.md#6-autoplay-at-track-selection-required-for-track-level-integrations). **Bandcamp** was evaluated and rejected. **SoundCloud** shipped — see [soundcloud-provider-investigation.md](./soundcloud-provider-investigation.md).

Suno demo remains separate historically but could migrate to `providers/suno` later.

---

# Success criteria — answered

1. **Normalize URLs?** Yes — implemented in `canonicalizeYoutubeInput`, tested, wired to intake.  
2. **Official metadata?** Title, channel, thumbnail at intake; duration at first play via IFrame.  
3. **Cache for native feel?** Yes — snapshot columns + duration backfill on play.  
4. **Generalize?** Yes — `shared/providers/types.ts` + YouTube as reference implementation; ListenerMode stays transport-centric.

---

## Suggested next steps (not in this investigation)

- Optional intake toast when `discarded.notes` mentions playlist/radio/timestamp  
- Explicit “Refresh metadata” action on custom playlist rows  
- `getVideoData()` backfill if oEmbed failed and iframe reports title  
- Provider registry map: `playback_scope` → player component factory  
- Document provider pattern in `documentation/provider-architecture.md` when second provider lands
