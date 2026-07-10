# Persistence Philosophy — Song Pages

**Status:** Canonical architectural guidance  
**Audit:** Closed 2026-07-10 — see [Song Pages SQLite and Data Layer Audit.md](./Song%20Pages%20SQLite%20and%20Data%20Layer%20Audit.md) §18 for deferred-item triggers  
**Supersedes:** Normalization-first or “FK everywhere” assumptions in earlier audit drafts  
**Audience:** Contributors, coding agents, future schema work  
**Index:** [README.md](./README.md) · **Deferred:** [OPEN-QUESTIONS.md](./OPEN-QUESTIONS.md)  
**Related:** [Song Pages SQLite and Data Layer Audit.md](./Song%20Pages%20SQLite%20and%20Data%20Layer%20Audit.md) · [settings-and-persistence.md](./settings-and-persistence.md)

---

## Core premise

Song Pages is **not** a centralized immutable music library.

It is a desktop client that **consumes distributed catalogs** from independent creators and services. Those catalogs change without notice. Users also change their local relationship to those catalogs (subscribe, unsubscribe, cache, delete).

**Engineering principle:**

> Optimize the persistence model around **ownership semantics**, not normalization for its own sake.  
> Use relational integrity where lifecycle is shared.  
> Use **snapshots** where user-created content must outlive mutable external catalogs.

Song Pages intentionally favors **preserving user work** over maintaining perfect relational consistency with feeds that may disappear, rename, republish, or revoke content.

---

## Snapshot-First Principle

### What it means

When a user adds something to **their** content (playlist, liked collection, future editor artifacts), the system should record:

**“What the user selected at that moment.”**

—not—

**“Whatever row currently exists in the subscribed catalog.”**

Playlist entries, and similar user-owned collections, are **historical snapshots**. They must remain meaningful when:

- an artist unsubscribes or deletes a catalog  
- a song is removed or replaced in a remote feed  
- identifiers change on refresh  
- a source service disconnects  

**A stale or ghosted entry is acceptable product behavior.**  
**A broken or deleted entry because relational integrity removed user content is not.**

The UI may indicate unavailable, stale, or ghosted items. That is expected—not a schema failure.

### What this does *not* mean

- Song Pages is not “anti-relational.”  
- Subscribed catalog tables (`artists`, `songs`) still model a **local mirror** of a feed with shared lifecycle inside that mirror.  
- Cache, settings, and true parent/child records still benefit from constraints where appropriate.  
- Denormalization is not an excuse to skip transactions, backups, or migration discipline.

---

## Relationship classes

Before adding or enforcing a foreign key, classify the relationship:

| Class | Definition | FK / cascade posture |
|-------|------------|----------------------|
| **Ownership** | Parent and child share intentional lifecycle; deleting parent should remove or strictly manage children | FK + cascade (or explicit equivalent) reasonable |
| **Snapshot** | User-owned historical record; must survive source disappearance | **No FK to mutable catalog rows**; store copied metadata |
| **Convenience reference** | Optional link for dedup, enrichment, or provenance; stale link OK | **No enforced FK**; nullable; never delete snapshot row when link breaks |
| **Cache** | Regenerable derived/local copy of remote or computed state | FK to stable local keys OK; rebuildable; low backup priority |
| **Derived data** | Denormalized counters, overlays, indexes | Recomputable; constraints optional |

**Rule:** Only **ownership** relationships should automatically trend toward stronger relational integrity.  
Convenience references must not be upgraded to ownership without explicit product review.

---

## Entity relationship map (audit revision)

| From | To | Class | Notes |
|------|-----|-------|-------|
| `artists` | `songs` | **Ownership** (local mirror) | Subscribed catalog; refresh replaces songs; unsubscribe removes artist |
| `user_playlists` | `user_playlist_songs` | **Ownership** | User deletes playlist → entries go |
| `user_playlist_songs` | `songs` via `library_song_id` | **Convenience reference** | Provenance/dedup only; **not** ownership |
| `user_playlist_songs` row body | — | **Snapshot** | URLs, title, artist_name, etc. authoritative for playback |
| `suno_demo_playlists` | `suno_demo_songs` | **Ownership** | Demo feature container |
| `suno_demo_songs` | remote Suno | **Snapshot** | Self-contained import rows |
| `liked_songs` | `songs` via `song_id` | **Convenience reference** | Optional live link; row has snapshot fields |
| `liked_songs` row body | — | **Snapshot** | Survives catalog loss when `song_id` null |
| `song_cache` | `songs` | **Cache** | Tied to current song row; invalidated on revision change |
| `song_cache` | `song_cache_assets` | **Ownership** | Asset rows belong to cache entry |
| `catalog_song_skips` | `artists` + `external_id` | **Derived / overlay** | User preference; keyed to survive song row replacement |
| `playlist_custom_orders` | song ids | **Derived** | Order overlay; sync prunes missing ids |
| `settings` JSON blobs | — | **Snapshot / config** | Versioned JSON; normalize on read |

---

## Foreign keys — revised guidance

### Appropriate ownership FK candidates (if/when FK pragma enabled)

| FK | Rationale |
|----|-----------|
| `songs.artist_id` → `artists` | Local catalog mirror; shared unsubscribe lifecycle |
| `song_cache_assets.cache_id` → `song_cache` | Strict parent/child |
| `user_playlist_songs.playlist_id` → `user_playlists` | User-owned container |
| `song_cache.song_id` / `artist_id` | Cache entry scoped to catalog row (regenerable) |

### Do **not** strengthen toward ownership

| Link | Treat as | Why |
|------|----------|-----|
| `user_playlist_songs.library_song_id` → `songs` | Convenience reference | Must not imply playlist row lifecycle tied to catalog row |
| Any future “pointer to library song” on user artifacts | Convenience reference | Same |

### Hybrid cases — handle explicitly

| Link | Guidance |
|------|----------|
| `liked_songs.song_id` → `songs` | Optional convenience; `ON DELETE SET NULL` acceptable; **never** cascade-delete liked row; read path may enrich from live song when present |
| `suno_demo_songs.playlist_id` | Ownership within demo feature; not related to subscribed catalog |

**Do not enable blanket `foreign_keys=ON` without scoping which declared FKs remain in DDL and which should be removed from schema over time.**

---

## Playlist architecture (current code review)

**Aligned with Snapshot-First:**

- Module header and design: `userPlaylists.js` — *“Playlist rows are self-contained snapshots… reads never join the catalog.”*  
- `listUserPlaylistSongs()` — `SELECT * FROM user_playlist_songs` only; maps stored fields to song rows.  
- `materializePlaylistSnapshot()` — copies/enriches **at write time** (add, move, repair), not on every read.  
- Partial unique indexes use `page_url` when no `library_song_id` — snapshot identity path.

**Convenience references (acceptable if stale):**

- `library_song_id` — set on add when known; used for duplicate detection and write-time enrichment.  
- `source_artist_id` — provenance hint; no FK.

**Tensions to monitor (document only — no code change in this pass):**

| Area | Behavior | Snapshot-First read |
|------|----------|---------------------|
| `repairUserPlaylistSnapshots()` at startup | Re-queries catalog when snapshot “incomplete” | OK if **repair** only; risky if it silently replaces good historical snapshots when catalog changed |
| `enrichSongFromLibrary()` during materialize | Overwrites fields from live `songs` row when `library_song_id` set | OK at **user-initiated add/move**; should not run on passive read |
| Live DB FK on `library_song_id` | `ON DELETE SET NULL` if FK enforced | Preserves row ✓; but FK still wrongly implies relational dependency — prefer no FK |
| `playlist_custom_orders` | Stores song ids including synthetic negatives | Derived overlay; prunes on sync — separate from snapshot body |

**Suno demo playlists** — same snapshot pattern within `suno_demo_songs` rows; not joined to `songs` table.

**Liked Songs** — hybrid: `listLikedSongs()` uses `LEFT JOIN songs` for live enrichment with `COALESCE` fallback to snapshot columns. Acceptable if ghost/stale UI handles missing live rows; document as *read-time enrichment*, not relational playlist.

---

## `library_song_id` — revised stance

**Question is not:** “Should this become a stronger FK?”

**Question is:** “Should this exist as a relational dependency at all?”

**Answer:** It should exist as an **optional convenience reference** only:

- provenance (“added from library song X”)  
- duplicate detection when the same library track is added twice  
- write-time enrichment helper  

It must **not** be modeled as ownership. Stale values are acceptable. Rows must never be deleted because the referenced `songs` row disappeared.

**Schema drift (resolved):** Slice I removed convenience FK from DDL. Historical analysis: [archive/investigations/data-layer-library-song-id-fk-investigation.md](./archive/investigations/data-layer-library-song-id-fk-investigation.md).

---

## Deletion semantics (product-aligned summary)

| Action | User-owned snapshots | Local catalog mirror |
|--------|----------------------|----------------------|
| Unsubscribe artist | Playlists **keep** entries; links may stale | Remove `artists`/`songs` (owned mirror) |
| Catalog refresh | Snapshots **unchanged**; convenience ids may stale | Replace `songs` rows for that artist |
| Delete custom playlist | Delete playlist-owned rows | — |
| Remove playlist track | Delete that snapshot row | — |

Relational cascades must **never** delete `user_playlist_songs` rows because a catalog `songs` row was removed.

---

## What continues unchanged

The SQLite audit program remains valid for:

- migration discipline and visibility  
- backup / restore (`npm run backup:db`)  
- transactional safety (e.g. atomic catalog upsert — Slice D)  
- schema consistency documentation  
- settings registry  
- performance evidence  
- testing (`npm run test:db`)  
- observability  

Future slices must cite this document when proposing FKs, normalization, or cascade behavior.

**Slice I (2026-07-10):** Convenience FK metadata removed from `user_playlist_songs.library_song_id` and `liked_songs.song_id` via `electron/listener/convenienceFkMigration.js`. Ownership FKs remain declared but `foreign_keys` pragma is still off until Slice C.

---

## For coding agents

When proposing schema changes, answer:

1. **Class?** Ownership, snapshot, convenience, cache, or derived?  
2. **If the remote catalog changes tomorrow, should this user row survive?**  
3. **If yes → snapshot fields, not FK.**  
4. **If convenience link goes stale, is UI ghosting acceptable?**  
5. **Does this optimize safe ongoing change, or premature final-state rigidity?**

When in doubt, preserve user-created rows and denormalize intentionally.

---

*Revision 2026-07-10 — Snapshot-First architectural review incorporated.*
