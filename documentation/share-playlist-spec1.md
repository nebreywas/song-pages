# Share Playlist Feature Specification

**Status:** Draft 1  
**Priority:** Medium  
**Area:** Listener Mode / Playlists  
**Purpose:** Allow users to quickly share playlists to Discord, forums, social media, email, and other destinations by exporting playlist information as formatted text.

---

# Overview

Song Pages should allow users to generate a nicely formatted text representation of one of their playlists and copy it directly to the clipboard.

This feature is intended for **sharing**, not file export.

The generated output should work well when pasted into:

- Discord
- Reddit
- Forums
- Email
- Bluesky
- Mastodon
- GitHub
- Documentation
- Any plain text destination

The user should never need to manually assemble playlist information.

---

# Availability

This feature is available only for:

- Suno Playlists
- Custom Playlists

This feature is **not** available for Artist Pages.

Artist pages are already intended to be shared directly using their URL.

---

# Entry Point

The Playlist Homepage (displayed when selecting a playlist) should contain:

**Share Playlist**

Selecting this opens the **Share Playlist** modal.

---

# Modal Layout

The modal should be divided into two primary sections.

```
-------------------------------------------------------------
|                         Share Playlist                    |
-------------------------------------------------------------
|                                                           |
|  UI / Options                     Live Preview            |
|  ---------------------------      ----------------------   |
|                                                           |
|  Playlist Name             []     (generated preview)      |
|                                                           |
|  Introduction              []                              |
|                                                           |
|  Include:                                                |
|    ☑ Album                                              |
|    ☑ Year                                               |
|    ☑ Length                                             |
|                                                           |
|  Link Style                                             |
|    ○ Full URLs                                          |
|    ○ Masked Links (Discord Markdown only)               |
|    ○ No Links                                           |
|                                                           |
|  Output Format                                          |
|    ○ Plain Text                                         |
|    ○ Markdown                                           |
|                                                           |
-------------------------------------------------------------
|            [Copy to Clipboard]     [Cancel]              |
-------------------------------------------------------------
```

---

# Live Preview

The right side of the dialog should contain a live preview.

Every option change immediately regenerates the preview.

The preview is:

- read-only
- selectable
- scrollable

The preview should **not** be directly editable.

The UI controls are the source of truth.

---

# UI Fields

## Playlist Name

Default:

Current playlist name.

User may edit.

The edited name affects only the generated output.

The playlist itself is not renamed.

---

## Introduction

Default:

```
Hi,

Here's a playlist I thought you might enjoy.
```

User may freely edit.

Supports multiple lines.

---

## Include Metadata

Checkboxes:

```
☑ Album Name

☑ Song Year

☑ Song Length
```

Only include selected fields.

If unavailable they are omitted automatically.

---

## Link Style

```
○ Full URLs

○ Masked Links (Discord Markdown only)

○ No Links
```

### Full URLs

Outputs URLs on their own line.

Example:

```
Afterlight - Ben Sawyer

https://...
```

---

### Masked Links

Available only when Markdown format is selected.

Uses Discord-supported Markdown links.

Example

```
[Afterlight](https://...)
```

If Plain Text is selected this option should automatically disable.

---

### No Links

Do not output any URLs.

Useful when someone only wishes to share the playlist contents.

---

## Output Format

Supported formats:

```
○ Plain Text

○ Markdown
```

Markdown support intentionally uses only formatting widely supported by Discord.

---

# Plain Text Output

Example

```
Hi,

Here's a playlist I thought you might enjoy.

My Favorite Songs of June 2026

Created July 1, 2026

22 tracks

Afterlight - Ben Sawyer (2025) - 3:47
https://...

Always Love, Everyday, Everyone! - Ben Sawyer (2025) - 5:50
https://...

Schmup 1.5 - Ben Sawyer
(Music From Games, 2026)
4:06
https://...

This playlist was created with Song Pages
```

---

# Markdown Output

Markdown should intentionally stay within the subset documented by Discord.

Reference:

https://support.discord.com/hc/en-us/articles/210298617-Markdown-Text-101-Chat-Formatting-Bold-Italic-Underline

Formatting rules:

- Playlist title uses `#`
- Created date uses `##`
- Track count uses `###`
- Track titles are **bold**
- Album names are *italic*
- Song Pages attribution uses Discord subtext (`-#`)

Example

```markdown
# My Favorite Songs of June 2026

## Created July 1, 2026

### 22 Tracks

**Afterlight** - Ben Sawyer (*Music From Games*, 2026) - 3:47

https://...

**Always Love, Everyday, Everyone!** - Ben Sawyer (2025) - 5:50

https://...

-# This playlist was created with Song Pages
```

---

# Masked Links

When enabled:

```
**Schmup 1.5**

↓

[**Schmup 1.5**](https://...)
```

Only available for Markdown output.

---

# Missing Information Rules

Playlist exports should degrade gracefully.

If information is unavailable:

| Field | Replacement |
|----------|--------------------|
| Track Name | Unknown Track Name |
| Artist Name | Name Unknown |
| Album | Omit |
| Song Year | Omit |
| URL | Omit |
| Length | Omit |

Formatting should automatically adjust.

Examples:

```
Song Title - Name Unknown
```

instead of

```
Song Title - ()
```

or

```
Song Title - Name Unknown () -
```

No empty punctuation should remain.

---

# Export Model

Internally the system should separate data gathering from rendering.

```
Playlist

↓

Playlist Export Model

↓

Renderer

↓

Clipboard
```

The export model should contain:

- Playlist Name
- Introduction
- Creation Date
- Track Count
- Ordered Track List
- Attribution

The renderer is responsible only for formatting.

This allows future renderers (HTML, BBCode, etc.) without modifying playlist extraction logic.

---

# Clipboard

Selecting **Copy to Clipboard** copies the generated output exactly as shown in the preview.

No intermediate files are created.

---

# Future Expansion

Not part of this feature.

Possible future renderers:

- HTML
- Rich Text
- BBCode
- GitHub Markdown
- Reddit Markdown
- Export to .txt
- Export to .md
- Publish Playlist Page

These should reuse the Playlist Export Model.

---

# Design Philosophy

This feature exists to make sharing playlists effortless.

It should:

- generate clean, readable output
- tolerate missing information gracefully
- separate export logic from formatting
- prioritize clipboard workflows over file generation
- produce attractive output that requires little or no editing before sharing