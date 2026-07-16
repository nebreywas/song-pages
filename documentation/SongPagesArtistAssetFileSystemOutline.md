# Song Pages Artist Asset File System — Outline

**Status:** Working reference (not implemented)  
**Audience:** Product + engineering — lock storage philosophy before Artist 2.0 grows more “managed copy” paths  
**Related:** [persistence-philosophy.md](./persistence-philosophy.md) · [artist2-sprint-guide.md](./artist2-sprint-guide.md) · [settings-and-persistence.md](./settings-and-persistence.md)

---

## Purpose

Agree how Song Pages handles **file-based assets** for the artist catalog:

- What stays a **pointer** to the user’s own files
- When Song Pages **copies** a file into an app-managed directory
- How that managed tree is organized without becoming a full DAM / Git for media
- How managed files stay **recognizable to artists** in Finder / Explorer while catalog identity stays in the database

**Rule of thumb:** Song Pages is an index of catalog relationships and metadata. Local asset folders exist to support ingest, compile, and repair — not to replace the artist’s own file organization.

**Combined principle (revised):** Keep catalog identity stable in the database, keep managed files recognizable to the artist, preserve useful source names, and append machine identifiers only where they provide practical value.

---

## Core principles

1. **Users own their files.** Artists keep MP3s, WAVs, AIFFs, JPG/PNG, MP4s, `.txt`, `.md`, etc. wherever they want on disk.
2. **Default ingest is a pointer, not a copy.** The catalog stores a filesystem path (and role: recording, cover, …). The bytes stay where the user put them.
3. **Text is special.** `.txt` / `.md` may be **ingested into SQLite** (e.g. lyrics import) when product says so. Binary media is never stored in the DB.
4. **Managed copies are opt-in / system-required.** Examples that need a Song Pages–owned location:
   - Download from an external service (future: Suno MP3 if allowed; today: **static cover only**)
   - Explicit “store a copy in Song Pages recordings”
   - Anything that must survive if the user’s original path moves or disappears
5. **Compile and audit check pointers.** Missing files → warnings / audit report, not silent failure. Help the artist repair pointers; do not invent a file manager.
6. **Lazy tree.** Create the Documents-based `songpagesassets/{artist}/…` tree only when something actually needs a managed copy.
7. **Filesystem is recognizable, not canonical.** The managed tree should remain understandable when browsed directly. It is not the catalog of record — the database owns identity and relationships.
8. **Storage custody ≠ creative identity.** Copying a file into managed storage does not create a new Song / Recording / Container / Content object. It only changes where the bytes for an existing attachment live.

---

## What the catalog manages (always as roles + pointers)

| Kind | Typical formats | Usual storage mode |
|------|-----------------|--------------------|
| **Recordings** | mp3, wav, aiff, … | Pointer to user file; optional managed copy under `recordings/` |
| **Imagery** | jpg, png, webp, gif | Pointer; managed copy when imported (e.g. Suno still cover) |
| **Video** | mp4, … | Pointer; managed copy only if we download or “store a copy” |
| **Text / Markdown** | txt, md | Often ingested into DB (lyrics, notes); file may remain as source of truth for re-import |

Recordings are mostly finished songs, but may also be snippets, samples, interviews, podcasts.

---

## Design decisions (product)

### A. External pointer (user-organized)

- Store path + role on the catalog object.
- At **compile** (and ideally a lighter **asset audit**): verify readable; report failures with enough context to re-point.
- Do not rearrange the user’s folders.

### B. App-managed repository (`songpagesassets/`)

- Logical enough for humans and for “Reveal in Finder.”
- Not meticulous version trees (no `song/After Light/acoustic/v3/…` as a first-class product).
- Flat-ish under clear buckets; **`other/` and `uncategorized/` are first-class** — unknown classification must not block import.
- If the user moves files with the OS, pointers break → audit + re-point. We never pretend to track moves automatically.
- Filenames favor **human readability** (see Filename policy). Stable IDs live primarily in the catalog; short ID suffixes appear on disk only when needed for uniqueness or repair.

### C. Browse view (future)

- Read-only-ish UI over the managed tree: sort, search, light notes, “attached to which catalog objects?”
- No in-app delete / rename / move as default product features (use Finder; then repair pointers).
- Reveal in Finder is the escape hatch.
- **Exception (explicit command):** an optional **Rename Tool** action may rewrite a managed filename to a readable pattern using local catalog context — never as a side effect of ordinary catalog rename.

### D. Explicit storage provenance

The catalog should record **how** each asset is stored rather than inferring custody solely from its path. Suggested fields on the asset attachment (shape TBD at implement time):

| Field | Intent |
|-------|--------|
| `storageMode` | `external` \| `managed` |
| `sourceKind` | `local` \| `imported` \| `downloaded` \| `generated` |
| `sourcePath` | Optional original path (external or pre-copy) |
| `managedPath` | Optional Song Pages–managed path |
| `originalFilename` | Source filename before normalization |
| `contentHash` / `fileSize` / `modifiedTime` | Optional stale / duplicate / same-file detection |

- An **external** asset may have only `sourcePath`.
- A **managed** asset may retain both `managedPath` and useful source provenance.
- Supports audits, missing-file repair, migration, Reveal in Finder, duplicate detection, re-import, provenance UI, and future storage-policy changes.

### E. Storage custody vs creative identity

```text
Recording (catalog object — creative identity unchanged)
├── Role: deep mix
└── Asset storage
    ├── Before: external pointer
    └── After: managed copy   ← custody change only
```

- Managed files must not become duplicate creative objects.
- Content objects must not be confused with internal asset-file records.
- Moving between external and managed storage must not alter catalog identity.
- The filesystem must never become a competing source of truth.

---

## Proposed directory layout

**Root (locked preference):** under the user’s **Documents** tree so it is easy to find — not buried only in app `userData`. Exact path TBD at implement time (e.g. `Documents/Song Pages Assets/` or `Documents/songpagesassets/`). Reveal in Finder is required.

**Partitioning (locked):** **per artist** — most installs are one artist; multi-artist stays clear.

**Artist directory identity (revised):** combine a **human-readable slug** with a **short stable id** derived from the immutable Artist UUID. The folder should not auto-rename when the artist’s public name changes; the database remains authoritative for Artist → directory mapping.

```text
{Documents}/…/songpagesassets/
└── sawyer-house__8f31c2a4/       # {artistSlug}__{shortArtistId}
    ├── recordings/
    │   ├── songs/                 # flat — no per-song version folders
    │   ├── mixes-playlists/       # when known to be that role
    │   └── other/
    ├── images/
    │   ├── covers/                # when we know it was added as cover
    │   ├── artists/               # when we know artist/identity imagery
    │   └── other/                 # unknown stills (may later be covers/headshots)
    ├── videos/
    │   ├── covers/                # short cover loops, if ever stored locally
    │   ├── artists/
    │   ├── musicvideos/
    │   │   ├── common/
    │   │   ├── lyricvideo/
    │   │   ├── visualizervideo/
    │   │   └── other/
    │   ├── concert/
    │   ├── mix-playlist/
    │   └── other/
    ├── text/
    │   ├── lyrics/                # if we keep source files alongside DB ingest
    │   ├── content/
    │   └── other/
    └── uncategorized/             # final catch-all
```

**Intentional flatness under `recordings/songs/`:** Song Pages is not a derivative/version file manager. Versions belong in the **catalog** (Recording / Version objects), not as nested disk trees.

**VC host content (later):** likely moves toward something like `Documents/…/vc-host-content/media/` — separate from artist catalog assets; details in a later sprint.

---

## Filename policy (human readability first)

**Governing rule:** Filenames are primarily for artists; catalog IDs are primarily for Song Pages. Never treat the filename as the canonical identity of the asset.

### Preferred order when creating a managed file

1. **Preserve** a useful original source filename whenever practical.
2. **Generate** a readable filename from catalog context when the source name is opaque, missing, unsafe, or misleading.
3. **Append** role or version information when it helps distinguish the asset.
4. **Append** a short stable identifier when needed for uniqueness or repair.
5. **Never** use UUID-only filenames as the default.

### Preferred examples

```text
after-light.mp3
after-light-deep-mix.mp3
after-light-instrumental.wav
after-light-cover.png
after-light-lyric-video.mp4
```

When uniqueness is needed:

```text
after-light-deep-mix-8f31c2a4.mp3
after-light-cover-7be92a10.png
```

Avoid:

```text
8f31c2a4-43b9-4fd1-a621-13bc37b28918.mp3
```

### Preserving source filenames

When copying an existing local file into managed storage, preserve the original filename when it is safe, descriptive, and non-conflicting (e.g. `After Light Deep Mix Final.wav` may stay recognizable).

Song Pages may normalize:

- Characters invalid on supported operating systems
- Path separators
- Dangerous or control characters
- Excessive whitespace
- Filenames that exceed safe length limits

Normalization should not erase useful human meaning merely to enforce stylistic consistency.

### Generated filenames (downloads / opaque providers)

Provider names such as `63d914ea-7efb-4213-a3c1-49d40dddd459.mp3` should be replaced or augmented using catalog context, e.g.:

```text
after-light-main-recording-63d914ea.mp3
```

A generated name may include song/container slug, recording/version label, asset role, content type, and/or a short source or object id — without encoding the full catalog hierarchy into the filename.

### Collision handling

When two managed files would receive the same readable basename, append a **short stable identifier**. Prefer:

```text
after-light-deep-mix-8f31c2a4.mp3
```

over unstable OS-style numbering (`…-2.mp3`, `…-final-final.mp3`).

### Catalog renames do not rename files

Renaming a Song, Recording, Container, Content, or Artist in the catalog must **not** automatically rename existing managed files. Auto-renames would risk broken external references, unnecessary disk churn, audit confusion, and surprising artists who already recognize a filename.

- **New** managed files may use the **current** catalog title/slug at the time of ingest.
- **Existing** files may retain older names while remaining correctly linked via catalog records.
- An **explicit** **Rename Tool** command may rewrite a file later — opt-in only. Meaning: rename this file using local catalog context (help/tooltip to follow).

---

## Relationship to today’s code (do not “fix” yet)

Existing app paths are **not** this tree yet. When implementing, migrate or map consciously:

| Today | Role |
|-------|------|
| `{userData}/artist2/{artistId}/covers/` | Artist 2.0 Suno **static** cover downloads |
| `{userData}/host-content/media/` | VC Host Content graphics/video |
| `{userData}/artistpages/{slug}/` | **Compile output** (generated site) — not artist source assets |
| `{userData}/compile-uploads/` | Transient compile uploads |
| Artist 1.0 / Artist 2.0 song fields | Mostly **pointers** (`audioLocalPath`, `recording.audioPath`, artwork paths) |
| Artist 2.0 **Rename Tool** (covers today) | Explicit humanize of cover basenames (`{slug}-COVER[.n].{ext}`) using local catalog context — aligns with readability-first; collision suffix style may later prefer short id over `-2` |

`songpagesassets/` should become the **canonical managed-source** tree for artist authoring. Compile output and host-content can stay separate concerns (generated vs VC-specific).

---

## Agent / engineering commentary

### What is strong

- Clear split: **pointer-first** vs **managed copy when necessary**.
- Explicit rejection of becoming a DAM — matches Editor model (catalog owns relationships; files stay outside the DB).
- Compile + audit as the safety net for broken pointers is the right UX for independents who already have folder habits.
- Catch-all buckets (`other/`, `uncategorized/`) prevent classification from blocking ingest.
- Flat recordings folder + catalog-level versions is the correct layering.
- **Human-readable managed tree + explicit provenance** closes the gap between “machine-safe storage” and “artist can open Documents and understand what they have.”
- **Custody ≠ identity** prevents a common DAM mistake: copying a file and accidentally spawning a second creative object.

### Alignments (locked from product answers)

1. **Root location — Documents, not app-only**  
   Prefer a folder under the user’s Documents so artists can find it without digging into Application Support. Exact folder name at implement time. “Reveal in Finder” remains required. (Sandbox / permission details to solve when we build.)

2. **Per-artist partitioning**  
   Tree is rooted per artist. Folder name form: `{slug}__{shortArtistId}` (see layout). Most users have one artist; multi-artist stays unambiguous; slug changes do not force directory renames.

3. **Filename policy — human readability first** *(revises earlier “stable-id-only filenames” lock)*  
   Prefer preserved or catalog-derived readable names; append short stable ids only for collisions / repair. Catalog IDs remain the identity layer. See Filename policy above.

4. **Pointer identity + provenance**  
   Store paths plus optional hash / mtime / size, and explicit `storageMode` / `sourceKind` / original filename. Repair UI: “missing → pick new file.”

5. **Suno / external import policy** (already partially locked in Artist 2.0)  
   - Metadata + **static image** → managed `images/covers/` (or today’s temporary `artist2/…/covers`).  
   - Prefer readable cover names at download or via explicit rename (opaque provider UUIDs are not artist-friendly).  
   - **No** lyric video / animated cover by default (CDN abuse + size).  
   - MP3 / “store a copy”: **TBD for UX**, but **remote downloads are the first managed-copy need**. Do not block on a general “store a copy” default yet.

6. **Do not conflate with compile output**  
   `artistpages/` (under `userData` today) is a **build artifact**. Artists should not treat it as their asset library. Asset audit is about **source** pointers feeding compile.

7. **Host content**  
   Stays separate from artist catalog assets for now. Later: likely `Documents/…/vc-host-content/media/` (or similar). How host content shares imagery with Artist 2.0 is a later sprint — do not force-merge into `songpagesassets/` prematurely.

8. **Artist 1.0**  
   **No migration help for Artist 1.0** — it is going away. Managed tree and audits target Artist 2.0 only.

9. **Text ingest**  
   Lyrics in DB + optional retained source path under `text/lyrics/` is fine. Prefer one canonical body in SQLite for edit/compile; file is import source.

10. **Catalog rename ≠ filesystem rename**  
    Locked. Explicit rename-managed-file commands are allowed; automatic rename on metadata edit is not.

11. **Code hygiene note**  
    Separate from assets: audit script/module names and folder layout in the repo when convenient. Not a blocker for this filesystem model.

### Commentary on the revision (product ↔ engineering)

| Topic | Verdict |
|-------|---------|
| `slug__shortId` artist folders | Strong. Solves “slug rename vs Finder identity” without UUID-only folders. Implement: derive short id from Artist UUID; store mapped path (or short id) on the Artist row so lookup does not depend on parsing the folder name. |
| Human-readable filenames | Strong, and consistent with **Rename Tool**. Earlier stable-id-only policy was too machine-centric for Documents browsing. |
| Preserve source names on local copy | Agree. Cheap win; normalize only for safety/length. |
| Collision via short id vs `-2` | Prefer short id for **new** managed writes. Today’s cover rename uses `-COVER-2`; fine as interim — align when `songpagesassets/` lands. |
| No auto-rename on catalog rename | Agree — required. Auto-rename would fight pointer/provenance design. |
| Explicit storage provenance | Highest-leverage schema addition when we formalize assets. Even a thin `storageMode` + paths + `originalFilename` unlocks audit/repair without a DAM. |
| Custody ≠ creative identity | Keep this language in Editor model docs too — it prevents “promote to Content” and “store a copy” from being confused. |

**Watch-outs when implementing:**

- Readable names + multi-artist / multi-song similar titles → collisions are normal; short-id suffix must be boring and stable.
- “Preserve original” + Windows MAX_PATH / reserved names needs a shared sanitizer used by all managed writes.
- Provenance fields should live on the **attachment / recording asset record**, not duplicate the Song object itself.
- Browse view staying read-only remains correct even with an explicit rename command — rename is a surgical tool, not a file manager.

### Suggested implementation order (when we build this)

1. Documents root + per-artist `{slug}__{shortId}` layout + “Reveal assets folder”  
2. Asset attachment provenance fields (`storageMode`, paths, `originalFilename`, optional hash)  
3. Shared helpers: `resolveManagedAssetPath(…)`, `sanitizeManagedFilename(…)`, `buildManagedFilename(…)` (readable-first + short-id collision)  
4. Route new remote downloads (Suno cover first) through those helpers; migrate off `artist2/{id}/covers` when convenient  
5. Asset audit command (pointer check without compile)  
6. Optional browse view over managed tree  
7. Later: VC host-content Documents path + any shared-imagery story  

Until then, keep adding managed files in the smallest existing pockets (`artist2/…/covers`) and treat this outline as the **target** shape. Explicit cover rename remains a stopgap for opaque provider names.

---

## Decisions log (answered)

| Question | Decision |
|----------|----------|
| Root path | Prefer **Documents** (human-findable), not only app-specific dirs |
| Global vs per-artist | **Per artist** |
| Artist folder naming | **`{slug}__{shortArtistId}`** — readable + stable; no auto-rename on artist rename |
| Filename policy | **Human readability first**; short stable id suffix for collisions; no UUID-only defaults |
| Preserve source filename on local→managed copy | **Yes**, when safe and non-conflicting |
| Catalog rename → disk rename | **No** automatic; optional **Rename Tool** only |
| Storage provenance | **Explicit** (`storageMode`, source/managed paths, original filename, optional hash) |
| Managed copy vs new catalog object | **Custody only** — does not create creative identity |
| “Store a copy” default | **TBD**; early priority is **remote downloads** into managed storage |
| Artist 1.0 sharing | **No** — Artist 1.0 is being replaced; don’t invest in dual-tree support |
| Migration of `artist2/covers` + host-content | Covers fold into managed tree when built; host-content → Documents/`vc-host-content` later, separate sprint |

---

## Still open (implementation detail only)

- [ ] Exact Documents folder spelling (`Song Pages Assets` vs `songpagesassets`)
- [ ] Short-id length / alphabet (e.g. first 8 hex of UUID vs hash)
- [ ] Where provenance lives in schema (song.recording vs dedicated asset attachment table)
- [ ] macOS/Windows permission UX for Documents writes from Electron
- [ ] When “store a copy of my local MP3” becomes a product toggle vs remote-only
- [ ] Whether new managed downloads should humanize at write time or only via explicit rename
- [ ] Align interim cover rename (`…-COVER-2`) with short-id collision policy when managed tree ships

---

## Non-goals

- Version-control-like history of media files  
- Automatic sync when the user renames/moves files in Finder  
- Automatic filesystem rename when catalog titles change  
- In-app bulk file management (delete/move/organize as a product)  
- Storing binary assets in SQLite  
- Treating managed filenames as canonical identity
