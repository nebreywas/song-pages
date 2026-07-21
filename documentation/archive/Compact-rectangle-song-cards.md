# Landscape Song Cards

Landscape Song Cards are compact horizontal cards designed for editorial layouts, featured content, search results, sidebars, recommendations, related songs, and narrower page columns where a full-width Wide Song Card would consume too much horizontal space.

They occupy the middle ground between Portrait Song Cards (object focused) and Wide Song Cards (collection focused).

Like all Song Page card renderers, Landscape Song Cards are generated from:

- Song Data
- User structural choices
- A selected card design

The renderer combines these inputs to produce a finished card while maintaining the overall Song Pages visual language.

---

# Zones

Landscape Song Cards are composed of three primary zones:

- Cover Zone
- Information Zone
- Footer Zone

Unlike Wide Song Cards, the Footer spans the entire width of the card, visually tying both halves together.

---

# Cover Zone

The Cover Zone displays the song artwork and a minimal set of interactive overlays.

Because Landscape Song Cards are relatively compact, the artwork should remain visually dominant while avoiding excessive overlays.

---

## Cover Position

Unlike Portrait Song Cards, Landscape Song Cards allow the artwork to appear on either side of the card.

```
Left

Right
```

The selected card design determines the default, while users may optionally choose the preferred orientation.

---

## Cover Artwork

The renderer determines:

- cropping
- scaling
- blending
- borders
- shadows
- corner radius

These are characteristics of the card design and are not artist-editable.

---

## Animated Covers

Landscape cards support the same animated cover options as other Song Card renderers.

Examples include:

- Static only
- Animate when available
- Animate on play
- Animate on hover
- Loop
- Play once

---

## Play Overlay

If the song is playable, a play control may appear over the artwork.

Current placement options include:

```
Center

Lower Left
```

The renderer determines final sizing and styling.

---

## Cover Bugs

Because of the limited artwork area, Landscape Song Cards intentionally expose fewer cover overlays than Portrait Song Cards.

Examples include:

- Favorite / Like
- Length
- Explicit
- Playing Indicator

Individual card designs determine which, if any, cover bugs are appropriate.

---

# Information Zone

The Information Zone contains the descriptive information for the song.

Typical information includes:

## Required

- Song Title
- Artist

## Optional

- Album
- Playlist
- Subtitle
- Caption
- Genres
- Themes
- Short Lyric Quote

Landscape cards have less vertical space than Portrait Song Cards, so card designs should emphasize concise presentation.

The renderer determines:

- typography
- hierarchy
- spacing
- overflow
- clamping
- scrolling

---

## Information Layout

Landscape cards generally favor a vertical reading order:

```
Title

Artist

Caption

Genres / Themes
```

Some editorial card designs may instead emphasize:

```
Title

Artist

Lyric Quote
```

or

```
Title

Caption
```

depending on available space.

---

# Footer Zone

Unlike Portrait Song Cards, the Footer spans the entire width of the card.

This creates a stable visual foundation and allows metadata and actions to remain aligned regardless of whether the artwork appears on the left or right.

The Footer is divided into three logical regions.

---

## Left Section

Examples include:

- Track Number
- Playing Animation
- Waveform Indicator
- Speaker Animation

---

## Center Metadata

Choose several items appropriate for the selected card design.

Examples include:

- Length
- Time Remaining
- Release Date
- Codec
- Bitrate
- BPM
- Main Genre
- Explicit Bug

Not every card should display every field.

The renderer should prioritize clarity over completeness.

---

## Right Section

Reserved primarily for interaction.

Typical elements include:

- Favorite / Like
- Add
- Queue
- Menu Bug

The Menu Bug is considered a permanent footer element.

---

# Card States

Landscape Song Cards support the shared Song Pages interaction model.

- Default
- Hover
- Selected
- Playing
- Disabled
- Loading

---

# Card Actions

Landscape Song Cards participate in the shared Song Pages action system.

Potential interactions include:

- Click Cover
- Click Play
- Click Title
- Click Footer Elements
- Click Favorite
- Click Menu
- Double Click
- Right Click
- Long Press
- Keyboard Navigation
- Touch Interaction

These behaviors will be standardized across Song Pages and are intentionally left flexible during early development.

---

# Design Philosophy

Landscape Song Cards are designed to balance visual presentation with information density.

Compared to Portrait Song Cards they:

- consume less vertical space
- fit naturally into editorial layouts
- work well inside multi-column page designs
- remain visually rich without overwhelming surrounding content

Compared to Wide Song Cards they:

- emphasize the song itself rather than collection context
- provide a more object-oriented presentation
- sacrifice some metadata in exchange for stronger visual hierarchy

The overall goal is to create a compact, attractive card that feels equally at home inside articles, recommendations, search results, sidebars, and curated editorial pages while remaining unmistakably part of the Song Pages component library.