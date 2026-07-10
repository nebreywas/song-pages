# Song Pages SQLite and Data Layer Audit

**Date:** 2026-07-10 (closed 2026-07-10)  
**Spec:** [archive/specs/SQL-audit-review.md](./archive/specs/SQL-audit-review.md)  
**Status:** **Closed at natural stopping point.** Phase 1 complete; Phase 2 implemented slices A, B, D, I; Snapshot-First incorporated. Remaining items deferred — revisit only when product work provides concrete trigger.  
**Canonical reference for future persistence work:** [persistence-philosophy.md](./persistence-philosophy.md)  
**Index:** [README.md](./README.md) · **Deferred:** [OPEN-QUESTIONS.md](./OPEN-QUESTIONS.md)  
**Method:** Source inspection, IPC tracing, settings key inventory, copied-database diagnostics  
**Audit copy:** `.audit-db-copy/app.db` (+ `-wal`, `-shm`) — verified copy of development database; live DB untouched

> This document is **long-term architectural guidance**, not an active implementation backlog. Assess first; implement only when the product benefits.

---

## Persistence philosophy (canonical)

Song Pages consumes **distributed, mutable catalogs**. User playlists and similar artifacts are **snapshots**, not live relational views into a permanent library.

**Before any FK or normalization work, read:** [persistence-philosophy.md](./persistence-philosophy.md)

Relationship classes: **Ownership** · **Snapshot** · **Convenience reference** · **Cache** · **Derived**

Only **ownership** relationships should automatically trend toward FK enforcement. Convenience references (e.g. `library_song_id`) must remain optional and stale-tolerant.

---

## Executive Summary

Song Pages uses a **single main-process SQLite database** (`better-sqlite3`) as the canonical local store for listener library data, playlists, cache metadata, and JSON settings blobs. The architecture is appropriate for a desktop Electron app at current scale (~20 catalog songs, ~57 Suno demo tracks in the audited dev DB). **Renderer code never constructs SQL**; listener features use narrow IPC handlers.

The persistence layer is **mature enough for the current stage** of Song Pages. Remaining observations are documented for future reference, not as open work items.

Resolved or accepted during the audit:

1. ~~**Partial transaction boundaries** on subscribe/refresh~~ — **Fixed (Slice D):** atomic catalog upsert.
2. ~~**No backup tooling**~~ — **Fixed (Slice B):** `npm run backup:db`.
3. ~~**Settings registry incomplete**~~ — **Fixed (Slice A).**
4. ~~**Legacy convenience FK on `library_song_id`**~~ — **Fixed (Slice I):** ownership-only DDL alignment.
5. **Snapshot-First playlists** — intentional product architecture; see [persistence-philosophy.md](./persistence-philosophy.md).

Deferred until product work provides a concrete trigger (see §18):

- **`PRAGMA foreign_keys` not enabled** — scoped policy documented; enable only if orphan catalog data becomes a recurring problem.
- **`deleteArtist` mirror cleanup** — minor hygiene at current scale; bundle with future listener library work.
- **Ad-hoc migrations (no `user_version`)** — acceptable at current pace; revisit when content editor adds persistent tables.
- **Generic settings IPC** — intentional for rapid VC/settings iteration; domain IPC for new editor settings when that ships.
- **Synthetic ID helpers / query micro-optimizations** — remove from active backlog; address only if a future feature requires them.

**Good news:** Copied DB passes integrity checks. WAL enabled. **Custom playlists are snapshot-first by design.** Listener IPC is capability-oriented. Tests cover atomic upsert and convenience FK migration (`npm run test:db`).

---

## Top Findings

| # | Finding | Status |
|---|---------|--------|
| 1 | `foreign_keys` not enabled | **Deferred** — see §18; philosophy defines ownership scope |
| 2 | `deleteArtist` catalog mirror cleanup | **Deferred** — bundle with listener work |
| 3 | Subscribe refresh not atomic | **Done** (Slice D) |
| 4 | Generic settings IPC | **Accepted** — revisit for content editor domains |
| 5 | No central schema version | **Deferred** — trigger: content editor tables |
| 6 | No backup tooling | **Done** (Slice B) |
| 7 | Settings registry incomplete | **Done** (Slice A) |
| 8 | `listArtists` correlated subquery | **Removed** — premature at current scale |
| 9 | Synthetic ID helpers scattered | **Deferred** — trigger: new ID namespaces |
| 10 | `library_song_id` convenience FK drift | **Done** (Slice I) |

---

## What Is Already Working Well

- **Single connection, main process only** — `electron/database.js`; renderer via preload IPC.
- **Prepared statements** with bound parameters in feature modules.
- **Filesystem for binaries** — cache assets, host content media; SQLite for metadata and settings.
- **Listener IPC shape** — `listener:*` handlers dispatch by intent, not raw SQL.
- **Playlist custom order** — transactional replace in `playlistOrder.js`.
- **Settings JSON migration helpers** — VC, host content, commands, Kudos normalize on read in shared TypeScript.
- **Skip flags keyed by `(artist_id, external_id)`** — survive catalog refresh (songs table replaced on subscribe).
- **User playlist snapshots** — self-contained rows; no read-time catalog join required.
- **Pinned `userData`** — `app.setPath('userData', …/song-pages)` prevents silent DB loss on rename.

---

## Highest-Risk Issues (Detail)

### 1. Foreign keys disabled — scope before enablement (P1)

**Current state:** `initDatabase()` sets only `journal_mode = WAL`. No `foreign_keys=ON`.

**Revised framing (Snapshot-First):** The question is not “enable all declared FKs” but “**which ownership relationships** should SQLite enforce?”

**Ownership candidates:** `songs→artists`, `user_playlist_songs→user_playlists`, `song_cache→songs`/`artists`, `song_cache_assets→song_cache`.

**Do not enforce:** `user_playlist_songs.library_song_id→songs` (convenience reference). Live DB FK here is legacy misalignment.

**Risk if blanket FK enabled without scoping:** Correct cascades on catalog mirror, but wrong semantics on snapshot tables; possible surprise NULLing of convenience columns (acceptable) vs future schema that CASCADE-deletes user rows (unacceptable).

**Audit closure:** Deferred — enable only if orphan catalog data becomes a recurring problem. Scoped policy is in [persistence-philosophy.md](./persistence-philosophy.md).

### 2. Subscribe refresh partial transaction (P1) — **Resolved**

**Status:** Slice D implemented — `upsertArtistFromCatalog` wraps artist update/insert + song delete + insert in one transaction. Cache invalidation remains outside transaction (filesystem).

### 3. Generic settings IPC (P1)

**Current state:** `settings:get` / `settings:save` accept any string key; `getSetting` JSON-parses; malformed JSON returns raw string.

**Evidence:** `electron/ipc.js`, `electron/database.js`.

**Risk:** Typo keys, corrupted JSON on critical keys; no audit trail of writes.

**Audit closure:** Accepted for current stage. Add domain-specific IPC when content editor introduces new settings domains; do not retrofit the generic path preemptively.

---

## Audit Closure (2026-07-10)

**Outcome:** Persistence layer mature for current product stage. Shift focus to playback polish, VC Mode, and content editor planning.

### Implemented

| Slice | Deliverable |
|-------|-------------|
| **A** | Settings registry — `settings-and-persistence.md` |
| **B** | Quiesced backup — `npm run backup:db` |
| **D** | Atomic catalog upsert + `npm run test:db` |
| **I** | Convenience FK removal — `convenienceFkMigration.js` |
| **Philosophy** | [persistence-philosophy.md](./persistence-philosophy.md) — canonical Snapshot-First framework |

### Deferred — revisit only with a concrete product trigger

See §18 for trigger conditions. Do not implement because items remain listed here.

---

## Explicit No-Change / Defer Recommendations

| Area | Recommendation |
|------|----------------|
| `better-sqlite3` | **Keep** — appropriate for sync main-process desktop use |
| ORM / query builder | **Defer** — no evidence of pain at current scale |
| Normalize settings into tables | **Defer** — JSON blobs fit VC/Kudos/commands; snapshots intentionally denormalized |
| Blanket FK enablement | **Defer** — scope to ownership per [persistence-philosophy.md](./persistence-philosophy.md) |
| FK on `library_song_id` | **Reject** — convenience reference only |
| Custom playlist snapshot model | **No change** — already aligned on read path |
| Rename tables/columns for aesthetics | **Defer** |
| Enable WAL | **No change** — already active |
| Redesign synthetic ID namespaces | **Defer** — document + helpers first |
| Add indexes speculatively | **Defer** — see query plans; scale is small |
| Full `integrity_check` on every startup | **Defer** — use `quick_check` after migrations when added |

---

## 1. Current Architecture Map

```
┌─────────────────────────────────────────────────────────────────┐
│ Renderer (React) — src/listener, src/vc-mode, src/kudos, etc.   │
│   window.app.getSettings / saveSettings (generic KV)            │
│   window.app.listener.* (capability IPC)                        │
│   window.app.artist.* / commands.*                              │
└────────────────────────────┬────────────────────────────────────┘
                             │ contextBridge (electron/preload.js)
┌────────────────────────────▼────────────────────────────────────┐
│ Electron Main — electron/ipc.js                                   │
│   settings:get|save → database.getSetting|setSetting              │
│   listener:* → electron/listener/*.js                             │
│   artist:loadProjects|saveProjects → settings blobs               │
│   commands:* → commandService.js → settings `commands.mappings`   │
│   hostContent:* → hostContent.js (filesystem + settings catalog)  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ database.js — single better-sqlite3 connection                    │
│   path: {userData}/database/app.db                              │
│   userData pinned: ~/Library/Application Support/song-pages       │
│   init: settings table + initListenerSchema()                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   SQLite tables      userData/cache/     userData/host-content/
   (metadata)          (binary cache)      (media files)
```

### Connection ownership

| Question | Answer |
|----------|--------|
| Where created? | `database.initDatabase()` from `main.js` on `app.whenReady` |
| How many connections? | **One** global `db` in `database.js` |
| Which process? | **Electron main only** |
| Secondary processes? | None open the DB |
| Renderer SQL? | **No** |
| Sync in hot paths? | Yes (`better-sqlite3` sync) — acceptable at current scale |

### Modules with direct DB access

| Module | Tables / settings |
|--------|-------------------|
| `electron/database.js` | `settings` |
| `electron/listener/library.js` | `artists`, `songs` |
| `electron/listener/likedSongs.js` | `liked_songs` |
| `electron/listener/userPlaylists.js` | `user_playlists`, `user_playlist_songs` |
| `electron/listener/sunoDemo/*` | `suno_demo_playlists`, `suno_demo_songs` |
| `electron/listener/playlistOrder.js` | `playlist_custom_orders` |
| `electron/listener/songSkips.js` | `catalog_song_skips` |
| `electron/listener/cache/schema.js` | `song_cache`, `song_cache_assets` |
| `electron/listener/cacheManager.js` | cache tables + reads `cache.maxSongEntries` setting |
| `electron/commands/commandService.js` | `commands.mappings` setting |
| `electron/vcStateEnrich.js` | reads `vc.hostContent` |
| `electron/ipc.js` | `artist:projects`, `artist:draft` settings |

### Startup sequence (schema mutation order)

1. `app.whenReady` → `database.initDatabase()`
   - Create `settings` if missing
   - `PRAGMA journal_mode=WAL`
2. `initListenerSchema()` (`library.js`)
   - `CREATE artists`, `songs` + indexes
   - `migrateListenerSchema()` — column adds on `artists`, `songs`
   - `initLikedSongsSchema()`
   - `initSunoDemoSchema()` → `initSunoDemoPlaylistsSchema()` + orphan migration
   - `initUserPlaylistsSchema()` → `migratePlaylistSongColumns()` + **`repairUserPlaylistSnapshots()`** (data rewrite at startup)
   - `initPlaylistOrderSchema()`
   - `initSongSkipsSchema()`
   - `initSongCacheSchema()` → `migrateSongCacheColumns()`
3. `commandService.initCommandService()` — seed `commands.mappings` if missing
4. `registerIpcHandlers()`
5. Optional `refreshAllArtists()` on launch (network + DB writes)

---

## 2. Schema / Index / Constraint Inventory

**Source of truth for this audit:** `.schema` dump from copied DB (2026-07-10). Row counts from same copy.

### 2.1 `settings`

| Column | Type | Constraints |
|--------|------|-------------|
| key | TEXT | PRIMARY KEY |
| value | TEXT | NOT NULL |

**Rows:** 33  
**Owner:** Global app / feature modules via `getSetting`/`setSetting`

---

### 2.2 `artists`

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | PK AUTOINCREMENT |
| site_url | TEXT | NOT NULL UNIQUE |
| site_root_normalized | TEXT | NOT NULL |
| artist_slug | TEXT | |
| artist_name | TEXT | NOT NULL |
| artist_photo_url | TEXT | |
| artist_bio | TEXT | added via migration |
| artist_social_json | TEXT | JSON text |
| song_count | INTEGER | denormalized; backfilled |
| catalog_url | TEXT | |
| artist_manifest_url | TEXT | |
| build_version | TEXT | cache invalidation trigger |
| site_root_manifest | TEXT | |
| last_fetched_at | TEXT | ISO-ish text |
| created_at | TEXT | DEFAULT `datetime('now')` |

**Rows:** 2  
**Indexes:** UNIQUE on `site_url` (autoindex)  
**FK references:** Referenced by `songs`, `song_cache`  
**Owner:** Subscribe / refresh (`subscribe.js` → `library.upsertArtistFromCatalog`)

---

### 2.3 `songs`

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | PK AUTOINCREMENT |
| artist_id | INTEGER | NOT NULL → `artists(id) ON DELETE CASCADE` |
| external_id | TEXT | NOT NULL; stable across refresh |
| slug, title, album, year, caption | TEXT | |
| cover_url, page_url, playback_url | TEXT | URLs |
| song_manifest_url | TEXT | |
| playback_scope, playback_quality | TEXT | |
| duration_seconds | INTEGER | |
| sort_order | INTEGER | NOT NULL DEFAULT 0 |

**Unique:** `(artist_id, external_id)`  
**Indexes:** `idx_songs_artist_id`  
**Rows:** 20  
**Owner:** Catalog subscribe; replaced on refresh

---

### 2.4 `liked_songs`

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | PK |
| song_id | INTEGER | UNIQUE → `songs(id) ON DELETE SET NULL` |
| source_artist_id | INTEGER | no FK |
| artist_name, title, … | TEXT | snapshot fields |
| page_url, playback_url | TEXT | NOT NULL |
| liked_at | TEXT | DEFAULT now |
| unavailable | INTEGER | 0/1/NULL probe state |

**Indexes:** `idx_liked_songs_liked_at DESC`  
**Rows:** 2  
**Owner:** Listener like toggle

---

### 2.5 `user_playlists` / `user_playlist_songs`

**Playlists rows:** 2 | **Song rows:** 4

Custom playlists use sidebar artist ids `-(10000 + playlistId)`.

**Notable constraints on `user_playlist_songs`:**
- `playlist_id` → `user_playlists(id) ON DELETE CASCADE`
- **Live DB:** `library_song_id` → `songs(id) ON DELETE SET NULL` *(present in DB; current `userPlaylists.js` CREATE TABLE source shows `library_song_id INTEGER` without REFERENCES — schema drift)*
- Partial unique indexes: `(playlist_id, library_song_id)` WHERE NOT NULL; `(playlist_id, page_url)` WHERE library_song_id IS NULL

---

### 2.6 `suno_demo_playlists` / `suno_demo_songs`

**Playlists:** 2 | **Songs:** 57

Sidebar artist id = `-playlistId`. Song id = `-2_000_000 - rowId`.

`suno_demo_songs.playlist_id` → `suno_demo_playlists(id)` (added via ALTER in migration).

---

### 2.7 `playlist_custom_orders`

| Column | Type |
|--------|------|
| playlist_key | TEXT | part of PK |
| song_id | INTEGER | part of PK |
| position | INTEGER |

**Index:** `(playlist_key, position ASC)`  
**Rows:** 68  
**Keys:** `liked`, `suno`, `suno:{id}`, `user:{id}`, `artist:{id}` (see `shared/listener/playlistOrder.ts`)

---

### 2.8 `catalog_song_skips`

**PK:** `(artist_id, external_id)` — no FK to artists  
**Rows:** 0

---

### 2.9 `song_cache` / `song_cache_assets`

**Rows:** 0 / 0 (dev DB)  
**FKs:** `artist_id`, `song_id` CASCADE; assets → cache CASCADE  
**Filesystem:** `{userData}/cache/{opaqueId}/`

---

## 3. Schema-Mutation and Migration Sites

There is **no** `PRAGMA user_version` bump and **no** migration history table (`user_version=0` on audited DB).

| Order | Location | Trigger | Mutation |
|-------|----------|---------|----------|
| 1 | `database.js` | Every startup | `CREATE settings`; WAL |
| 2 | `library.js` `initListenerSchema` | Every startup | CREATE artists/songs |
| 3 | `library.js` `migrateListenerSchema` | Every startup | ALTER artists: bio, social_json, song_count; songs: duration_seconds |
| 4 | `likedSongs.js` | Every startup | CREATE liked_songs |
| 5 | `sunoDemoSongs.js` | Every startup | CREATE suno_demo_songs |
| 6 | `sunoDemoPlaylists.js` | Every startup | CREATE suno_demo_playlists; ALTER add playlist_id; orphan backfill |
| 7 | `userPlaylists.js` | Every startup | CREATE playlists/songs; ALTER site_root_normalized; **repairUserPlaylistSnapshots()** |
| 8 | `playlistOrder.js` | Every startup | CREATE playlist_custom_orders |
| 9 | `songSkips.js` | Every startup | CREATE catalog_song_skips |
| 10 | `cache/schema.js` | Every startup | CREATE cache tables; ALTER html_rewrite_revision |
| 11 | `ipc.js` `artist:loadProjects` | On load | Migrate `artist:draft` → `artist:projects` |
| 12 | `commandService.js` | Startup | Seed default `commands.mappings` if null |

**Idempotency:** All use `IF NOT EXISTS` or column presence checks — generally safe to re-run.

**Risk:** Order-dependent; new modules must run after dependencies. `repairUserPlaylistSnapshots` performs O(n) updates at startup when snapshots incomplete.

---

## 4. Active Pragma Inventory

### Configured in code (`database.js`)

| Pragma | Value |
|--------|-------|
| journal_mode | WAL |

### Observed on audit copy (defaults unless noted)

| Pragma | Value | Notes |
|--------|-------|-------|
| journal_mode | wal | |
| synchronous | 1 | NORMAL |
| foreign_keys | **0** | **Not enabled** |
| busy_timeout | 0 | Not set in app code |
| cache_size | 2000 | pages |
| page_size | 4096 | |
| temp_store | 0 | default |
| mmap_size | 0 | |
| user_version | **0** | unused |
| wal_autocheckpoint | 1000 | |
| journal_size_limit | 32768 | |
| sqlite_version | 3.43.2 | via bundled better-sqlite3 |

---

## 5. Row Counts and File Sizes

**Live path (not modified):**  
`~/Library/Application Support/song-pages/database/app.db`

**Audit copy:** `song-pages/.audit-db-copy/app.db`

| File | Size (bytes) |
|------|----------------|
| app.db | 516,096 (~504 KiB) |
| app.db-wal | 164,832 (~161 KiB) |
| app.db-shm | 32,768 (32 KiB) |

| Table | Rows |
|-------|------|
| settings | 33 |
| artists | 2 |
| songs | 20 |
| liked_songs | 2 |
| user_playlists | 2 |
| user_playlist_songs | 4 |
| suno_demo_playlists | 2 |
| suno_demo_songs | 57 |
| playlist_custom_orders | 68 |
| catalog_song_skips | 0 |
| song_cache | 0 |
| song_cache_assets | 0 |

---

## 6b. Relationship Classification (Snapshot-First Revision)

Full philosophy: [persistence-philosophy.md](./persistence-philosophy.md)

| Entity / link | Class | FK recommendation |
|---------------|-------|-------------------|
| `artists` → `songs` | Ownership (local catalog mirror) | FK CASCADE reasonable when enabled |
| `user_playlists` → `user_playlist_songs` | Ownership | FK CASCADE reasonable |
| `user_playlist_songs` body fields | **Snapshot** | No catalog FK |
| `user_playlist_songs.library_song_id` | **Convenience reference** | **No FK** |
| `liked_songs` body + `song_id` | Snapshot + convenience | Optional SET NULL; never CASCADE delete row |
| `suno_demo_*` | Ownership within feature / snapshot content | Internal FK only |
| `song_cache` / assets | Cache + ownership | FK to catalog row OK (regenerable) |
| `catalog_song_skips` | Derived overlay | No FK; keyed by `external_id` |
| `playlist_custom_orders` | Derived | No FK |
| `settings` blobs | Config / snapshot JSON | N/A |

---

## 6c. Playlist Architecture Review (No Code Changes)

**Verdict:** Custom playlists are **substantially aligned** with Snapshot-First. Reads do not join `songs`.

| Component | Alignment | Notes |
|-----------|-----------|-------|
| `userPlaylists.js` design doc | ✓ | Self-contained snapshots at write |
| `listUserPlaylistSongs` | ✓ | No catalog JOIN |
| `materializePlaylistSnapshot` | ✓ | Write-time copy/enrich |
| `library_song_id` | ⚠ Convenience | Stale OK; live DB FK is wrong direction |
| `repairUserPlaylistSnapshots` | ⚠ Monitor | Startup repair vs historical preservation |
| `likedSongs.listLikedSongs` | ⚠ Hybrid | Read-time LEFT JOIN with COALESCE fallback |
| `playlist_custom_orders` | ✓ Derived | Order overlay, not snapshot body |

**Conflicts requiring future product/engineering decision (document only):**

- Should startup repair **upgrade** snapshots when catalog has newer metadata, or only fill **missing** fields?  
- UI treatment for ghost/stale entries (expected product behavior).

---

## 6. Data Classification and Source-of-Truth Maps

### 6.1 Classification

| Class | Tables / keys | Backup priority | Rebuildable? |
|-------|---------------|-----------------|--------------|
| **Durable user data** | user_playlists*, liked_songs, playlist_custom_orders, catalog_song_skips, ui.* settings, vc.*, kudos.*, commands.*, artist:projects | **High** | Partially |
| **Imported catalog** | artists, songs | Medium | Yes — re-subscribe |
| **Regenerable cache** | song_cache*, filesystem cache | Low | Yes |
| **Demo / optional** | suno_demo_* | Medium | Re-import |
| **Legacy** | artist:draft | Low | Migrate to projects |

### 6.2 Source of truth by entity

| Entity | Authoritative source | Local SQLite role | On conflict |
|--------|---------------------|-------------------|-------------|
| Subscribed artist catalog | Remote `songpages-catalog.json` + artist manifest | Cache + user subscription record | Refresh replaces songs |
| Song metadata (subscribed) | Remote manifests at subscribe time | `songs` rows | Refresh wins |
| Liked song | User action | `liked_songs` (+ optional live join to `songs`) | Snapshot survives song delete (SET NULL) |
| Custom playlist | User | `user_playlists` + snapshot rows | Self-contained |
| Suno demo track | Suno API at import | `suno_demo_songs` | Re-fetch clip |
| Playlist order | User drag | `playlist_custom_orders` | Prunes missing ids |
| Skip flags | User | `catalog_song_skips` by external_id | Survives refresh |
| HLS cache | Fetched bytes | FS + `song_cache` metadata | LRU eviction |
| VC layout | User | `vc.lastConfig`, `vc.surfaceDesigns` | Normalize on read |
| Host content | User + files | `vc.hostContent` + `host-content/media/` | Catalog points to paths |
| Kudos | User | `kudos.presets` | migrateKudosState |
| Commands | User + defaults | `commands.mappings` | migrateMappingState |
| UI prefs | User | `ui.*` keys | normalize* helpers |

---

## 7. Settings Key Inventory

**Store:** `settings` table — values JSON-stringified via `JSON.stringify` on write; `JSON.parse` on read with fallback to raw string on parse failure.

**IPC:** Unvalidated any-key read/write.

### 7.1 Core keys

| Key | Owner module | Type / version | Default | Malformed behavior |
|-----|--------------|----------------|---------|------------------|
| `ui.theme` | `useAppTheme` | string | app default theme | Coerced in hook |
| `ui.listenerSidebarCollapsed` | `ListenerMode` | boolean JSON | `false` | Treated as false if invalid |
| `ui.listenerSidebarWidth` | `ListenerMode` | number JSON | `304` | Clamped MIN–MAX |
| `ui.listenerPlayer` | `normalizeListenerPlayerSettings` | object | `{ seekTimeDisplay: 'remaining' }` | Reset to default |
| `ui.listenerLyrics` | `normalizeListenerLyricsDisplaySettings` | object | `{ removeBrackets: false }` | Reset to default |
| `ui.listenerSidebarOrder` | `normalizeSidebarLibraryOrder` | number[] | `[]` | Empty array |
| `ui.listenerSidebarSort` | `normalizeSidebarLibrarySort` | object | `{ column:'order', direction:'asc' }` | Default sort |
| `vc.lastConfig` | `migrateVcConfig` + `normalizeVcConfig` | VcModeConfig | factory default | Migrated + normalized |
| `vc.hostContent` | `migrateHostContentCatalog` | catalog v2 | empty catalog | Migrated |
| `vc.surfaceDesigns` | `migrateVcSurfaceDesignCatalog` | version **1** | default design | Sanitized catalog |
| `kudos.presets` | `migrateKudosState` | KUDOS_STATE_VERSION | starter presets | Defaults on failure |
| `commands.mappings` | `migrateMappingState` | v2 | seeded in main | Defaults + warn log |
| `visualizer.activeExperienceId` | `useVisualizerManager` | string | registry default | Fallback chain |
| `visualizer.activePluginId` | *(legacy read)* | string | — | Fallback only |
| `visualizer.preference.mainPlayer` | `useVisualizerManager` | string | — | Fallback |
| `visualizer.settings.{experienceId}` | per-experience blob | object | schema defaults | Field defaults |
| `artist:projects` | `ipc.js` | ArtistProjectsState | `{ projects:[] }` | Migration from draft |
| `artist:draft` | legacy | — | — | Migrated once to projects |
| `cache.maxSongEntries` | `cacheManager` | number | DEFAULT_MAX | Default if missing |

**Not in audited DB:** `cache.maxSongEntries` (uses code default when absent).

See [persistence-philosophy.md](./persistence-philosophy.md) for why playlist and user artifacts are intentionally denormalized.

### 7.2 Non-SQLite persistence (documented for completeness)

| Key | Store | Owner |
|-----|-------|-------|
| `songpages:audio-debug` | localStorage | dev audio debug |
| `songpages:audio-debug-panel` | localStorage | dev |
| `songpages:effects-lab-panel` | localStorage | effects lab |
| Guest site player | sessionStorage | compiled sites only |

---

## 8. Declared Foreign Keys (Not Enforced at Runtime)

**Revised per [persistence-philosophy.md](./persistence-philosophy.md):** classify before enabling. **Do not enable blanket FK until §15–16 approved.**

| Child table | Column | Parent | ON DELETE | Class | Enforce if FK on? |
|-------------|--------|--------|-----------|-------|-------------------|
| songs | artist_id | artists | CASCADE | Ownership | **Yes** |
| liked_songs | song_id | songs | SET NULL | Convenience | Optional SET NULL |
| song_cache | artist_id | artists | CASCADE | Cache | **Yes** |
| song_cache | song_id | songs | CASCADE | Cache | **Yes** |
| song_cache_assets | cache_id | song_cache | CASCADE | Ownership | **Yes** |
| user_playlist_songs | playlist_id | user_playlists | CASCADE | Ownership | **Yes** |
| user_playlist_songs | library_song_id | songs | SET NULL | Convenience | **No — remove from DDL** |
| suno_demo_songs | playlist_id | suno_demo_playlists | *(none)* | Ownership (demo) | Consider |

**No FK (correct):** `catalog_song_skips.artist_id`, `playlist_custom_orders`, `liked_songs.source_artist_id`, `user_playlist_songs.source_artist_id`

### Snapshot-First invariant

**Catalog song deletion must never CASCADE-delete `user_playlist_songs` rows.**  
Convenience columns may stale or NULL; snapshot body must remain.

### Workflows (revised)

| Workflow | Catalog mirror (ownership) | User snapshots |
|----------|---------------------------|----------------|
| `deleteArtist` | Remove artist + songs (+ cache) | Playlists **unchanged**; `library_song_id` may stale |
| Catalog refresh | Replace songs for artist | Snapshots **unchanged** |
| Delete custom playlist song | — | DELETE snapshot row (user intent) |
| Unlike | — | DELETE liked row |

---

## 9. Integrity Check Results (Copied DB Only)

**Method:** Copy taken 2026-07-10; app not quiesced (WAL copied with main file).

| Check | Result |
|-------|--------|
| `PRAGMA quick_check` | **ok** |
| `PRAGMA foreign_key_check` (FK=ON for check) | **no violations** |
| Manual orphan probes (songs→artists, liked→songs, cache→artists/songs) | **0 orphans** |

**Caveat:** Copying live WAL without checkpoint may be slightly stale; integrity ok on copy does not replace quiesced backup procedure.

---

## 10. Query Plan Evidence (Copied DB)

### `listArtists` (correlated song_count)

```
SCAN artists
CORRELATED SUBQUERY COUNT songs USING idx_songs_artist_id
TEMP B-TREE ORDER BY name
```

At 2 artists: negligible. At 50 artists × thousands of songs: consider using denormalized `song_count` only (column exists).

### `listSongsForArtist`

```
SEARCH songs USING idx_songs_artist_id
TEMP B-TREE ORDER BY sort_order, title
```

**Good** — uses index.

### `user_playlist_songs` by playlist

```
SEARCH USING idx_user_playlist_songs_playlist
TEMP B-TREE ORDER BY added_at
```

**Good.**

### `settings` get by key

```
SEARCH USING sqlite_autoindex_settings_1 (key=?)
```

**Good.**

### `playlist_custom_orders`

```
SEARCH USING idx_playlist_custom_orders_key_pos
```

**Good.**

### `listLikedSongs`

```
SCAN liked_songs USING idx_liked_songs_liked_at
```

Acceptable at small row counts.

---

## 11. Feature Traces

### 11.1 Subscribe / import

```
Renderer: app.listener.subscribe(siteUrl)
  → ipc listener:subscribe
  → subscribe.js subscribeArtist
      → fetch songpages-catalog.json (+ optional artist manifest)
      → library.upsertArtistFromCatalog
          → UPDATE or INSERT artists
          → [optional] cacheManager.invalidateArtistSync on build_version change
          → DELETE songs WHERE artist_id (refresh path)
          → db.transaction: INSERT songs batch
  ← { artist, songs }
```

**Source of truth:** Remote JSON manifests.  
**Transaction gap:** DELETE + INSERT not one outer transaction.

### 11.2 Playlist mutation (custom)

```
createUserPlaylist → INSERT user_playlists
addSongToUserPlaylist → materializePlaylistSnapshot → INSERT user_playlist_songs
removeUserPlaylist → DELETE playlist (CASCADE songs if FK on) + clearCustomOrder
moveSongToUserPlaylist → transaction in userPlaylists.js (delete + insert)
saveCustomOrder → transaction DELETE+INSERT playlist_custom_orders
```

### 11.3 Settings persistence (generic)

```
Renderer saveSettings(key, value)
  → ipc settings:save
  → JSON.stringify → INSERT OR REPLACE settings
```

No validation layer. Critical domains also normalize on **read** in renderer/main.

### 11.4 VC designs

```
vcSurfaceDesignStore / VcModeModal
  → getSettings('vc.surfaceDesigns') + migrateVcSurfaceDesignCatalog
  → saveSettings catalog + activeDesignId
  → active layout also in vc.lastConfig (debounced autosave)
```

Dual storage: **catalog of designs** + **active config snapshot**.

### 11.5 Kudos

```
useKudoPresets / ControllerWindowApp
  → getSettings('kudos.presets')
  → migrateKudosState → normalize
  → saveSettings on CRUD
```

### 11.6 Command bindings

```
initCommandService → loadMappingState from commands.mappings
KeyBindingsPanel → commands:saveState → migrateMappingState → setSetting
Global shortcuts registered in main from mapping state
```

Load failure → warn + default mappings (does not block startup).

---

## 12. Migration System Comparison (No Selection Yet)

| Approach | Current | PRAGMA user_version | migration_history table |
|----------|---------|---------------------|-------------------------|
| **Version tracking** | None (0) | Single integer | Rows per migration id |
| **Discovery** | Read module init order | One bump per release | Query applied ids |
| **Idempotency** | Per-module column checks | Sequential scripts must guard | Applied flag prevents re-run |
| **Rollback** | Manual restore | Manual restore | Manual restore |
| **Fit for Song Pages** | Works; fragile at scale | Minimal addition | Better audit trail |
| **Recommendation** | — | **Investigate first** for low ceremony | Consider if migration count grows |

**Do not adopt a third-party migration library** without explicit approval per audit spec.

---

## 13. Synthetic ID Namespaces (Documented, Not Redesigned)

| Kind | Artist / row id | Song id | Module helpers |
|------|-----------------|---------|----------------|
| Liked Songs (sidebar) | **0** (synthetic, not in DB) | positive library id or negative liked synthetic | `likedSongs.ts`, `sidebarLibraryOrder.ts` |
| Suno playlist | **-playlistId** | **≤ -2_000_000** | `sunoDemo/feature.js` |
| Custom playlist | **≤ -10_001** (= -10000 - playlistId) | **≤ -3_000_000** | `userPlaylists.js` |
| Real subscribed artist | **≥ 1** | positive `songs.id` | `library.js` |

**Dependencies:** `ipc.js listener:listSongs` dispatch, sidebar merge in `ListenerMode`, playlist order keys, VC display names (`playlistKinds.ts`), sort/order settings.

**Hardening without ID redesign:** Central `shared/listener/idNamespace.ts` exporting predicates (`isCatalogArtistId`, `isSyntheticSongId`, …) — **investigate** in small slice; re-export from existing modules for compatibility.

---

## 14. Proposed Individually Approvable Slices

### Slice A — Settings registry documentation

| Field | Value |
|-------|-------|
| Scope | Update `settings-and-persistence.md` only |
| Data impact | none |
| Migration | none |
| Rollback | revert doc |
| Tests | none |
| Priority | P2 |
| **Status** | **Implemented 2026-07-10** |

### Slice B — Quiesced backup script

| Field | Value |
|-------|-------|
| Scope | Script copies `app.db`, `-wal`, `-shm`; verifies quick_check + row counts |
| Data impact | none (read-only copy) |
| Rollback | delete script |
| Tests | `npm run backup:db` |
| Priority | P1 |
| **Status** | **Implemented 2026-07-10** — `npm run backup:db` |

### Slice I — `library_song_id` de-relationalize

| Field | Value |
|-------|-------|
| Scope | **Remove** FK from DDL where present; keep column as convenience reference; source without FK is canonical |
| Depends on | [persistence-philosophy.md](./persistence-philosophy.md); revised Slices C/E |
| Data impact | None if migration preserves rows |
| Tests | Add playlist row → delete catalog song → row survives; `library_song_id` may stale |
| **Status** | **Implemented 2026-07-10** — `convenienceFkMigration.js`; see [archive/investigations/data-layer-library-song-id-fk-investigation.md](./archive/investigations/data-layer-library-song-id-fk-investigation.md) |

### Slice C — Scoped foreign key enablement

| Field | Value |
|-------|-------|
| Scope | DDL audit (ownership FKs only) + `foreign_keys=ON` in `initDatabase()` after copied-DB tests |
| **Status** | **Deferred** — see §18 |
| **Rationale at closure** | No user-visible problem today; Slice I aligned DDL; enable only if orphan catalog data recurs |

### Slice E — Explicit mirror cleanup (`deleteArtist`)

| Field | Value |
|-------|-------|
| Scope | Mirror cleanup on unsubscribe; **do not** touch `user_playlist_songs` snapshots |
| **Status** | **Deferred** — see §18 |
| **Rationale at closure** | Orphan `songs` rows are invisible at current scale; small fix to bundle with listener library work |

### Slice D — Atomic catalog upsert transaction

| Field | Value |
|-------|-------|
| Scope | Wrap artist update + song delete + insert in `upsertArtistFromCatalog` |
| Data impact | none on success; prevents empty catalog on crash |
| Rollback | revert commit |
| Tests | `electron/listener/libraryUpsert.test.js` |
| Priority | P1 |
| **Status** | **Implemented 2026-07-10** |

### Slice F — Schema version spike (investigation only)

| Field | Value |
|-------|-------|
| Scope | Design doc + optional `schema_migrations` table **without** retroactive backfill |
| **Status** | **Removed from active backlog** — trigger: content editor persistent tables |

### Slice G — Synthetic ID helper module

| Field | Value |
|-------|-------|
| Scope | `shared/listener/idNamespace.ts`; re-exports from existing files |
| **Status** | **Deferred** — trigger: new synthetic ID namespaces (e.g. content editor) |

### Slice H — Settings IPC allowlist (incremental)

| Field | Value |
|-------|-------|
| Scope | Log unknown keys; optional warn on write; domain handlers for new features |
| **Status** | **Removed from active backlog** — add domain IPC for new editor settings when that ships |

---

## 15. Deletion Consequence Table (Snapshot-First Revision)

**Purpose:** Align delete/unsubscribe behavior with [persistence-philosophy.md](./persistence-philosophy.md).  
**Invariant:** User snapshot rows (`user_playlist_songs`, etc.) **survive** catalog mirror deletion. Stale/ghost UI is OK.

| Trigger | Catalog mirror (`artists`/`songs`/cache) | User snapshots | Convenience refs | Derived overlays |
|---------|------------------------------------------|----------------|------------------|------------------|
| **Unsubscribe artist** | DELETE artist (songs should go with mirror) | **Playlist rows kept** | `library_song_id` may stale | Skips may remain |
| **Catalog refresh** | REPLACE songs for artist | **Unchanged** | ids may stale | Skips preserved (`external_id`) |
| **Remove playlist track** | — | DELETE snapshot row | — | Order synced |
| **Unlike** | — | DELETE liked row | — | — |
| **Delete custom playlist** | — | CASCADE playlist songs | — | `clearCustomOrder` |

### Current implementation gaps (FK off today)

| Issue | Snapshot-First concern |
|-------|------------------------|
| `deleteArtist` DELETE artist only | Orphan **catalog** rows — mirror cleanup bug, not snapshot loss |
| `library_song_id` stale after refresh | **Expected** — not a bug |
| `repairUserPlaylistSnapshots` at startup | May conflict if it overwrites historical snapshots — **policy TBD** |

### Open product questions

1. Should `deleteArtist` explicitly DELETE owned catalog children (mirror cleanup)? **Yes** — does not touch playlists.  
2. Should `catalog_song_skips` clear on unsubscribe? **Optional** — overlay, not snapshot.  
3. Should startup repair only fill **missing** snapshot fields? **Prefer yes** for Snapshot-First.  
4. Liked Songs: always snapshot-capable when live `song_id` null? **Yes** — already partially implemented.

---

## 16. Slices C + E — Reference Proposal (Deferred)

**Status:** Not scheduled. Preserved as reference if Slice C or E is triggered per §18.

**Prerequisite:** [persistence-philosophy.md](./persistence-philosophy.md), §15. Slice I complete.

### Slice C — Scoped foreign key enablement

1. **DDL audit:** Confirm convenience FKs removed (Slice I ✓); verify ownership FK set only.  
2. `npm run backup:db` (app quit).  
3. Test on copied DB with `PRAGMA foreign_keys=ON`.  
4. Add pragma to `initDatabase()` only with ownership FK set confirmed.

**Expected with scoped policy:**

- `DELETE artists` → cascades **catalog mirror** (`songs`, `song_cache`)  
- **Does not** delete `user_playlist_songs` rows  
- `library_song_id` may stale — no FK (Slice I); column value preserved on catalog delete

### Slice E — Explicit mirror cleanup (`deleteArtist`)

Paired with Slice C in same release:

| Step | Action |
|------|--------|
| 1 | `invalidateArtistSync` (cache FS + DB) — already runs |
| 2 | DELETE catalog mirror: songs + artist (or rely on ownership CASCADE after C) |
| 3 | **Do not** DELETE or UPDATE `user_playlist_songs` snapshot rows |
| 4 | Optional: `clearCustomOrder(\`artist:${id}\`)` for **order overlay** only |
| 5 | Optional: clear `catalog_song_skips` for artist |
| 6 | Test: playlist entry survives unsubscribe; playback uses snapshot URLs; UI may show stale/ghost |

**Rollback:** Remove FK pragma; restore backup; revert cleanup code.

---

## 17. Phase 2 Implementation Log

| Slice | Status | Notes |
|-------|--------|-------|
| **A** Settings registry | **Done** | `settings-and-persistence.md` updated |
| **B** Backup script | **Done** | `scripts/backup-database.mjs`, `npm run backup:db` |
| **D** Atomic catalog upsert | **Done** | `library.js` + `libraryUpsert.test.js` |
| **Philosophy doc** | **Done** | [persistence-philosophy.md](./persistence-philosophy.md) |
| **Audit revision** | **Done** | Snapshot-First §6b–6c, §8, §15–16 |
| **I** library_song_id | **Done** | Convenience FK removed from DDL + startup migration |
| **C + E** Scoped FK + mirror cleanup | **Deferred** | §18 — not scheduled |
| **G** ID namespace helpers | **Deferred** | Trigger: new ID namespaces |
| **H** Settings IPC allowlist | **Removed** | Domain IPC when editor ships |
| **F** Schema version spike | **Removed** | Trigger: content editor tables |

**Verify implemented work:** `npm run test:db` (atomic upsert + convenience FK migration; temp DB only).

---

## 18. Deferred Items — Revisit Triggers

When future product work touches persistence, start with [persistence-philosophy.md](./persistence-philosophy.md) (classify the relationship), then check whether a trigger below applies.

| Item | Revisit when |
|------|----------------|
| **Slice C** — enable `foreign_keys` | Orphan catalog rows become a recurring bug; or library scale makes DB-level ownership enforcement worth the smoke-test cost |
| **Slice E** — `deleteArtist` cleanup | Next listener library / unsubscribe UX work (does not require Slice C) |
| **Slice F** — schema versioning | Content editor (or similar) adds new persistent SQLite tables |
| **Slice G** — ID namespace helpers | New synthetic ID namespaces confuse sidebar routing or IPC dispatch |
| **Slice H** — settings boundary | Content editor introduces a new settings domain worth dedicated IPC |
| **Finding 8** — `listArtists` query | Profiling shows sidebar load pain at large artist/song counts |
| **§15 open questions** | Playback/playlist polish (ghost UI, repair policy) — product backlog, not persistence infrastructure |

**Default:** Resume feature development. No further audit slices unless a row above applies.

---

## Appendix A — IPC Channels Touching Persistence

**Settings:** `settings:get`, `settings:save`  
**Artist workspace:** `artist:loadProjects`, `artist:saveProjects`, `artist:loadDraft`, `artist:saveDraft`  
**Commands:** `commands:getState`, `commands:saveState`, `commands:init` (via startup)  
**Listener (partial):** `listener:listArtists`, `listener:listSongs`, `listener:subscribe`, `listener:refresh*`, playlist CRUD, Suno CRUD, like/skip, playlist order, cache*, `listener:removeArtist`  
**Host content:** via `hostContent.js` IPC + `vc.hostContent` setting

Full handler list: `electron/ipc.js` (~760 lines).

---

## Appendix B — Audit Method Notes

- Live database was **not modified**.
- Integrity SQL ran against **workspace copy** only.
- `foreign_key_check` enabled FK for diagnostic query only; application code unchanged.
- Packaged Windows/macOS paths not re-verified in this pass (see Application Audit for packaging checklist).

---

*Audit closed 2026-07-10. This document and [persistence-philosophy.md](./persistence-philosophy.md) are long-term architectural guidance — not an open implementation backlog.*
