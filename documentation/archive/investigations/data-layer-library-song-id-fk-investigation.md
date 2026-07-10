> **Archived investigation** (resolved Slice I). Canonical: [../../persistence-philosophy.md](../../persistence-philosophy.md).

# Investigation: `user_playlist_songs.library_song_id`

**Status:** Open — architectural direction set; Slice I DDL migration **implemented**  
**Principle:** [persistence-philosophy.md](./persistence-philosophy.md) — Snapshot-First  
**Audit:** [Song Pages SQLite and Data Layer Audit.md](./Song%20Pages%20SQLite%20and%20Data%20Layer%20Audit.md)  
**Date:** 2026-07-10 (revised after Snapshot-First review)

---

## Revised question

~~Should this become a stronger FK?~~

**Should `library_song_id` exist as a relational dependency at all?**

### Answer (product architecture)

**No — not as ownership or enforced integrity.**

`library_song_id` is an **optional convenience reference**:

| Role | Purpose |
|------|---------|
| Provenance | “User added this from library song N” |
| Dedup | Partial unique index `(playlist_id, library_song_id)` when known |
| Write-time helper | `enrichSongFromLibrary()` during add/move/repair only |

The **snapshot** is the row body: `title`, `artist_name`, `page_url`, `playback_url`, `cover_url`, `song_manifest_url`, `site_root_normalized`, etc. Playback and display must work when `library_song_id` is null or stale.

**Stale `library_song_id` is acceptable.**  
**Deleting or breaking playlist rows because a catalog song disappeared is not.**

---

## Schema drift (technical)

| Source | DDL |
|--------|-----|
| **Live DB** (audit copy) | `library_song_id INTEGER REFERENCES songs(id) ON DELETE SET NULL` |
| **Current source** (`userPlaylists.js`) | `library_song_id INTEGER` (no REFERENCES) |

### Snapshot-First interpretation

- **Current source without FK** → **aligned** with architecture.  
- **Live DB with FK** → **legacy misalignment** — implies relational dependency the product rejects.  
- `ON DELETE SET NULL` preserves playlist rows (good outcome) but still encodes wrong *semantic* (catalog owns playlist link).

**Do not add FK to new installs.** Future Slice I should consider **removing** FK from existing DBs if foreign keys are enabled globally — not adding it everywhere.

---

## Code review (relational vs snapshot assumptions)

| Code path | Assumption | Snapshot-First |
|-----------|------------|----------------|
| `listUserPlaylistSongs()` | Read stored rows only | ✓ Aligned |
| `materializePlaylistSnapshot()` | Copy/enrich at write | ✓ Aligned |
| `enrichSongFromLibrary()` | Join `songs` when id set | ✓ Write-time only |
| `findDuplicateEntryId()` | Match on `library_song_id` or `page_url` | ✓ Convenience |
| `repairUserPlaylistSnapshots()` at startup | Re-materialize incomplete rows from catalog | ⚠ Monitor — repair OK; must not overwrite intentional historical snapshots |
| Partial unique on `library_song_id` | Dedup | ✓ Convenience, not lifecycle |

No read-path `JOIN songs` for custom playlist listing — implementation already snapshot-first for reads.

---

## Reconciliation options (revised)

| Option | Description | Snapshot-First fit |
|--------|-------------|-------------------|
| **A. Document + keep source as-is** | No FK in CREATE; treat live DB FK as legacy | **Recommended baseline** |
| **B. Add FK to source (old audit rec)** | ~~Align new DBs to live FK~~ | **Rejected** — wrong semantics |
| **C. Migration to remove FK** | Rebuild table without `REFERENCES` on existing DBs | **Future Slice I** if FK pragma enabled |
| **D. Drop column eventually** | Rely on `page_url` identity only | Defer — provenance/dedup still useful |

**Recommendation:** **A now** (documented). **C later** only as part of scoped FK work — paired with audit §16 revision (ownership FKs only).

**Do not enable global `foreign_keys=ON` until Slice I direction is approved and snapshot tables are excluded from new enforced FKs.**

---

## Proposed slice (pending approval)

**Slice I — `library_song_id` de-relationalize (not “FK reconciliation”)**

| Field | Value |
|-------|-------|
| Scope | Keep source without FK; optional migration **removes** FK from live DBs; document column as convenience reference |
| Depends on | [persistence-philosophy.md](./persistence-philosophy.md); revised Slices C/E |
| Data impact | None if migration preserves rows; removes incorrect constraint metadata |
| Tests | Add playlist row → delete catalog song → row survives; `library_song_id` may stale |
| Rollback | Restore backup |

---

## Action items

- [x] Classify as convenience reference (not ownership)  
- [ ] Confirm `repairUserPlaylistSnapshots` policy vs historical snapshots  
- [x] Slice I: remove convenience FK from DDL + migrate existing DBs (`convenienceFkMigration.js`)  
- [ ] UI: ghost/stale indicators for unavailable snapshot entries (product, out of scope here)  
- [x] Include in revised Slices C/E — **exclude** `library_song_id` from enforced FK set  

---

*Do not enable `foreign_keys=ON` until jointly reviewed with Slice C/E. Slice I convenience FK removal is complete.*
