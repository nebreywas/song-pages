# Defining a Song as an Adapted Work

**Status:** Song Editor MVP fields shipped (Artist 2.0) — payload `adaptedWork`, section **Adapted Work & Provenance** immediately after Musical Details. Provenance file is a path pointer for now (`openFile`); managed `provenance-materials/` copy waits on the assets filesystem.

As Song Pages evolves we need a richer way to describe songs that are derived from pre-existing material. While existing features such as Related Songs and Multiple Recordings solve part of this problem, they do not fully capture the provenance and nature of adaptations such as remixes, covers, arrangements, public domain works, or parody songs.

Our goal is **not** to model copyright law. Our goal is to accurately catalog where a work came from, how it relates to an earlier work, and preserve the research and provenance behind that relationship.

# Definitions
## Remix
A remix is a new version of an existing song created by altering an existing recording, production, or musical arrangement. It may be created by the original artist or another artist.

## Cover
A cover is a new performance of an existing song. While functionally similar to a remix in many respects, the term is generally associated with performed music rather than producer or DJ culture.

## Arrangement / Rework
An arrangement or rework substantially changes the structure, instrumentation, lyrics, or overall presentation of an existing work while still remaining recognizably based on the original.

Although these terms overlap in modern music production, they generally imply more significant creative restructuring than a traditional remix.

# Adapted Work & Provenance
Immediately following the Song Details section the editor should contain a new section titled:

## Adapted Work & Provenance
Initially the section contains only:

```
[ ] This song is adapted from a pre-existing work
```

When enabled, the section expands.

# Adaptation
## Name of Original Work

```
[ Text Field ]
```

For now this is free text.

Eventually Song Pages may support directly linking to another song in the catalog, but this is intentionally deferred.

## Adaptation Type

Choose the primary type of adaptation.

```
( ) Cover
( ) Remix
( ) Arrangement
( ) Rework
( ) Translation
( ) Mashup
( ) Medley
( ) Parody
( ) Other
```

Only one primary type should be selected.

---

## Adapted By

```
( ) Me
( ) Someone Else
```

If **Someone Else** is selected:

```
Adapter Name:
[ Text Field ]
```

---

## Original Creator

```
( ) Me
( ) Someone Else
```

This allows Song Pages to distinguish between:

- creating a new version of your own work
- adapting someone else's work
-someone adapting your work but still owned and managed by you (common for remixes)

---
## Source Material Used

Indicate which elements of the original work were used.

```
[ ] Existing Music
[ ] Existing Performance
[ ] Existing Lyrics
```

Definitions:

**Existing Music**
The underlying composition or musical material, independent of a specific recording.

**Existing Performance**
An existing recording or performance used directly or sampled.

**Existing Lyrics**
The written lyrical content.

Multiple selections are allowed.

---

## Original Publication Date

```
Year or Full Date
```

---

## Original Copyright Status

```
[ ] Public Domain
[ ] Copyrighted
[ ] Licensed
[ ] Unknown
```

Future versions of Song Pages may suggest Public Domain status automatically based on publication year and jurisdictional rules, but the user remains responsible for confirming accuracy.
---

# Provenance
The Provenance section documents where information about the original work came from.

## Original Performer(s)

```
[ Text Field ]
```

---
## Original Music

```
[ Text Field ]
```

Composer(s) or musical creator(s).
---

## Original Words

```
[ Text Field ]
```

Lyricist(s) or author(s).

---

## Original Copyright Holder

```
[ Text Field ]
```

---

## Primary Provenance Link

```
[ URL ]
```

The primary online reference supporting the provenance of the work.

---

## Provenance File

```
[ File ]
```

Store uploaded materials inside:

```
provenance-materials/
```

Examples:

- Library scans
- Archive.org downloads
- Copyright registrations
- PDFs
- Research notes
- Screenshots

---

## Notes

```
[ Multi-line Text ]
```

General notes about the original work.

This intentionally serves as a flexible catch-all field instead of introducing dozens of additional metadata fields.

---

# Changes Made

```
[ Multi-line Text ]
```

Describe the changes made in creating this adaptation.

Examples include:

- modernized lyrics
- country arrangement
- shortened verses
- translated to Spanish
- electronic remix
- orchestral version
- rewritten bridge
- new ending
- parody lyrics
- reordered verses

This field is intentionally freeform to document the creative relationship between the original work and the new adaptation.

---

# Design Philosophy

The purpose of this section is **cataloging**, not legal analysis.

Song Pages should preserve:

- what the original work was
- how this work relates to it
- what source material was used
- where provenance information came from
- what creative changes were made

This provides enough metadata to accurately catalog original works, covers, remixes, arrangements, public domain adaptations, translations, parody works, and future adaptation types while remaining flexible enough to evolve as Song Pages grows.