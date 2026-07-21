# Song Chips

Song Chips are the smallest reusable visual representation of a Song within Song Pages.

**Status:** Song Editor → **Song Chips…** opens a designer (types left / live preview right). Shared types in `shared/songChips/`; renderer + modal in `src/song-chips/`. Six families: Inline Mention · Compact · Row · Play · Artwork · Mention Badge. Session-only for now (not persisted).

**Themes:** Deferred. Lock Light as the working default until Portrait / Compact / Wide cards, Chips, and other UI primitives are stubbed — then build a shared theme system across all of them. Inline Mention preview uses a fake sentence (intentional).

Unlike Song Cards, Chips are designed to **reference** a song rather than fully present it. They are lightweight, compact, and intended to appear inline with text, inside editors, search results, recommendations, sidebars, metadata panels, and other dense user interfaces.

A Chip should identify a song quickly while exposing only the minimum information necessary for the current context.

---

# Design Philosophy

Cards answer:

> Tell me about this song.

Pages answer:

> Immerse me in this song.

Chips answer:

> Mention this song.

If additional information is required, the design should generally move to a Song Card instead of making the Chip larger.

As a general guideline, Chips should display no more than 2–4 primary pieces of information.

---

# Renderer

Like all Song Pages components, Song Chips are generated from:

- Song Data
- User structural choices
- A selected Chip design

The renderer combines these inputs into a finished Song Chip while maintaining the Song Pages visual language.

---

# Zones

Most Song Chips are composed of three simple zones.

- Cover Zone
- Information Zone
- Action Zone

Not every Chip design uses every zone.

Some Chips intentionally omit artwork or actions.

---

# Cover Zone

The Cover Zone displays a simplified representation of the song artwork.

Examples include:

- Square Cover
- Rounded Square
- Circle
- No Cover

The renderer determines:

- crop
- scaling
- corner radius
- borders
- shadows

Animated covers are generally disabled for Chips, although future Chip designs may selectively enable them.

---

## Play Overlay

If the Chip represents playable media, the renderer may optionally overlay a play button.

Placement options include:

- Center
- Lower Left
- Lower Right
- Outside Cover

---

# Information Zone

The Information Zone contains a minimal amount of identifying information.

## Required

- Song Title

## Optional

- Artist
- Length
- Album
- Playlist
- Subtitle
- Caption

Chip designs intentionally expose very little metadata.

If the renderer cannot comfortably display additional information, it should omit it rather than expanding the Chip.

---

# Action Zone

The Action Zone contains lightweight interaction.

Examples include:

- Play
- Favorite
- Add
- Queue
- Remove
- Menu Bug

Most Chip designs should expose no more than one primary action.

---

# Chip Types

The first generation of Song Chips should explore several distinct design families.

---

## Inline Mention

Designed to appear naturally inside paragraphs of text.

Example:

```
That night, Midnight Miles ▶ changed everything.
```

Typical Elements

- Song Title
- Optional Play Button

---

## Compact Chip

A compact object reference.

Ideal for:

- Search Results
- Autocomplete
- Related Songs
- Inspector Panels

Typical Elements

- Cover
- Title
- One Metadata Field
- Optional Play

---

## Row Chip

A simplified horizontal song row.

Ideal for:

- Lists
- Queue Views
- Related Songs
- Embedded Song References

Typical Elements

- Play
- Cover
- Title
- Artist
- Length
- Menu

---

## Play Chip

Audio-focused.

Typical Elements

- Play Button
- Song Title
- Length

Useful for quickly embedding playable songs inside articles or documentation.

---

## Artwork Chip

Artwork-first presentation.

Typical Elements

- Cover
- Song Title

Minimal interaction.

---

## Mention Badge

The smallest Song reference.

May contain only:

- Song Icon
- Song Title

Useful for dense editorial layouts.

---

# Themes

Like Song Cards, Chips should support multiple visual themes.

Examples include:

- Light
- Dark
- Editorial
- Halloween
- Christmas
- Vintage
- House
- Minimal

Themes should alter presentation while preserving the Chip's overall structure.

---

# Card vs Chip

Cards and Chips intentionally solve different problems.

## Song Card

Purpose:

Present a song.

Typical Content

- Artwork
- Caption
- Quote
- Genres
- Metadata
- Footer
- Rich interaction

---

## Song Chip

Purpose:

Reference a song.

Typical Content

- Title
- Artwork (optional)
- One supporting field
- One action

---

# Card States

Song Chips participate in the shared Song Pages interaction model.

- Default
- Hover
- Selected
- Playing
- Disabled
- Loading

---

# Card Actions

Song Chips participate in the shared Song Pages action system.

Potential interactions include:

- Click Play
- Click Title
- Click Artwork
- Click Favorite
- Click Menu
- Keyboard Navigation
- Touch Interaction

Specific behaviors will be standardized across Song Pages and are intentionally left flexible during early development.

---

# First Goal

Our first implementation should focus on building several distinctly different Chip designs rather than exposing dozens of customization options.

The initial design families should include:

1. Inline Mention
2. Compact Chip
3. Row Chip
4. Play Chip
5. Artwork Chip
6. Mention Badge

As with Song Cards, the initial user of this system is the application designer.

The goal is to iteratively refine both the Chip renderer and the Chip designs until they become stable reusable components.

Eventually artists will be able to select:

- Chip Design
- Theme
- Basic structural choices

and save those configurations as reusable Song Chips for use throughout Song Pages.

The objective is to build a lightweight object language that complements Song Cards while allowing songs to be referenced naturally throughout the entire Song Pages ecosystem.