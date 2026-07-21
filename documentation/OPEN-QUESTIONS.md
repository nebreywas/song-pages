# Open Questions & Deferred Work

**Status:** Living backlog · **Last reviewed:** 2026-07-20  
**Not an implementation schedule** — items here are decisions or triggers, not automatic sprint tasks.

Use with [persistence-philosophy.md](./persistence-philosophy.md) and [README.md](./README.md). Resume product work (playback polish, VC Mode, content editor) unless a row below is explicitly pulled into a sprint.

---

## Source complexity (`src/`)

**Assessment (2026-07-10):** No project-wide `src/` refactor warranted. One concentration point — `ListenerMode.tsx` (~2.2k lines) — but playback, sidebar, player, and hooks are already partially extracted. VC Mode is large (~10k lines) but **distributed across many files**, not a single god module.

**Principle:** When a mode or area feels **feature-complete**, consider splitting remaining inline logic into imported modules/hooks — not preemptively while the UX is still moving.

| Area | Revisit when |
|------|----------------|
| `ListenerMode.tsx` | Playback polish done + profiling shows jank, or transport/state extraction is clearly stable |
| `ListenerSidebar.tsx` | Sidebar UX feature-complete |
| `VcModeModal` / designer popovers | VC designer feature-complete |
| CSS (`app.css`, `vcMode.css`) | Subsystem styling stabilizes — split by domain, not by line count alone |

See frozen application audit (archive) for ListenerMode transport/virtualization items — **profile first**, same deferral posture.

---

## Current product focus

- Playback polish
- VC Mode polish
- Content editor planning
- Continued feature work

Persistence and application audits are **closed** as active programs. Revisit rows below only when product work surfaces the trigger.

---

## Persistence (SQLite audit — closed)

Source: [Song Pages SQLite and Data Layer Audit.md](./Song%20Pages%20SQLite%20and%20Data%20Layer%20Audit.md) §15, §18.

| Question / item | Notes | Trigger to revisit |
|-----------------|-------|-------------------|
| Enable `foreign_keys` (ownership only) | DDL aligned (Slice I); pragma still off | Recurring orphan catalog rows |
| `deleteArtist` mirror cleanup | Orphan `songs` invisible at current scale | Listener unsubscribe UX work |
| Schema versioning (`user_version`) | Ad-hoc migrations sufficient today | Content editor adds new tables |
| Settings IPC allowlist | Generic IPC intentional for iteration | New editor settings domain |
| Synthetic ID helper module | Conventions work | New namespaces confuse routing |
| `listArtists` query optimization | ~2 artists in dev DB | Profiling shows sidebar pain |
| **`repairUserPlaylistSnapshots` policy** | Should repair fill **missing** fields only, not overwrite history | Playback/playlist polish |
| **Ghost/stale playlist UI** | Expected Snapshot-First behavior | Playback/playlist polish |
| Clear `catalog_song_skips` on unsubscribe? | Optional overlay hygiene | Product preference |

---

## Security (application audit — frozen)

Source: [archive/audits/Song Pages Application Audit.md](./archive/audits/Song%20Pages%20Application%20Audit.md) (Revision 2). **Approve commits individually** — not a bulk implementation mandate.

| Priority | Item | When to pull forward |
|----------|------|---------------------|
| P0/P1-high | Fetch URL policy (`fetchSongManifest`, `probeSongAvailability`) | Before exposing new remote fetch IPC or content editor fetches |
| P0 | Compile IPC trusted-root validation (`fileMap`, `outputRoot`) | Before expanding Artist compile from renderer |
| P1-high | Trusted-window navigation handlers | Shell navigation/XSS concern |
| P1 | hostContent path containment | Host content CRUD changes |
| P1 | Guest bind webContents verification | Guest webview changes |
| P1 | Guest `openExternal` scheme filter | Guest link handling changes |
| P1 | HLS mirror cleanup on unmount | Playback polish / memory investigation |
| P1-investigate | Butterchurn JPEG-in-IPC, ListenerMode timeupdate rerenders | Profile shows jank |
| P1 debt | Shell `webSecurity: false` / `sandbox: false` | Mitigation backlog; escalates if shell XSS path found |
| P1 | Per-window preload split | VC/visualizer privilege reduction |
| P1 | FFmpeg packaging/docs | Release/distribution push |

Guest song-page isolation is **mature** — see [guest-rendering-security.md](./guest-rendering-security.md).

---

## Audio & effects

| Item | Status |
|------|--------|
| Audio effects discovery sprint | **Deferred** — spec in [archive/sprints/audio-effects-update.md](./archive/sprints/audio-effects-update.md) |
| Effects lab evaluation template | [archive/sprints/effects-lab/](./archive/sprints/effects-lab/) |
| Bass Boost / Lo-Fi / rewind / stutter | Shipped; extend via audio-effects sprint when playback polish prioritizes it |

Canonical audio rules: [audio-pipeline.md](./audio-pipeline.md).

---

## Code health & tooling (batch pass — deferred)

Noted 2026-07-17 during a general review. None are runtime-breaking today (Vite/esbuild transpile without full type-checking); batch them rather than chasing piecemeal.

| Item | Notes | Trigger to revisit |
|------|-------|-------------------|
| `tsc --noEmit` reports ~50 type errors | Concentrated in `src/vc-mode/**`, `src/vc-window/**`, `src/visualizers/**` (butterchurn missing `.d.ts`, `BaseAudioContext` vs `AudioContext`, `RegionTarget.id`, readonly-tuple assignments). None touch playback/listener. | When VC/visualizer areas feel feature-complete; drive count to 0 |
| No `typecheck` / `lint` npm scripts | Add `"typecheck": "tsc --noEmit"` (and consider ESLint) so type errors become a usable gate | Same pass as above, or when CI is set up |
| `meydaLab narrative` unit test failing | Heuristic threshold assertion in the dev-only Meyda Lab (`src/audio/meydaLab/narrative.test.ts`); not shipping-critical | Meyda Lab tuning work |

---

## Content editor (upcoming)

No persistence schema committed yet. When editor work starts:

1. Read [persistence-philosophy.md](./persistence-philosophy.md) — editor artifacts are likely **snapshots** or **user-owned** data, not live catalog joins.
2. Consider schema versioning for **new editor tables only**.
3. Security audit P0 items if editor adds compile/fetch from new URL sources.

---

## VC / commands / kudos (shipped MVPs)

Behavior is documented in architecture docs. Original MVP specs archived:

- [archive/specs/song-pages-vc-mode-surface-view-designer-spec.md](./archive/specs/song-pages-vc-mode-surface-view-designer-spec.md)
- [archive/specs/Host-content-design.md](./archive/specs/Host-content-design.md)
- [archive/specs/song-pages-input-control-system.md](./archive/specs/song-pages-input-control-system.md)
- [archive/specs/kudos-system-1.md](./archive/specs/kudos-system-1.md)

Open product work: VC polish, visual control window (mentioned in commands spec), surface design UX — not schema audits.

---

## Web Voice / spoken interludes

Lab + first Listener slice: [web-voice-and-macos-tts.md](./web-voice-and-macos-tts.md). Demo mode: `CmdOrCtrl+5`. Radio mode: player menu next to Zen; voice picker in Settings.

| Decision | Revisit when |
|----------|----------------|
| Move curated voices from `radioVoices.ts` into an external config file | Catalog needs non-dev edits / multi-app reuse |
| Richer in-app Mac Enhanced install docs | Users hit missing Enhanced voices in the field |
| Windows / Linux voice catalogs | Non-Mac packaging of spoken interludes |
| Radio break probability / announcement set | Demo tuning after real listening |

Do **not** expose the full system voice list in product UI — freeze known-good entries only.

---

## Play stats / History-backed counts

History (`song_history` + `song_history_seeks`) is the durable listen log: starts, interruptions, playback seconds, and seek forward/back with from→to. Totals are derived on read (not stored per-playlist counters) so deleting a playlist does not erase lifetime song totals.

| Item | Notes | Trigger to revisit |
|------|-------|-------------------|
| Surface play counts in playlist / song UI | Playlist Year column double-click toggles Plays (History-backed, playlist-scoped). Setting `playCountDisplay` chooses All starts vs Estimated full. | Tune formula / show lifetime totals elsewhere |
| History prune vs long-term stats | History caps at 1000 rows; seeks prune with them. If lifetime stats must outlive the cap, add a rollup table on prune. | When 1000-row history feels short for stats |
| Estimated-play formula tuning | Soft: `Floor(starts − (interruptions − 0.5×seekHitStarts))`. Not rights accounting. | User feedback after counts are visible |

---

## Super modes (library-wide)

**Naming:** `SUPER [mode]` applies an action across the library (or a defined subset), not just the currently selected Artist/Playlist. First ship: **Super Shuffle** — double-tap the player-bar shuffle button; dotted underline while active; Next / natural-end draws from a **session snapshot** of all Artists & Playlists sidebar rows (captured when Super Shuffle turns on). Library adds/removes/skips apply the **next** time Super Shuffle starts. Deleted / missing picks skip forward to the next draw. Session-only (not persisted). Playlist-local shuffle remains a separate single-click toggle.

| Item | Notes | Trigger to revisit |
|------|-------|-------------------|
| Super Shuffle inclusion UI | Turn individual sidebar playlists on/off while Super Shuffle is active; Artists-only / Playlists-only filters | When designing how inclusion should display beside the sidebar |
| Persist Super Shuffle | Currently session-only like playlist shuffle | If users expect it to survive restart |
| Other SUPER modes | Same library-scope convention for future actions | New library-wide playback behaviors |
| Mid-session pool refresh | Snapshot is intentional; revisit if users expect live library edits during one Super Shuffle run | User feedback |
| Now-playing remove guards | Soft UI blocks for deleting/removing the playing song or its source playlist/artist (`nowPlayingGuards.ts`). Not foolproof against races. | If users need force-delete while paused |

---

## Shuffle strategies

Internal pluggable algorithms in `shared/playback/queue/shuffleStrategy.ts`. Product default is **`shuffle-bag`** (without-replacement). Legacy **`plain-random`** remains available. Future: **`shuffle-weight`** (bias popular songs before full 1× coverage). Active strategy is `ACTIVE_SHUFFLE_STRATEGY` until Settings exposes a picker. Playlist shuffle and Super Shuffle share the same strategies (separate bags).

**Memory:** bags store song **ids** only. ~20k numbers is a couple hundred KB — not a concern in Electron. Do not put full song rows in the bag.

| Item | Notes | Trigger to revisit |
|------|-------|-------------------|
| Settings UI for strategy | Expose `plain-random` / `shuffle-bag` / future modes | When users need to opt into legacy or weighted shuffle |
| `shuffle-weight` | Emphasize high-play songs before the pool is exhausted at 1× | Play-stats / discovery experiments |
| Persist strategy preference | Session-only constant today | When UI ships |

---

## How to use this file

- **Starting a sprint?** Check if your feature touches a row above.
- **Agent proposing infra?** State which open question it solves *today*; if none, defer.
- **Resolved an item?** Update this file and the relevant architecture doc; move obsolete specs to archive.
