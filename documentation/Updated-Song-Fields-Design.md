# Song Editor MVP 1.0 Field Specification

**Status:** Working product specification  
**Scope:** Editable fields and section order for the Song object  
**Note:** Internal fields such as UUID, slug, created/modified timestamps, deletion state, and activity history remain part of the data model but do not need to appear in the primary editor flow.

# 1. Song
This first section contains the Song’s primary public identity and editorial content.

## Song Title
- **Field type:** Single-line plain text
- **Required:** Yes
- **Label:** `Song`
- **Purpose:** Canonical public title of the Song

The UI label may simply say **Song**, although the internal field should remain `title`.

## Subtitle
- **Field type:** Single-line plain text
- **Required:** No
- **Suggested maximum:** 160 characters
- **Purpose:** Optional secondary title or edition-style text

Examples:
- A Winter’s Tale
- Live from Austin
- Chapter Two

Subtitle should not be used for Recording-version labels such as “Deep Mix” when that information belongs to a specific Recording.

## Caption
- **Field type:** Single-line or compact multi-line plain text
- **Maximum:** 120 characters
- **Required:** No
- **Markdown:** No

Caption is a short presentational line associated with the Song.

It is not the Song description.

Possible uses include:
- A concise hook beneath the title
- A one-line creative statement
- A short contextual caption for cards and featured displays

## About / Description
- **Field type:** Multi-line text
- **Maximum:** 1,000 characters
- **Required:** No
- **Markdown:** Yes
- **Editor:** Write / Preview toggle

This is the primary public description of the Song.

It may describe:
- The Song’s meaning
- Its origin
- Its musical concept
- Its production context
- Relevant background for listeners

## Primary Artwork Preview

When a Primary Cover exists, show a mirrored preview near the Song Title and top-level identity fields.

This preview is not a separate image field. It reflects the Primary Cover selected in the Artwork section.

# 2. Overview

## Creation Date
- **Field type:** Date
- **Required:** No
- **Supports incomplete dates:** Recommended later

For MVP, an exact date field is acceptable. The schema should eventually permit year-only or month-and-year precision.

## Primary Genre
- **Field type:** Single tag selector
- **Required:** No
- **Cardinality:** One

The Primary Genre is the Song’s principal catalog classification.

## Additional Genres
- **Field type:** Tag selector
- **Required:** No
- **Cardinality:** Multiple

Additional Genres should not duplicate the Primary Genre.

## BPM
- **Field type:** Numeric
- **Required:** No
- **Suggested range:** 20–400
- **Decimals:** Optional

The application may eventually derive or suggest BPM through audio analysis, but the MVP field is manually editable.

## Instrumental
- **Field type:** Checkbox
- **Default:** Off

When checked, the Song is considered intentionally instrumental.

This is distinct from a Song that simply has no Lyrics entered yet.

# 3. Links, Distribution, and Social Media
This section should use a table or structured list supporting multiple entries.

Each row represents one Link record.

## Common Link Fields
Every Link should contain:

| Field | Purpose |
|---|---|
| Type | Web, Song Pages, Streaming, Social, or Distribution Provider |
| Provider | Preset provider where applicable |
| Label | Optional custom display label |
| URL | Complete URL entered by the artist |
| Visibility | Public or Private |
| Sort Order | Display ordering |
| Notes | Optional private administrative note |

The application should validate that a URL is structurally valid but should not attempt to construct, prepopulate, or modify provider URLs.

## Add Link Workflow

```text
Add Link
├── Web Link
├── Song Pages
├── Streaming Service
├── Social Post
└── Distribution Provider
```

## 3.1 Web Link

Used for any relevant general-purpose external page.

Fields:
- Link Name
- URL

Examples:
- Fan site
- Review
- Press article
- Project website
- Related essay

The Link Name is required because the application cannot infer the meaning of an arbitrary web address.

## 3.2 Song Pages
Song Pages should be treated as a first-class distribution destination.

However, this should ideally be a **generated or system-managed link**, not a normal user-entered URL.  We will figure that out later when we better define the entire publishing process for compiled sites.

Possible states:
- Not yet published
- Preview available
- Published Song Page
- Copied URL

The Song Pages link should appear above or separately from third-party streaming services.

## 3.3 Streaming Services
The list of Streaming Services should come from a versioned data file rather than being hardwired into the editor.

Recommended provider schema:

```text
id
serviceName
serviceDomain
logoAsset
description
enabled
sortOrder
```

Initial services:

- Suno
- Spotify
- Bandcamp
- SoundCloud
- Google Flow Music
- Apple Music
- Deezer
- Tidal
- YouTube
- Amazon Music
- Tencent Music

Example row:

```text
[Spotify logo] Spotify | [Complete URL]
```

The provider selection determines the service identity and logo. The artist enters the complete URL.

A Song may have multiple entries for the same service when necessary.

For example:
- Official release
- Alternate release
- Music video
- Regional listing

The editor should not attempt to determine whether the destination contains audio, video, or another representation.

## 3.4 Social Posts
Introductory text:

> Primary social profiles belong in Artist Information. Use this section to link to individual posts where the complete Song, a meaningful presentation of the Song, or related Song-specific media has been published.

Initial networks:
- Instagram
- Facebook
- Twitter / X
- TikTok
- Bluesky
- Mastodon

The Social Network catalog should also come from a versioned provider file.

Suggested schema:

```text
id
networkName
domain
logoAsset
description
primaryRegion
enabled
sortOrder
```

International networks such as Weibo, QQ, LINE, and others can be added later without changing application code.

The artist decides which posts deserve tracking. Song Pages does not need to classify the post as audio, video, promotional, or otherwise.

## 3.5 Distribution Providers
Introductory text:

> Record the distributors and related services used for this Song so they remain easy to find when administrative work is needed.

Initial examples:
- CD Baby
- DistroKid
- SoundCloud Distribution
- Additional future services

Suggested provider schema:
```text
id
distributorName
distributorDomain
logoAsset
description
enabled
sortOrder
```

Distribution Provider entries should be **private by default** and excluded from public Song Pages output.

A row may contain:
- Provider
- Dashboard or release URL
- Optional account or release label
- Private notes

This section is operational metadata rather than public presentation.

# 4. Creation Process
The Creation Process section records how the Song was produced.

The top-level UI is a matrix:

| Process | Music / Mix | Vocals |
|---|:---:|:---:|
| Performed Recording | Checkbox | Checkbox |
| Electronic / DAW | Checkbox | Checkbox |
| AI Generation | Checkbox | Checkbox |
| Other Processes | Checkbox | Checkbox |

Multiple cells may be selected.

Selecting a cell reveals the relevant conditional fields below the matrix.

Internally, this should probably be represented as structured process records rather than a growing collection of unrelated boolean fields.

Suggested conceptual structure:

```text
creationProcesses[]
- target: music_mix | vocals
- processType: performed | electronic_daw | ai_generation | other
- details
```

The UI can remain a simple checkbox matrix.

## 4.1 Performed Recording
When Performed Recording is selected for Music / Mix or Vocals, reveal:

### Recording Context
Allow one or more:

- Studio
- Personal
- Live
- Field

“Personal” may eventually be renamed **Home / Personal Studio** if that proves clearer.

### Performed Recording Notes
- **Field type:** Multi-line text
- **Suggested maximum:** 2,000 characters
- **Markdown:** Optional; recommended for consistency

This field intentionally replaces many narrow fields such as exact room, venue, date, microphone, engineer, and recording circumstances.

The artist may document whatever details matter.

If needed later, Music / Mix and Vocals can have separate notes.

## 4.2 Electronic / DAW
When Electronic / DAW is selected, reveal:

### Primary Tool
- **Field type:** Single value
- **Examples:** Ableton Live, Logic Pro, FL Studio

### Additional Tools
- **Field type:** Tags
- **Cardinality:** Multiple

Examples:
- Serum
- Kontakt
- Pro Tools
- GarageBand
- Hardware sequencer
- Plugin names

### Commentary
- **Field type:** Multi-line text
- **Suggested maximum:** 2,000 characters
- **Markdown:** Yes
- **Editor:** Write / Preview toggle

Music / Mix and Vocals may eventually maintain separate tool records, but the MVP can begin with one conditional panel per selected target.

## 4.3 AI Generation — Music / Mix

When AI Generation is selected for Music / Mix, permit multiple model entries.

Each row contains:

| Provider | Model Name | Version | Primary / Final |
|---|---|---|:---:|
| Suno | Model name | 5.5 | Checkbox |

Rules:
- Multiple models may be listed.
- No more than one should be designated Primary / Final.
- Provider, model, and version remain artist-entered or preset-assisted values.
- This Song-level record may disagree with a specific Recording’s provenance.
- Song Pages does not need to automatically reconcile discrepancies.

This section describes the overall creation process. Recording-level provenance may later provide more specific information.

## 4.4 AI Generation — Vocals
When AI Generation is selected for Vocals, reveal one current vocal-generation record:

- Provider
- Model Name
- Version
- Persona

For MVP 1.0, only one AI vocal model record is required.

The schema should avoid making future support for multiple vocal models impossible.

Persona is plain text and may describe:
- A named provider Persona
- A custom voice
- A character or singer profile
- Other relevant vocal identity

## 4.5 Associated Prompts
When AI Generation is selected for either Music / Mix or Vocals, allow multiple Prompt records.

Prompt types:
- Prompt
- Negative Prompt

Fields:
| Field | Rule |
|---|---|
| Prompt Type | Prompt or Negative Prompt |
| Text | Main prompt content |
| Primary | One Prompt may be designated Primary |
| Target | Music / Mix, Vocals, or General |
| Order | User-controlled |

Character limits:
- Prompt: maximum 1,000 characters
- Negative Prompt: maximum 500 characters

Only a normal Prompt—not a Negative Prompt—should normally be eligible as the Primary Prompt.

Negative Prompts remain optional and will likely be used primarily by advanced creators.

A future version may associate a Prompt with a specific model or Recording. MVP prompts may remain Song-level.

## 4.6 AI Commentary
- **Field type:** Multi-line text
- **Suggested maximum:** 2,000 characters
- **Markdown:** Yes
- **Editor:** Write / Preview toggle

This allows the artist to describe:
- How generations were selected
- What was changed manually
- Which tools contributed
- How multiple outputs were combined
- Important production context not represented by formal fields

## 4.7 Other Processes
When Other Processes is selected, reveal:

- Process Name
- Target: Music / Mix or Vocals
- Commentary

This prevents unusual methods from being forced into inappropriate categories.

# 5. Lyrics
There should be one canonical Lyrics area in the Song editor.

The earlier top-level draft should not also contain a second independent Lyrics field.

Recommended placement: after Creation Process, as specified here.

## Current MVP Behavior
- **Field type:** Large multi-line editor
- **Maximum:** No practical user-facing maximum for now
- **Markdown:** Yes
- **Editor:** Write / Preview toggle

Lyrics will later receive a dedicated revision system supporting drafts, versions, diffs, published states, and Recording associations.

For MVP 1.0, avoid designing Lyrics as a permanently overwrite-only field. Even if rich revision history is deferred, the internal structure should leave room for Lyrics objects and revisions.

# 6. Recordings
This remains a dedicated major section and we’ve already set it to support multiple entries.

We have spec’d it already the following additional fields are just for consideration and should not be implemented now:
	- Recording identity
	- Version label
	- Audio file
	- External versus managed storage
	- Duration and technical metadata
	- Primary Recording
	- Recording date
	- Recording-specific provenance
	- Recording-specific Lyrics
	- Player and publishing behavior

# 7. Video and Animation
This remains a dedicated major section and should support multiple entries.

The section should eventually support but do not implement now.

	- Directly attached Video
	- First-class Video Content references
	- Video type
	- URL or local file
	- Thumbnail
	- Description
	- Commentary
	- Primary or featured Video
	- Music video
	- Lyric video
	- Visualizer
	- Live performance
	- Animated cover
	- Other

# 8. Artwork
The Artwork section supports multiple images.

Exactly one image may be the Primary Cover.

## Artwork Types
- Primary Cover
- Additional Cover
- Additional Image

## Primary Cover Rules
- Zero or one Primary Cover
- When present, always displayed in slot 1
- Mirrored as a preview near the Song Title
- Changing another image to Primary automatically removes the role from the previous Primary Cover
- The old Primary Cover remains attached unless explicitly removed

## Artwork Entry Fields
Each image contains:

| Field | Rule |
|---|---|
| Thumbnail | Automatically generated |
| Artwork Type | Primary Cover, Additional Cover, or Additional Image |
| Description | Plain text, maximum 60 characters |
| Commentary | Markdown, maximum 500 characters |
| Order | User-controlled except Primary Cover remains first |

Examples of descriptions:

- Back cover
- Inside front
- Alternate monochrome cover
- Recording session photograph
- Promotional square

The 60-character Description serves as a concise descriptor and may also be used as a title or caption where appropriate.

## Artwork Commentary
Longer Commentary should open in a modal or expanded editor.

- Maximum: 500 characters
- Markdown: Yes
- Write / Preview toggle

## Additional Recommended Fields
These are valuable but DEFER these for now

- Alt Text
- Image Credit
- Rights or Source Note
- Original Filename
- Storage Mode
- Related first-class Content reference

Alt Text is especially important for public publishing and should ideally enter the MVP before launch.

## Artwork Sources
An image may be:

- Uploaded directly to the Song
- Referenced from first-class Content
- Imported from an external provider
- Promoted from attached Artwork into first-class Content

# 9. Notes
Notes are private editor-only material.

Recommended behavior:
- Multi-line text
- Markdown support
- Write / Preview toggle
- No public publishing
- Suggested soft limit rather than a strict low maximum
- Activity log records that Notes changed, but not every textual diff

This section is intended for internal reminders and working context.

It should not be confused with public About / Description or Creation Process Commentary.

# Recommended Section Order

```text
1. Song
   - Song Title
   - Subtitle
   - Caption
   - About / Description
   - Primary Artwork Preview

2. Overview
   - Creation Date
   - Primary Genre
   - Additional Genres
   - BPM
   - Instrumental

3. Links, Distribution, and Social Media

4. Creation Process
   - Process Matrix
   - Conditional Process Details
   - AI Models
   - Prompts
   - Commentary

5. Lyrics

6. Recordings

7. Video and Animation

8. Artwork

9. Notes
```

---

# Important Product Comments

## 1. Do Not Duplicate Lyrics

The outline currently mentions Lyrics both near the top and in a later dedicated section.

There should be one canonical Lyrics editor. The top of the Song editor may eventually show a status summary such as:

```text
Lyrics: Published version · Updated July 16
```

but it should not contain a second editable body.

## 2. Separate Public Links from Private Operations

Streaming, social posts, and general web links are potentially public.

Distribution Providers are mostly private operational records. They can share common table infrastructure, but visibility defaults and publishing behavior must differ.

## 3. Provider Files Should Be Structured Data

Use JSON or another validated structured data format rather than an informal text file.

Streaming services, social networks, and distributors can either use separate files or one provider registry with capabilities:

```text
capabilities:
- streaming
- social
- distribution
```

This would permit SoundCloud to appear in more than one context without duplicating its identity.

## 4. Logos Need Fallback Behavior

Provider records should work even when no approved logo exists.

Fallback:

- Service name
- Generic icon
- Domain

A missing logo should never prevent adding a link.

## 5. Creation Process Should Remain Descriptive, Not Forensic

The selected structure is useful because it captures meaningful provenance without trying to become a complete studio session database.

The notes and commentary fields are important. They prevent the schema from exploding into dozens of rarely used fields.

## 6. Distinguish Song-Level Provenance from Recording-Level Provenance

The Creation Process section describes how the conceptual Song was created.

A future Recording may separately state:

- This specific audio came from Suno 5.5
- This mix was mastered in Logic
- This live Recording used different vocals

Disagreement between the two is acceptable because they answer different questions.

## 7. Add Visibility Indicators Early

Fields or sections should clearly indicate:

- Public
- Private
- Conditional or target-specific

For example:

- About / Description: public
- Distribution Providers: private
- Notes: private
- AI prompts: probably private by default, optionally public later
- Creation commentary: publishing behavior to be decided

## 8. Artwork Needs Alt Text

The artwork model is otherwise sound. Alt Text is the one field strongly recommended for immediate inclusion because retrofitting accessibility text across thousands of images later will be painful.

## 9. Caption Deserves Distinct Presentation Rules

Caption is not Description.

The renderer should treat Caption as a small, concise display element. It should not silently fall back to About / Description or vice versa unless a template explicitly defines that behavior.

## 10. Preserve Field Flexibility Through Records

Links, AI models, prompts, images, recordings, and related objects should be stored as repeatable child records rather than numbered fields such as `link1`, `link2`, or `image3`.

That will let the editor grow without recurring schema changes.

---

# Locked decisions (2026-07-16)

Resolved against the current Artist 2.0 catalog and compile bridge.

## Naming / identity

| Decision | Lock |
|----------|------|
| Public display name | Catalog `object.name` is the **public Song label** (spaces, punctuation allowed). Editor label may read **Song**. |
| Slug | Derived from the label on create / rename. User edits slug only via an explicit control (e.g. “Edit URL slug”) — not a primary field. |
| UUID | System-owned; never editable. |
| Internal `title` | Not required as a separate stored field; `name` is the public title. Optional later alias if compile/docs prefer the word “title”. |

## Section order (Song editor)

```text
1. Song (identity + caption + about + primary artwork preview)
2. Overview
3. Links, Distribution, and Social Media
4. Creation Process
5. Lyrics
6. Recordings
7. Related Songs          ← after Recordings (sister / remix / …)
8. Video and Animation    ← stub (payload `videoEntries[]` reserved; attach UX later)
9. Artwork
10. Notes                 ← private; never published
```

## Caption / About / Notes → compile

| Field | Public? | Compile mapping |
|-------|---------|-----------------|
| Caption | Yes | Card / short presentational line |
| About / Description | Yes | Long public text (manifest “about” / equivalent) |
| Notes | **No** | Never published |

**Migration:** Do **not** auto-map existing `description` / `notes`. Start fresh under the new field names. Old keys may remain unread until cleaned up.

## Links

| Decision | Lock |
|----------|------|
| Model | Replace the flat YouTube/Spotify/SoundCloud/Suno fields with a **structured link table** (cutover, not dual-write). |
| Song Pages row | **Stub now** — system-managed states: Not published / Preview / Published (URL later). |
| Providers | One shared **`providers-social-registry`** (streaming + social + distribution capabilities). Expandable later; settings UI later. |

## Creation Process + Suno

| Decision | Lock |
|----------|------|
| `stylePrompt` / `tags` / `suno` provenance | **Map into** AI Generation / Prompts / model rows (not left as parallel legacy UI). |
| AI prompts visibility | May be public eventually; **publishing selection** belongs to a later designer / publish phase, not editor toggles for every field. |
| Creation commentary | Same — may be public later via publish design; editor stores the text without blocking on publish rules now. |

## Artwork

| Decision | Lock |
|----------|------|
| Approach | **Phased:** keep shipping usable cover UX, then multi-image + Primary Cover. |
| Alt text | **Deferred** (still recommended before public launch, but not in the first slice). |

## Genres

Freeform tags for MVP (Primary Genre = one; Additional Genres = many; no forced vocabulary yet).

## Implementation sequence (recommended)

Serve authoring + compile clarity first, then denser provenance:

1. **Slice A — Identity + Overview**  
   Subtitle, Caption, About, Creation Date, Primary/Additional Genres, BPM, Instrumental; slug-with-confirm-edit; header primary-cover preview; compile remapped to Caption/About; Notes private.

2. **Slice B — Links redesign**  
   Link table + provider registry JSON + Song Pages stub row; remove flat link fields from the editor.

3. **Slice C — Creation Process**  
   Process matrix + conditional panels; map Suno import into AI models / prompts.

4. **Slice D — Artwork phase 2**  
   Multi-image + Primary Cover; promote/Content-ref preserved.

5. **Ongoing**  
   Recordings / Related Songs / Video stubs stay as already started; deepen when the field formalization pass lands.

---

# Open (fine to decide at implement time)

- Write/Preview markdown component reuse across About, Lyrics, Notes, commentary (Slice A uses a plain text preview stub)
- Provider logo assets (registry supports `logoAsset`; UI falls back to name/domain)

## Slice A shipped (2026-07-16)

- Payload: `subtitle`, `caption`, `about`, `primaryGenre`, `additionalGenres`, `slug`, `slugManual`
- Compile: `caption` ← payload.caption, `about` ← payload.about; notes never published; slug from payload or derived name
- Editor: Song + Overview sections; Edit URL slug; Related Songs after Recordings
- No migration of legacy `description` / notes into caption/about

## Slice B shipped (2026-07-16)

- `linkEntries[]` structured table + Song Pages stub (`not_published` / `preview` / `published`)
- Shared `providers-social-registry` (streaming + social + distribution capabilities)
- Flat `links` cutover: migrated on read; writers clear flat map when saving entries
- Compile maps public YouTube / Spotify / SoundCloud streaming rows only; distribution stays private
- Editor: Add Link → Web / Streaming / Social / Distribution; flat youtube/spotify/soundcloud/suno fields removed

## Slice C shipped (2026-07-16)

- `creationProcesses[]` matrix (Performed / DAW / AI / Other × Music-Mix / Vocals) + conditional panels
- `aiPrompts[]` associated prompts when any AI cell is selected
- Suno import maps Studio tags → primary prompt + AI Music/Mix model row; removes Style Prompt editor
- Legacy `stylePrompt` migrated into prompts on read when AI is selected
- AI Vocals: optional **Same as music** checkbox mirrors Music/Mix models and collapses the panel

## Slice D shipped (2026-07-16)

- `artworkEntries[]` multi-image list with roles: Primary Cover / Additional Cover / Additional Image
- Exactly zero or one Primary Cover; header preview + compile use Primary Cover
- Legacy `artwork` mirrored from Primary for promote / Rename Tool / insert-arrow / albums
- Description (soft 60) + expandable Commentary (soft 500); Alt Text still deferred
- Albums / playlists keep the single-cover Artwork section for now

## Video and Animation stub shipped (2026-07-16)

- Song editor section after Related Songs / before Artwork
- Payload: `videoEntries[]` + kind vocabulary reserved (music / lyric / visualizer / live / animated cover / other)
- UI placeholder only — Add video disabled until attach / Content-ref / featured video ship
- Spec still says full video fields are not implemented yet; this reserves the slot

## Content · Video / Audio shipped (2026-07-16)

- Catalog Content types: `image` | `text` | `video` | `audio`
- Add… menu creates Content · Video / Content · Audio with file pickers (`pickVideo`, broadened `pickAudio`)
- Guidance: library assets for reuse; prefer Song **Recordings** for publish audio and Song **Video and Animation** for Song-facing clips once attach UX lands
- Insert → artwork still image-only; video/audio are not cover candidates
