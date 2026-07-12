# Third-Party Integrations

**Status:** Canonical architecture · **Last updated:** July 2026  
**Audience:** Contributors adding or maintaining external music sources (Suno, YouTube, SoundCloud, Google Flow, future providers)

**Related:** [persistence-philosophy.md](./persistence-philosophy.md) (snapshot playlists), [security-model-and-completed-actions.md](./security-model-and-completed-actions.md) (trust boundaries), [youtube-provider-investigation.md](./youtube-provider-investigation.md) (YouTube intake detail), [soundcloud-provider-investigation.md](./soundcloud-provider-investigation.md) (SoundCloud intake + VC detail), [missing-information-rule.md](./missing-information-rule.md) (fallback copy for missing fields)

---

## Purpose

Song Pages is **playlist-centric**, not provider-centric. Third-party integrations exist so listeners can add **individual works** from external services into custom playlists (or dedicated demo playlists) without turning Song Pages into a browser for those platforms.

Each integration answers two questions:

> *Can we represent this pasted link as a single playable track with enough metadata to feel native in the library?*

> *When the user selects that track in a playlist, does playback start through Song Pages transport — without a second click inside the provider’s widget?*

If either answer is no — because the link is private, signed, session-scoped, blocked by the provider, or playback cannot be driven from our transport bar — we **reject intake** and tell the user what kind of URL *is* supported. We do not attempt workarounds.

---

## Standing rules

These rules apply to every current and future integration.

### 1. Authorized sharing only

Song Pages accepts URLs that reflect **public, provider-intended sharing**:

- Official share pages (e.g. `flowmusic.app/song/{uuid}`, `youtube.com/watch?v=…`, `suno.com/song/{uuid}`)
- Stable public asset URLs explicitly published for playback when the provider exposes them (e.g. Google Flow `producer-app-public` clips)

We **do not** accept:

- Private buckets, signed/temporary URLs, or credentials embedded in query strings
- Links that require circumventing access controls, scraping behind login walls, or reverse-engineering undocumented APIs to bypass provider policy
- “Enterprising” URLs passed between users that were never meant for stable public reuse

When intake fails, error copy should steer users toward the **authorized share link** from the provider’s UI — not toward technical alternatives.

### 2. Never circumvent security

Integrations must not:

- Forge headers, tokens, or signatures to access non-public content
- Follow redirects into disallowed hosts outside the adapter’s fixed policy
- Bypass Electron `urlPolicy` purpose checks or fetch size limits
- Exfiltrate session cookies or reuse another user’s signed URLs

If a provider offers an **official API** with documented terms, prefer that path when we choose to integrate long-term. Until then, we use only what is **publicly reachable without authentication** — oEmbed, public HTML metadata, public CDN objects — and we document the limitation honestly.

### 3. Severability

Every integration is **optional and removable**:

- Feature flags (`SUNO_DEMO_FEATURE_ENABLED`, `FLOW_FEATURE_ENABLED`, etc.) can disable UI and IPC
- Adapter code lives in isolated modules (`electron/listener/{provider}/`, `shared/providers/{provider}/`)
- Snapshot rows in SQLite remain valid history; playback may stop working if remote assets disappear — that is acceptable

When a provider breaks our intake path, changes URL shapes, or revokes public access:

1. **Stop claiming support** — disable or remove the adapter
2. **Do not ship “fix” code** that circumvents the new restriction
3. Optionally migrate to an authorized API if one exists and terms allow desktop use
4. Existing playlist snapshots keep their stored metadata; playback may fail gracefully

### 4. Playlist snapshots, not live provider sessions

Imported tracks become **self-contained snapshots** in `user_playlist_songs` (or provider-specific tables for demo playlists). See [persistence-philosophy.md](./persistence-philosophy.md).

Each snapshot stores:

| Field | Role |
|-------|------|
| `external_id` | Provider-native work id (YouTube video id, Suno/Flow UUID, …) |
| `page_url` | Internal page key (`songpages-{provider}:…`) — not always a fetchable HTTP URL |
| `playback_url` | What the app player uses (HLS, direct MP3/M4A, embed identity, …) |
| `playback_scope` | Transport branch (`youtube`, `flow`, `suno-demo`, `full`, …) |
| `song_manifest_url` | Internal manifest prefix resolved in main process |
| `title`, `artist_name`, `cover_url`, `duration_seconds`, `lyrics`, … | Display + export |

**Add and move copy 1:1.** When a track is added to a custom playlist or moved between playlists, the full snapshot is copied at write time. Rows must not point at another playlist’s entries, Suno sidebar song ids, or catalog `songs` rows for playback identity. Provider ids (`external_id`) and stored URLs are authoritative on the snapshot row.

**Refresh policy** (see [persistence-philosophy.md](./persistence-philosophy.md) § Cache refresh cadence):

| Source | Background refresh |
|--------|-------------------|
| Suno snapshots (`suno_demo_songs`, custom-playlist Suno rows) | Attempt metadata refetch after **7 days** when resolving manifests |
| Subscribed Song Pages / artist catalogs | Auto-refresh on launch when `last_fetched_at` is older than **30 days** |

We do not silently re-scrape provider pages on every play. User-initiated refresh always runs immediately.

### 5. Missing information

Follow [missing-information-rule.md](./missing-information-rule.md) for empty title, artist, year, URL, and duration. Provider-specific gaps (e.g. lyrics unavailable) use neutral on-screen copy — never crash, never show raw provider errors to users.

### 6. Autoplay at track selection (required for track-level integrations)

**Track-level** third-party integration — pasting one URL to add one row to a custom playlist — is only viable when **selecting that row starts playback without a second interaction inside the provider’s player**.

Concretely, the integration must support at least one of:

| Playback path | Autoplay requirement |
|---------------|----------------------|
| **Direct audio** (`<audio>` on a stable public URL) | `play()` on the element when transport requests play — same as catalog, Flow, or Suno demo |
| **Official embed + parent API** | Documented JS API the host can call (`play()`, `pause()`, `seekTo()`, …) after the widget reports ready — same class as YouTube IFrame API or SoundCloud Widget API |

What **does not** qualify:

- Embeds where the user must click **inside** the iframe to hear audio (even if metadata intake succeeded)
- Scraping **signed or time-limited stream URLs** from page HTML to bypass the embed — not authorized sharing, and URLs expire
- Hoping URL parameters like `autoplay=1` work when the provider does not document or honor them for programmatic control

**Transport sync** is part of the same bar: play/pause, seek, duration, and advance-to-next on track end must be driven from Song Pages (or observable via official widget events), not only from controls inside the cross-origin iframe.

Providers that pass intake metadata but fail this playback bar are **rejected** — see [Bandcamp](#bandcamp--evaluated-2026-not-shipped) below.

**Note:** YouTube and direct-audio providers trade away Web Audio / visualizer access; that is acceptable. Autoplay from our transport is not optional for track paste integrations.

---

## Trust model (R2 adapters)

In audit terms, third-party integrations are **R2: user-supplied remote adapter content**:

- Triggered only by **explicit user action** (paste URL → Add)
- Fetched through **purpose-specific URL policy** in the main process — not generic renderer `fetch`
- **Not equivalent** to R1 subscribed artist catalogs (trusted compile output, cache pipeline)

All pasted input is untrusted until canonicalized and validated. Canonicalization strips session context (YouTube playlists, timestamps, tracking params) so one stable work identity remains.

---

## Architecture overview

```
User paste (custom playlist UI)
        │
        ▼
┌───────────────────┐
│  validate +         │  shared/providers/{id}/canonicalize.ts
│  canonicalize       │  (pure; unit-tested)
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  extractMetadata  │  oEmbed, public page HTML, public JSON endpoints
│  (main process)   │  via fetchWithUrlPolicy + urlPolicy purpose
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  verify public    │  Reject private/signed URLs; probe availability when needed
│  playback access  │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  materialize      │  user_playlist_songs snapshot (+ optional clip cache table)
│  snapshot         │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  ListenerMode     │  playback_scope → transport branch
│  playback + UI    │  internal manifest → in-app song page
└───────────────────┘
```

### ProviderIntake contract (target shape)

Defined in `shared/providers/types.ts`:

1. **`validate(input)`** — boolean guard
2. **`canonicalize(input)`** — `{ ok, ref }` with stable `externalId` and internal page key
3. **`extractMetadata(ref)`** — intake-time title, artist, cover, etc. (may be partial)
4. **Playback adapter** — separate from intake (IFrame player, direct `<audio>`, HLS, …)

YouTube and SoundCloud are reference implementations under `shared/providers/youtube/` and `shared/providers/soundcloud/`. New custom-playlist providers should follow that layout unless they need Suno-style dedicated sidebar playlists.

### Internal URL prefixes

Providers never load their marketing sites in the guest webview for imported tracks. Instead:

| Provider | Page prefix | Manifest prefix | `playback_scope` |
|----------|-------------|-----------------|------------------|
| YouTube | `songpages-youtube:watch/{id}` | `songpages-youtube:manifest/{id}` | `youtube` |
| SoundCloud | `songpages-soundcloud:track/{id}` | `songpages-soundcloud:manifest/{id}` | `soundcloud` |
| Google Flow | `songpages-flow:page/{uuid}` | `songpages-flow:manifest/{uuid}` | `flow` |
| Suno demo | `songpages-suno-demo:page/{songId}` | `songpages-suno-demo:manifest/{songId}` | `suno-demo` |

`listener:fetchSongManifest` short-circuits these prefixes in the main process and returns synthetic manifests from SQLite — no HTTP round-trip at read time.

### URL policy purposes

Remote fetches from adapters must declare a **purpose** in `electron/net/urlPolicy.js`. Examples:

| Purpose | Allowed targets |
|---------|-----------------|
| `youtube-oembed` | `youtube.com/oembed` only |
| `soundcloud-oembed` | `soundcloud.com/oembed` only |
| `soundcloud-shortlink` | `on.soundcloud.com` and resolved `soundcloud.com/{user}/{track}` landings only |
| `flow-song-page` | `flowmusic.app/song/{uuid}` pages only |
| `flow-public-clip` | `storage.googleapis.com/producer-app-public/clips/{uuid}.m4a` only — no query params, no private bucket |
| `fetch-song-manifest` | Subscribed catalog manifests (R1) — not used for adapter intake |

Add a new purpose per provider; do not widen existing purposes to “make it work.”

---

## Current integrations

### YouTube (custom playlists)

**Status:** Shipped experiment  
**Placement:** Custom playlists only — “Add YouTube song”

| Stage | Mechanism |
|-------|-----------|
| Canonicalize | Bare 11-char id or watch/shorts/embed URLs; strip playlist, radio, timestamp, tracking params |
| Metadata | Public [oEmbed](https://www.youtube.com/oembed); thumbnail fallback from video id |
| Playback | Official IFrame Player API in-app (video visible for ads); **no** Web Audio tap — FX/visualizer N/A |
| VC | When VC has a visualizer cell, embed plays in VC slot; main defers to avoid dual players |
| Share export | `https://www.youtube.com/watch?v={id}` |

**Rejected:** Playlists as browsing sessions, private/unlisted behavior beyond what oEmbed/embed allows, any non-canonical URL we cannot reduce to one video id.

Detail: [youtube-provider-investigation.md](./youtube-provider-investigation.md)

---

### SoundCloud (custom playlists)

**Status:** Shipped  
**Placement:** Custom playlists only — “Add SoundCloud track”

| Stage | Mechanism |
|-------|-----------|
| Canonicalize | Public `soundcloud.com/{artist}/{track}` permalinks; `on.soundcloud.com` short links (HEAD redirect in main); reject profiles, sets, playlists |
| Metadata | Public [oEmbed](https://developers.soundcloud.com/docs/oembed) (`maxheight=81`); parse `api.soundcloud.com/tracks/{id}` from embed HTML (literal or `%2F`-encoded slashes) |
| Playback | Official [Widget API](https://developers.soundcloud.com/docs/api/html5-widget) — `play()` / `pause()` / `seekTo()` / `FINISH`; compact widget (`visual=false`) in main listener |
| VC | Visualizer cell hosts SoundCloud waveform (`visual=true` via `VcSoundcloudPlayer`); main song page defers to avoid dual players |
| Transport | Autoplay on row select; play/pause/seek; advance on `FINISH` — passes [§6 autoplay gate](#6-autoplay-at-track-selection-required-for-track-level-integrations) |
| FX / visualizer | No Web Audio tap — VC uses SoundCloud's built-in visual instead of Butterchurn |
| Duration | Learned on first play from widget; persisted to `duration_seconds` |
| Share export | Public track permalink in `playback_url` |

**Rejected:** Sets/playlists, artist profiles, private tracks, REST API signed stream URLs (Artist Pro OAuth path).

Detail: [soundcloud-provider-investigation.md](./soundcloud-provider-investigation.md)

### Suno (demo playlists)

**Status:** Shipped demo feature  
**Placement:** Dedicated virtual sidebar playlists (`artist_id < 0`), not custom playlist paste

| Stage | Mechanism |
|-------|-----------|
| Canonicalize | UUID from paste, share URL redirect, or `suno.com/song/{uuid}` |
| Metadata | Suno Studio public clip endpoint + CDN URLs — **external-source resolver**, not an authorized API partnership |
| Storage | `suno_demo_songs` table (lyrics, cover, playback URL snapshot) |
| Playback | Direct MP3 via `<audio>` (`playback_scope: suno-demo`) |
| Share export | `https://suno.com/song/{uuid}` |

**Sever:** `SUNO_DEMO_FEATURE_ENABLED = false` in `shared/demo/sunoDemoFeature.ts` and `electron/listener/sunoDemo/feature.js`.

Terminology: call this a **remote source adapter** or **external-source resolver** — not “the Suno API.”

---

### Google Flow (custom playlists)

**Status:** Shipped experiment  
**Placement:** Custom playlists only — “Add Google Flow song”

| Stage | Mechanism |
|-------|-----------|
| Canonicalize | `flowmusic.app/song/{uuid}`, bare UUID, or public `producer-app-public/clips/{uuid}.m4a` |
| Metadata | Public song page `__NEXT_DATA__` (title, artist, cover, lyrics, sound prompt, duration) |
| Rejected | `producer-app-private`, signed GCS URLs (`X-Goog-*`), clips returning `NoSuchKey` |
| Storage | `user_playlist_songs` snapshot + `flow_clip_snapshots` cache for manifest lyrics/about |
| Playback | Direct public M4A via `<audio>` (`playback_scope: flow`) |
| In-app page | Cover, **Sound** (about), lyrics — no flowmusic.app webview |
| Share export | `https://www.flowmusic.app/song/{uuid}` |

**User guidance on failure:** *“Paste a public flowmusic.app song link. Private or signed clip URLs are not supported.”*

**Sever:** `FLOW_FEATURE_ENABLED = false` in `electron/listener/flow/flowSongs.js`.

Flow maps **Sound** → manifest `about` / row `caption`; lyrics → manifest `lyrics`.

---

## Playback branches

`ListenerMode` chooses transport by `playback_scope` and URL shape:

| Scope | Transport | Analyser / FX |
|-------|-----------|---------------|
| `full` (catalog) | HLS via `hls.js` | Yes (when graph active) |
| `suno-demo`, `flow` | Direct `<audio>` (MP3/M4A) | Yes |
| `youtube` | YouTube IFrame | No — sandboxed audio |
| `soundcloud` | SoundCloud Widget iframe | No Web Audio — VC visualizer cell uses SoundCloud waveform instead |

See [audio-pipeline.md](./audio-pipeline.md) for mirror/VC behavior.

---

## User-facing errors (intake)

Errors should be **short, actionable, and honest**:

| Bad | Good |
|-----|------|
| “HTTP 403” | “This Google Flow clip is not publicly available. The creator may have made it private.” |
| “Invalid URL” | “Paste a public flowmusic.app song link.” |
| “NoSuchKey” | (same as above — never show raw XML) |
| Technical workaround hints | “Use the Share link from Google Flow / YouTube / SoundCloud / Suno.” |

Optional **intake notices** (non-errors) explain what we stripped at canonicalize time — e.g. YouTube playlist context removed from a watch URL ([`buildYoutubeIntakeToastMessage`](shared/providers/youtube/intakeToast.ts)).

---

## Adding a new integration (checklist)

1. **Product** — Custom playlist only, or dedicated demo playlist? One work per paste?
2. **Autoplay gate** — Prove selecting a playlist row starts playback via direct audio or an official parent-callable API; reject if the only path is click-inside-widget or signed stream scraping
3. **Canonicalize** — `shared/providers/{id}/canonicalize.ts` + tests; document accepted and rejected URL classes
4. **Policy** — New `urlPolicy` purposes; no broadening existing ones
5. **Metadata** — Public oEmbed, public page fields, or authorized API; document source and limits
6. **Verify playback** — Confirm public asset is reachable without auth; fail closed if not
7. **Snapshot** — `playback_scope`, internal prefixes, `external_id`, manifest builder
8. **UI** — Add popover on custom playlist (or sidebar flow for demo playlists)
9. **ListenerMode** — `is{Provider}Song()`, song page component, playback branch
10. **Share export** — `shareableSongLink.ts` returns provider share URL
11. **Feature flag** — Severability switch + README note here
12. **Docs** — Update this file; add investigation doc only if intake rules are non-obvious

---

## When integrations break

| Scenario | Response |
|----------|----------|
| Provider changes share URL shape | Update canonicalizer; old snapshots keep `external_id` if still valid |
| Public CDN path changes | Update adapter; playback fails until user re-imports or we ship migration |
| Provider removes public metadata | Disable intake; keep historical snapshots; optional authorized API migration |
| Provider blocks desktop clients | Do not spoof User-Agent or bypass; disable feature |
| Signed/temporary URLs become common | Reject at canonicalize; message users to use share links |

We **respond** to ecosystem changes; we do not **fight** them.

---

## Code map

| Provider | Shared | Main process | UI |
|----------|--------|--------------|-----|
| YouTube | `shared/providers/youtube/`, `shared/youtube/` | `electron/listener/youtube/` | `YoutubeAddPopover`, `YoutubeSongPage` |
| SoundCloud | `shared/providers/soundcloud/`, `shared/soundcloud/` | `electron/listener/soundcloud/` | `SoundcloudAddPopover`, `SoundcloudSongPage`, `SoundcloudPlayer`, `VcSoundcloudPlayer` |
| Suno demo | `shared/demo/sunoDemoFeature.ts` | `electron/listener/sunoDemo/` | `SunoDemoAddPopover`, `SunoOnlyPanel`, `SunoDemoSongPage` |
| Google Flow | `shared/providers/flow/`, `shared/flow/` | `electron/listener/flow/` | `FlowAddPopover`, `FlowSongPage` |

Cross-cutting:

- `electron/net/urlPolicy.js` — fetch allowlists
- `electron/listener/userPlaylists.js` — snapshot materialization / enrich
- `shared/listener/shareableSongLink.ts` — export URLs
- `src/listener/directAudioPlayback.ts` — direct MP3/M4A detection

---

## Rejected integrations

Integrations listed here may have passed partial investigation (metadata intake, URL canonicalization) but **failed the [autoplay at track selection](#6-autoplay-at-track-selection-required-for-track-level-integrations)** rule or authorized-sharing policy. They are documented so we do not re-litigate the same dead ends.

### Bandcamp — evaluated 2026, not shipped

**Status:** Prototype built and removed — no Bandcamp adapter code remains in the tree.

**What we tried:** Public Bandcamp **track** URLs (`…/track/…`, including artist custom domains) and the official **`bandcamp.com/EmbeddedPlayer`** iframe — the same authorized embed Bandcamp documents for third-party sites. Intake parsed public track page HTML (`data-tralbum` JSON) for title, artist, artwork, album id, and streaming eligibility; playback used the compact album+track embed (`album=…/track=…`).

**What worked (intake only):**

| Stage | Result |
|-------|--------|
| Canonicalize | Stable track identity from public share URLs |
| Metadata | Title, artist, cover from public page HTML |
| Embed URL | Valid `EmbeddedPlayer` iframe for streamable tracks |

**Why rejected (playback):** Bandcamp fails [standing rule §6](#6-autoplay-at-track-selection-required-for-track-level-integrations). Selecting a playlist row did **not** start audio through Song Pages transport.

| Blocker | Detail |
|---------|--------|
| **No autostart** | Bandcamp’s embed has **no documented autostart URL parameter**; their help center still describes manual play inside the widget |
| **No parent API** | The embed does not expose `play()`, `pause()`, or `seekTo()` to the host page. The only documented `postMessage` to the parent is **`playerinited`** — not sufficient to drive transport |
| **Cross-origin control** | Our play/pause/seek UI cannot activate playback inside the iframe (browser autoplay policy + same-origin isolation) |
| **Transport sync** | Next/previous, seek bar, and finish-to-next-track cannot be wired to Bandcamp’s player |

**Rejected workaround:** The only reliable autoplay path found in investigation was **signed `bcbits.com` MP3 stream URLs** embedded in track page HTML. That violates [authorized sharing only](#1-authorized-sharing-only): URLs are temporary, not share links, and scraping them is circumvention — the same class of rejection as private GCS signed URLs for Flow.

**Comparison to shipped providers:**

| Provider | Autoplay from Song Pages transport? |
|----------|-------------------------------------|
| Catalog / Flow / Suno | Yes — direct `<audio>` |
| YouTube | Yes — IFrame Player API `play()` on ready |
| **SoundCloud** | Yes — Widget API `play()` on `READY` |
| **Bandcamp** | **No** — click inside widget required |

**Where Bandcamp still belongs:** [design-and-vision.md](./design-and-vision.md) — outbound **stream links** and artist bios (“purchase on Bandcamp”), not custom-playlist import.

**User-facing alternative:** Paste is unsupported. Message users to use Bandcamp from linked artist pages, not to add Bandcamp tracks to Song Pages playlists.

**Legacy data:** Rows imported during the brief experiment (`playback_scope: bandcamp`) may still exist in local SQLite; playback is unsupported. Delete those rows manually if present — re-import is not available.

---

## Open directions (not commitments)

Obvious candidates for the same pattern — each must pass the [checklist](#adding-a-new-integration-checklist), including the **autoplay gate**, and product sign-off:

- Additional AI music hosts with public share pages and stable public audio URLs (direct `<audio>` path)
- Authorized OAuth/API integrations where terms explicitly allow desktop playback **and** transport-driven autoplay
- Share/export of adapter tracks in custom playlist export ([share-playlist-spec1.md](./share-playlist-spec1.md))

Explicitly **not** candidates without a new authorized playback mechanism:

- **Bandcamp** custom-playlist import — [rejected](#bandcamp--evaluated-2026-not-shipped)

Deferred or out of scope unless the provider exposes stable public sharing:

- Channel browsing, comments, recommendations, provider-native playlists
- Private libraries, login-gated content, or credential-in-URL workarounds
- Background metadata refresh without user action

---

## Maintenance

1. **New provider** — add a subsection under [Current integrations](#current-integrations) and a row in the code map.
2. **Intake rule change** — update canonicalizer tests and this doc in the same PR.
3. **Provider severed** — set feature flag false, mark subsection **Severed** with date, leave code map entry for archaeology.
4. **Never** document circumvention techniques — document what we support and what we tell users instead.
