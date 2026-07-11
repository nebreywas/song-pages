# Open Questions & Deferred Work

**Status:** Living backlog · **Last reviewed:** 2026-07-10  
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

## How to use this file

- **Starting a sprint?** Check if your feature touches a row above.
- **Agent proposing infra?** State which open question it solves *today*; if none, defer.
- **Resolved an item?** Update this file and the relevant architecture doc; move obsolete specs to archive.
