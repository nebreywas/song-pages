# Wide Song Cards

Wide Song Cards are optimized for displaying songs within collections such as albums, playlists, search results, queue views, and library listings. Unlike Portrait Song Cards, these cards are designed to stack vertically while presenting more contextual information across the horizontal layout.

Like Portrait Song Cards, Wide Song Cards are rendered from Song Data combined with user structural choices and a selected card design. They share many rendering concepts but adapt them for a wider, horizontally-oriented presentation.

---

# Zones

Wide Song Cards are divided into four primary zones:

- Cover Zone
- Information Zone
- Track Highlights Zone
- Tail Zone

These zones establish the visual language of all wide song card renderers while allowing individual card designs to vary considerably.

---

# Cover Zone

The Cover Zone displays the song artwork.

Unlike Portrait Song Cards, the Cover Zone intentionally exposes very few overlay options. Because wide cards contain significantly more information elsewhere, the artwork should remain visually clean.

## Cover Artwork

The renderer determines the final treatment of artwork including:

- cropping
- scaling
- blending
- borders
- shadows

These decisions are part of the card design rather than artist customization.

---

## Animated Covers

Wide cards support the same animated cover options available to Portrait Song Cards.

Examples include:

- Static only
- Animated when available
- Animate on play
- Animate on hover
- Loop
- Play once

---

## Play Overlay

If the song is playable, a play control may be displayed over the artwork.

The renderer currently supports two placement options:

```
Center of artwork

Lower-right corner
```

The renderer determines styling.

---

## Track Number

Since Wide Song Cards are commonly used inside albums and playlists, displaying the track number is encouraged.

The renderer may display:

- Track Number
- Playlist Position
- Queue Position

depending on context.

---

# Information Zone

The Information Zone contains the primary descriptive information about the song.

Typical information includes:

## Required

- Song Title
- Artist

## Optional

- Album Name
- Playlist Name
- Subtitle
- Caption
- Genres
- Themes
- Lyric Quote

Unlike Portrait Song Cards, Wide Song Cards generally have less vertical space available, so not every information element will fit simultaneously.

Each card design determines:

- which information elements may appear
- their visual hierarchy
- overflow behavior
- clamping
- scrolling
- truncation

The renderer should favor readability over exposing every available field.

---

# Track Highlights Zone

The Track Highlights Zone displays one featured element together with structured song metadata.

Its purpose is to quickly communicate something interesting or distinctive about the song.

---

## Highlight Row

The first row contains one featured element chosen by the renderer or user configuration.

Examples include:

- Waveform
- Lyric Quote
- Musical Ensemble
- Vocal Presentation
- Performance Summary
- Currently Playing Visualization

Only one featured highlight is shown.

---

## Metadata Rows

Below the Highlight Row are one or more metadata rows.

Each row may contain multiple metadata items.

Typical metadata includes:

- Length
- Time Remaining (when playing)
- Explicit Bug
- Release Date
- BPM
- Codec
- Bitrate
- Main Genre
- Musical Ensemble
- Vocal Presentation

The renderer determines spacing, grouping, and typography.

---

# Tail Zone

The Tail Zone occupies the far right side of the card and contains lightweight metadata together with utility actions.

Keeping these elements grouped together creates a consistent interaction area across all Wide Song Cards.

---

## Top Section

The top portion of the Tail Zone may contain one or more of:

- Release Date
- Favorite / Like

The exact combination depends on the selected card design.

---

## Bottom Section

The bottom portion of the Tail Zone may contain:

- Release Date
- Favorite / Like

and always includes:

- Menu Bug

The Menu Bug is considered a permanent element of the Tail Zone and provides access to contextual actions for the card.

Future menu actions may include:

- View Song
- Play
- Queue
- Add to Playlist
- Share
- Edit
- Delete
- Additional Song Page features

The exact action list is outside the scope of this renderer specification.

---

# Card States

Wide Song Cards support the same interaction states as Portrait Song Cards.

- Default
- Hover
- Selected
- Playing
- Disabled
- Loading

Future states may be added as Song Pages evolves.

---

# Card Actions

Wide Song Cards will eventually participate in the shared Song Pages interaction model.

Potential actions include:

- Click Cover
- Click Play
- Click Title
- Click Metadata
- Click Favorite
- Click Menu
- Double Click
- Right Click
- Long Press
- Keyboard Navigation
- Touch Interaction

The exact behavior of these actions will be standardized across Song Pages and is intentionally left flexible during the initial design phase.

---

# Design Philosophy

Wide Song Cards should emphasize scanning and comparison rather than immersion.

Portrait Song Cards present an individual song almost like a collectible object.

Wide Song Cards present songs as members of a collection.

The renderer should therefore prioritize:

- quick recognition
- consistent alignment
- readable metadata
- efficient comparison between neighboring songs
- lightweight interaction

The overall goal is to allow many songs to be browsed rapidly without sacrificing visual quality or Song Pages' evolving design language.