# Song Pages Editor 1.0  
## Revised Catalog and Editor Model

**Document status:** Working draft  
**Scope:** Product model, editor organization, object relationships, and primary workflows

---

# 1. Purpose

Song Pages Editor 1.0 is a catalog-management and publishing system for musical artists.

It allows an artist to maintain a structured body of work and compile that information into:

- A static Song Pages website.
- Data used by the Song Pages desktop player.
- Future mobile-player packages.
- Portable catalog exports.
- Future publishing formats and applications.

The editor is not primarily a website builder.

It is a system for organizing an artist’s work and then presenting that work through websites, players, and other publishing targets.

The core principle remains:

> **Artists manage their catalog. Song Pages manages its presentation.**

---

# 2. The Artist Owns the Catalog

The first object a user creates is an **Artist**.

An Artist is the owner and root context of the catalog. Songs, Containers, Content, site configuration, and publishing output all belong to an Artist.

A single installation of Song Pages may manage multiple Artists, but the user works inside one Artist Catalog at a time.

Conceptually:

```text
Workspace
├── Artist A
│   ├── Songs
│   ├── Containers
│   ├── Content
│   ├── Site
│   └── Publishing
│
├── Artist B
│   ├── Songs
│   ├── Containers
│   ├── Content
│   ├── Site
│   └── Publishing
│
└── Additional Artists
```

The Artist is not another piece of content. It is the owner of the content and the root of the publishing system.

An Artist Catalog contains:

- Artist identity and biography.
- Branding.
- Public links.
- Songs.
- Containers.
- Content.
- Site configuration.
- Publication settings.
- Private administrative information.

---

# 3. The Three Primary Libraries

From the artist’s perspective, Song Pages contains three primary databases or libraries:

1. **Songs**
2. **Containers**
3. **Content**

These are the primary concepts presented in the editor.

They do not necessarily correspond to only three physical database tables. Internally, Song Pages may use additional normalized records for recordings, lyrics, assets, relationships, and container membership.

The three-library structure is the artist-facing organizational model.

```text
Artist Catalog
├── Songs
├── Containers
└── Content
```

The common workflow is:

```text
Define Songs
      ↓
Create independently useful Content when needed
      ↓
Organize Songs and Content into Containers
      ↓
Configure the Home Page and site presentation
      ↓
Preview and Publish
```

---

# 4. Songs

A Song is the central creative object in Song Pages.

There is only one fundamental style of Song definition:

> **A Song is a Song.**

Songs may have different genres, origins, recording methods, release states, and media attachments, but these differences do not create separate top-level Song types.

A Song represents the artist’s conceptual work.

It may contain or reference:

- Identity and metadata.
- One or more recordings.
- Lyrics.
- Artwork.
- Videos.
- Credits.
- Rights information.
- Player information.
- Related Songs.
- Private notes.
- Publishing configuration.

## 4.1 Recordings and Versions

A Song may contain multiple playable realizations.

Examples include:

- Original recording.
- Alternate AI generation.
- Radio edit.
- Extended mix.
- Instrumental.
- Live performance.
- Remaster.
- Alternate mix.

Internally, these may be represented as Recording or Version child objects.

The artist does not need to create each recording in the standalone Content library first. A recording is normally created while editing its Song.

For example:

```text
Song: Midnight Crossing
├── Main Recording
├── Radio Edit
├── Instrumental
└── Live Recording
```

The audio file is part of defining the Song and its available versions.

It is not ordinarily treated as an unrelated standalone Content object.

## 4.2 Related and Sister Songs

A conceptually distinct Song should be created as its own Song object.

It may then be related to another Song as:

- Sister Song.
- Remix.
- Reinterpretation.
- Sequel.
- Acoustic adaptation.
- Genre transformation.
- Lyrical rewrite.
- Other defined relationship.

For example:

```text
Song: Midnight Crossing
└── Sister Song: Midnight Crossing in Memphis
```

Both remain complete, independent Songs.

The relationship connects them without making one a child recording of the other.

---

# 5. Containers

Containers organize and present objects from the Artist Catalog.

Unlike Songs, Containers have multiple styles because different Containers serve different purposes.

There are two major families of Containers:

1. **Song Containers**
2. **Pages**

```text
Containers
├── Song Containers
│   ├── Albums
│   ├── EPs
│   ├── Mixtapes
│   ├── Playlists
│   └── Setlists
│
└── Pages
    ├── Home Page
    ├── Articles
    ├── Essays
    ├── Landing Pages
    └── Other Custom Pages
```

The two families may share some common technical behavior, but they should be presented differently because they represent different artistic intentions.

---

# 6. Song Containers

A Song Container is an ordered collection of Songs.

Supported Song Container types may include:

- Album.
- EP.
- Mixtape.
- Playlist.
- Setlist.

A Song Container must ultimately contain at least one Song.

The editor may permit an empty Container to exist temporarily as a Draft while the artist is assembling it, but it cannot be considered complete or publishable until it contains a Song.

## 6.1 Container Membership

Songs are added to Containers by reference.

The Song’s canonical information remains stored in the Song library. Adding it to an Album or Playlist does not create a duplicate Song record.

A membership record may store information specific to that Container, including:

- Position.
- Disc number.
- Set section.
- Selected Recording.
- Container-specific label.
- Container-specific notes.
- Transition or player behavior in future versions.

For example:

```text
Album: Western Skies
├── 1. Long Road Home
├── 2. Midnight Crossing
└── 3. Leaving Amarillo
```

The Album contains references to the three Songs.

It does not contain copied versions of their complete metadata.

## 6.2 Container Differences

Song Container types may expose different specialized fields.

An Album may include:

- Release date.
- Label.
- Edition.
- Album credits.
- Disc structure.

A Playlist may include:

- Curator.
- Purpose.
- Update date.
- Playlist description.

A Setlist may include:

- Performance date.
- Venue.
- Location.
- Tour.
- Set and encore sections.

The underlying system may use a common Container foundation while adding type-specific extensions.

---

# 7. Pages as Content Containers

A Page is a Container of written and embedded material.

It is conceptually different from an Album or Playlist because its primary purpose is not to organize a sequence of Songs. Its purpose is to create a composed presentation.

A Page may contain:

- Written text.
- Images.
- Videos.
- Songs.
- Song Containers.
- Other Content objects.
- Structured layouts.
- Song Pages embeds.

Examples include:

- An essay about the future of music.
- Album liner notes.
- A production journal.
- A discussion of three Hyperpop Songs.
- Tour notes.
- An artist biography.
- A catalog introduction.
- A news or announcement Page.

A Page is not required to contain a Song.

## 7.1 Object-Aware Pages

Pages should support references to other catalog objects.

An artist might write:

```text
I began experimenting with Hyperpop during the winter.

<<song:SONG_ID_1>>

The first experiment was intentionally chaotic...

<<song:SONG_ID_2>>

By the third song, the production had become more melodic.

<<song:SONG_ID_3>>
```

The editor should provide an object picker for inserting these references.

The artist should not need to know or manually type internal IDs.

## 7.2 Home Page

The Home Page is a specialized Page with additional structured capabilities.

It may include:

- Featured release.
- Featured Songs.
- Biography.
- Recent additions.
- Featured Playlist.
- News.
- Artist-selected Content.
- Custom written sections.

An Artist Catalog should have one designated Home Page.

---

# 8. Content

Content includes independently meaningful media and written objects that are not themselves Songs or Containers.

Examples may include:

- Photographs.
- Artwork.
- Videos.
- Essays or reusable Text.
- Documents.
- Promotional graphics.
- Image galleries.
- Audio snippets.
- Other future media types.

Content requires an important distinction between:

1. **Standalone Content**
2. **Song and Container Content**

---

# 9. Standalone Content

Standalone Content is created as a first-class object in the Content library.

It should be created independently when it needs to be:

- Searched for directly.
- Reused in several places.
- Referenced by other objects.
- Published independently.
- Tracked separately.
- Assigned its own metadata.
- Managed outside the lifecycle of one Song or Container.

Examples include:

- A general photograph of the Artist.
- A concert photograph not belonging to one Song.
- An essay about the future of music.
- An artist interview.
- A promotional video.
- A reusable biography fragment.
- A general tour poster.
- A document intended for future reference.

A Standalone Content object receives its own:

- UUID.
- Name or Title.
- Type.
- Metadata.
- Tags.
- Relationships.
- Visibility.
- Publishing status.
- Private notes.

It appears in the Content library and may be attached to Songs, Containers, Pages, or the Artist Profile.

---

# 10. Song and Container Content

Some content is created as part of editing another object.

It does not need to be created in the Content library first.

Examples include:

- Uploading cover art while editing a Song.
- Adding an MP3 while defining a Song Recording.
- Writing a description while editing an Album.
- Adding Lyrics to a Song.
- Uploading a Playlist image.
- Writing the title of an Album.
- Adding a private note to a Setlist.

These elements belong to the object being edited.

The user should not be forced to:

1. Leave the Song editor.
2. Create an MP3 asset in the Content library.
3. Return to the Song.
4. Search for the MP3.
5. Attach it.

The file should be attachable directly from the Song editor.

## 10.1 Inline Fields Are Not Content Objects

Not every piece of information should become a Content record.

For example:

- Song Title.
- Album Name.
- Release Date.
- Description.
- Tagline.
- Private Note.

These are fields of the parent object.

The Album title is technically “content” in the broad linguistic sense, but it is not a reusable Text object that must be separately created and attached to the Album.

## 10.2 Owned Child Content

Some attached material may require richer internal records while still belonging to the parent object.

Examples include:

- Recording.
- Lyrics.
- Credit.
- Song-specific Artwork.
- Container membership.

These may be stored as child records internally, but the artist creates and manages them from inside the parent editor.

## 10.3 Referenced Standalone Content

A Song or Container may also attach existing Standalone Content.

For example:

- Use a previously created Artist photograph on the Home Page.
- Attach a general interview to several Songs.
- Reuse the same promotional graphic across an Album and a Page.
- Embed an existing essay in a custom Page.

This produces two valid workflows:

```text
Create content inside the Song or Container
```

or:

```text
Select existing Content from the Content library
```

## 10.4 Promotion to Standalone Content

In future versions, the editor may allow attached content to be promoted into the standalone Content library.

For example:

> “This image currently belongs only to this Song. Make it reusable throughout the Artist Catalog?”

This is useful but not required for the earliest implementation.

---

# 11. Practical Content Ownership Rules

The system should follow these rules.

### Rule 1: Create it inline when it belongs only to the current object

A Song-specific cover image can be added while editing the Song.

### Rule 2: Create it as Standalone Content when it has an independent identity

A general Artist portrait belongs in the Content library.

### Rule 3: Reference rather than duplicate reusable Content

The same Artist portrait can be used on the Home Page, Biography Page, and an Album Page.

### Rule 4: Parent fields remain fields

An Album title should not become a separately managed Text object.

### Rule 5: Songs remain the source of their own musical data

Audio versions and Lyrics normally belong to the Song.

### Rule 6: Removing a reference does not delete Standalone Content

If an Artist photograph is removed from a Page, it remains available in the Content library.

### Rule 7: Deleting owned content affects only its parent unless it has been promoted or reused

The editor must warn the artist whenever deletion could affect multiple objects.

---

# 12. Revised Artist Catalog Structure

The user-facing hierarchy is:

```text
Artist Catalog
│
├── Artist Information
│   ├── Identity
│   ├── Biography
│   ├── Branding
│   └── Links
│
├── Songs
│   └── Song
│       ├── Fields
│       ├── Recordings
│       ├── Lyrics
│       ├── Credits
│       ├── Owned Content
│       ├── Referenced Content
│       └── Related Songs
│
├── Containers
│   ├── Song Containers
│   │   ├── Albums
│   │   ├── EPs
│   │   ├── Mixtapes
│   │   ├── Playlists
│   │   └── Setlists
│   │
│   └── Pages
│       ├── Home Page
│       ├── Articles
│       ├── Essays
│       └── Other Pages
│
├── Content
│   ├── Images and Artwork
│   ├── Videos
│   ├── Text
│   ├── Documents
│   └── Future Content Types
│
├── Site Configuration
│
└── Publishing
```

---

# 13. Editor Structure

Once an Artist has been created, the editor opens into a consistent list-and-detail workspace.

The central interaction model is:

```text
Catalog Library on the Left
            +
Selected Object Editor on the Right
```

The artist should be able to move rapidly through a large catalog without opening a separate disconnected workflow for every object.

---

# 14. Left-Side Catalog Library

The left side displays everything available within the current Artist Catalog.

It supports the three primary libraries:

- Songs.
- Containers.
- Content.

A combined **All** view may also be provided.

Suggested filters:

```text
All | Songs | Containers | Content
```

The list may display columns such as:

- Name.
- Type.
- Date Added.
- Modified Date.
- Status.

The artist can:

- Search.
- Filter.
- Sort.
- Select.
- Create.
- Duplicate.
- Archive.
- Delete where permitted.

Clicking an item loads it into the editor on the right.

The left library remains visible while the artist works so that catalog objects can be selected and connected without repeatedly navigating through modal screens.

---

# 15. Right-Side Object Editor

The right side displays the editor appropriate to the selected object.

Selecting a Song loads the Song editor.

Selecting an Album loads the Album editor.

Selecting an image loads the image Content editor.

The editor changes according to the selected object while the catalog library remains stable.

A Song editor may contain sections such as:

- Overview.
- Audio and Recordings.
- Lyrics.
- Artwork.
- Videos.
- Credits.
- Related Songs.
- Publishing.
- Notes.

A Song Container editor may contain:

- Overview.
- Songs.
- Artwork.
- Description.
- Presentation.
- Publishing.
- Notes.

A Page editor may contain:

- Overview.
- Written Content.
- Embedded Objects.
- Presentation.
- Publishing.
- Notes.

A Content editor may contain:

- Preview.
- Metadata.
- Relationships.
- Usage.
- Publishing.
- Notes.

---

# 16. Object Creation

The editor should provide clear creation actions for:

- Add Song.
- Add Container.
- Add Content.

Creating a Container requires selecting its type.

For example:

```text
Add Container
├── Album
├── EP
├── Mixtape
├── Playlist
├── Setlist
└── Page
```

Creating Content requires selecting its Content type.

For example:

```text
Add Content
├── Image
├── Artwork
├── Video
├── Text
├── Document
└── Other
```

Song creation does not require choosing a Song subtype.

---

# 17. Editing Containers with the Catalog Library

When a user edits a Song Container, the left catalog library becomes a source for adding Songs.

Only Songs are valid members of a Song Container.

The artist can:

1. Open or create a Container.
2. Switch the left library to Songs.
3. Search or browse the Song catalog.
4. Add selected Songs to the Container.
5. Reorder them in the Container editor.
6. Select a specific Recording when appropriate.
7. Remove Songs from the Container without deleting the Songs.

The UI may eventually support:

- Double-click to add.
- An Add button.
- Drag and drop.
- Multi-selection.
- Bulk addition.

The underlying action is always the creation of a reference from the Container to the existing Song.

---

# 18. Editing Song Relationships

When editing a Song, the artist may connect it to another Song.

For example, to add a Sister Song:

1. Open the source Song.
2. Open its Related Songs section.
3. Select the relationship type.
4. Find the other Song in the left catalog library.
5. Add it to the relationship.
6. Optionally provide a public label or description.

The related Song remains a normal Song in the Song library.

The relationship does not duplicate or relocate it.

This same pattern may support:

- Sister Songs.
- Remixes.
- Reinterpretations.
- Sequels.
- Adaptations.
- Other explicit relationships.

---

# 19. Editing Pages with the Catalog Library

When editing a Page, the left catalog library can be used as an object source.

Unlike a Song Container, a Page may reference:

- Songs.
- Containers.
- Content.

For example, an artist writing an essay may:

1. Write text in the Page editor.
2. Select a Song in the left library.
3. Insert a Song presentation into the Page.
4. Select an image from Content.
5. Insert the image.
6. Select an Album.
7. Add an Album presentation.

The Page stores durable references to those objects.

Changing the title of the referenced Song or Album should not break the Page.

---

# 20. Global Search and Contextual Selection

Search should be global by default.

A search for “Midnight” may return:

- A Song named “Midnight Crossing.”
- An Album containing “Midnight.”
- A Page discussing midnight recordings.
- A photograph tagged “midnight session.”

The user may then narrow the results to:

- Songs.
- Containers.
- Content.

When an editing action requires a specific object type, the library should apply a contextual filter.

Examples:

- Adding tracks to an Album shows Songs.
- Adding a Sister Song shows Songs.
- Selecting primary Album artwork shows compatible Content and attached Artwork.
- Embedding something in a Page may show all three libraries.

This allows one consistent catalog interface to serve both navigation and object selection.

---

# 21. Primary Artist Workflow

A normal Artist workflow is:

## Step 1: Create the Artist

Enter:

- Artist Name.
- Biography.
- Branding.
- Links.
- Basic site information.

## Step 2: Define Songs

For each Song:

- Enter metadata.
- Attach audio.
- Add Lyrics.
- Add Artwork.
- Add Credits.
- Configure relationships.
- Set publishing behavior.

## Step 3: Create Standalone Content When Necessary

Create Content when an object has independent value outside one Song or Container.

Examples:

- Artist photography.
- Essays.
- General interviews.
- Promotional graphics.
- Reusable written material.

## Step 4: Organize Songs into Song Containers

Create:

- Albums.
- EPs.
- Mixtapes.
- Playlists.
- Setlists.

Select existing Songs and arrange them in order.

## Step 5: Create Pages

Write custom material and embed:

- Songs.
- Containers.
- Content.

## Step 6: Configure the Home Page

Select:

- Featured releases.
- Featured Songs.
- Artist introduction.
- Recent additions.
- Custom sections.
- General Artwork and Content.

## Step 7: Preview

Review:

- Site navigation.
- Object presentation.
- Mobile and desktop layouts.
- Player behavior.
- Missing references.
- Publishing warnings.

## Step 8: Publish

Compile the Artist Catalog into:

- A well-designed static website.
- A Song Pages desktop-player package.
- Future publishing targets.

---

# 22. Publishing and Presentation

Song Pages should provide a constrained site structure but a strong variety of designs, templates, and presentation options.

The goal is not to let artists construct arbitrary websites from primitive elements.

The goal is to let artists curate a highly distinctive presence through:

- Themes.
- Templates.
- Typography.
- Artwork.
- Featured objects.
- Page compositions.
- Display options.
- Container presentation.
- Song presentation.
- Player integration.

The same structured Song may be presented differently as:

- A standalone Song Page.
- An Album track.
- A Playlist entry.
- An embedded Song inside an essay.
- A player result.
- A featured Home Page object.

The underlying Song remains the same.

---

# 23. Song Pages Player Compatibility

Song Pages sites provide more than conventional static pages.

Because Songs and Containers use known structures, the Song Pages player can offer specialized listener experiences.

These may include:

- Continuous playback.
- Album and Playlist navigation.
- Alternate Recording selection.
- Timed Lyrics.
- Visualizers.
- Related Song discovery.
- Sister Song navigation.
- Artist-curated sequences.
- Rich metadata.
- Future social and interactive features.

Artists benefit from maintaining structured Songs and Containers because those structures can support experiences that are not possible when music is published only as unstructured webpages.

---

# 24. Architectural Rules Established by This Revision

1. The Artist is the root owner of the catalog.

2. The user manages three primary libraries: Songs, Containers, and Content.

3. Songs have one fundamental object type.

4. Containers have two major families: Song Containers and Pages.

5. Song Containers contain references to Songs.

6. Pages may contain or reference Songs, Containers, and Content.

7. Content may be standalone or created in the context of another object.

8. Ordinary fields do not become Content objects merely because they contain text or media information.

9. Song audio and Lyrics normally belong to the Song rather than requiring prior creation in the Content library.

10. Reusable Content should be stored once and referenced from multiple objects.

11. The left catalog library is both a navigation system and an object-selection system.

12. The right side of the editor edits the currently selected object.

13. The catalog remains canonical while websites and player packages are compiled outputs.

---

# 25. Recommended Terminology

To keep both the product and implementation understandable, the following terms should be used consistently.

| Term | Meaning |
|---|---|
| Artist | Owner and root context of a catalog |
| Artist Catalog | Everything managed for one Artist |
| Song | A conceptual musical work |
| Recording or Version | A playable realization of a Song |
| Container | An object that organizes or presents other objects |
| Song Container | Album, EP, Mixtape, Playlist, or Setlist |
| Page | A written and visual Content Container |
| Content | Independently trackable media or written material |
| Attached Content | Material created or selected while editing a parent object |
| Standalone Content | A first-class object in the Content library |
| Reference | A durable connection to another canonical object |
| Publication | Compiled output generated from the catalog |

---

# 26. Immediate Design Consequence

The strongest implication of this model is that the MVP editor should not begin as a collection of separate forms.

It should begin as a persistent catalog workspace:

```text
┌─────────────────────────────────────────────────────────────┐
│ Artist Selector | Add Song | Add Container | Add Content   │
├──────────────────────┬──────────────────────────────────────┤
│ Catalog Library      │ Selected Object Editor               │
│                      │                                      │
│ Search               │ Song, Container, or Content fields   │
│ All                  │                                      │
│ Songs                │ Relationships and attachments        │
│ Containers           │                                      │
│ Content              │ Publishing and presentation          │
│                      │                                      │
└──────────────────────┴──────────────────────────────────────┘
```

The interface can grow substantially without changing this central premise:

> **Find or create an object on the left. Define and connect it on the right.**

That is simple enough for the MVP, while still supporting the catalog scale and relationship depth required by the long-term system.
