# Artist 2.0 Sprint Guide

**Status:** Active · **Spec:** [Song-Pages-Editor-1.0-Revised-Catalog-and-Editor-Model.md](./Song-Pages-Editor-1.0-Revised-Catalog-and-Editor-Model.md)  
**Mode:** `Artist 2.0` (`Cmd+Shift+2`) — parallel to legacy Artist 1.0 until cutover

---

## North star

Validate the full Song Pages loop from the **new catalog model**:

```text
Artist 2.0 catalog → compile static site + manifests → manual upload → Listener subscribe → play
```

Editor UX premise (unchanged):

> **Find or create on the left. Define and connect on the right.**

**Current focus:** Content library now includes **Video** and **Audio** (plus Song Video stub). Prefer Song Recordings / Video section for publish attach; Content for reusable assets. See [Updated-Song-Fields-Design.md](./Updated-Song-Fields-Design.md).

---

## Tier status

| Tier | Focus | Status |
|------|--------|--------|
| **0 — Shell** | Mode, artist selector, sidebar, Song/Album/Content editors, insert arrow, promote artwork, SQLite + JSON | **Done** |
| **1 — Catalog integrity** | Delete impact scan, super-warn, deletion reports, soft delete + restore modal | **Done** |
| **2 — Catalog depth** | Playlist container, container type on create, richer text content editor, artist slug + deploy URL | **Done** |
| **3 — Compile bridge** | Map `artist2_*` catalog → existing compile pipeline; toolbar Compile; exclude soft-deleted | **Done** (Listener end-to-end QA when ready) |
| **4 — Site config** | Home page stub, compile warnings panel, preview / open-output entry | **Done** |
| **5 — Relationships** | Sister songs, selective link restore from reports | **In progress** |
| **6 — Pages & publish** | Page containers, full site presentation, in-app deploy | Deferred (may be reshaped by upcoming field formalization) |

---

## Locked product rules

- **Sidebar** = active catalog only. Deleted items / reports live in a **modal**.
- **Restore ≠ undo** — restores object definition, not memberships or artwork refs (selective re-link available from reports).
- **Content delete** = hard delete + report; no content restore in v1.
- **Compile / publish** excludes soft-deleted objects; reports are editor-only.
- **Artist 1.0** stays untouched until Artist 2.0 replaces it.
- **Suno import** = metadata + static cover only. Never MP3, lyric video, or animated cover. Cover is downloaded once into `userData/artist2/`.
- **Song containers:** Album and Playlist both use memberships. Different mixes stay sister Songs; format variants use multi-recordings on one Song.
- **Compile album field:** still resolved from **Album** membership only (playlists are editorial curation for now).

---

## Tier 5 — Relationships (current)

| Item | Notes |
|------|--------|
| **Related Songs** | Song payload `relatedSongs[]` — sister / remix / reinterpretation / sequel / acoustic / genre / lyrical / other |
| **Catalog →** | With a Song selected, → on another Song links both ways (default Sister); change type in the Related Songs section |
| **Selective repair** | Deletion reports: **Re-add to container** after restoring a Song (membership only). Artwork after Content hard-delete stays manual |
| **Multi-recordings** | Already stubbed earlier (publish one format variant) — not creative “versions” |

---

## Tier 4 — Site config (complete for authoring)

| Item | Notes |
|------|--------|
| **Compile readiness panel** | Toolbar **Compile site…** — ready / skipped / warnings |
| **Open output folder** | After a successful compile |
| **Home page stub** | Artist → Site: home headline + intro (not yet in static emit) |

---

## Upcoming (your field formalization)

Expect a large update on fields / catalog shape for sprints **after** initial production. Prefer additive stubs (payload JSON, relation kinds, site fields) that can be renamed or normalized without rewriting the editor shell.

---

## Dev notes

- Electron **main process** changes require full restart (`Cmd+Q`, `npm run dev`).
- Artist 2.0 tables: `artist2_artists`, `artist2_objects`, `artist2_memberships`, `artist2_deletion_reports`.
- Tests: `npm run test:db` (catalog), `npm test` (shared mapping / relations).
