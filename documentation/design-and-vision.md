# Project Vision

Song Pages is an open, decentralized music publishing platform designed to help independent artists establish a richer, more permanent presence on the web while creating a desktop listening experience that naturally brings those independent websites together.

Instead of uploading music into a centralized streaming platform, artists publish their own Song Pages website. Each website contains human-readable pages alongside machine-readable manifests that describe the artist and their music.

Listeners then use the Song Pages desktop application to subscribe to artists by simply entering the URL of an artist's website. The player reads the published manifests, imports the artist into the listener's personal library, and presents music through a familiar desktop music player interface.

In many ways, Song Pages is inspired by the way RSS transformed thousands of independent blogs into a cohesive reading experience without requiring authors to publish everything to a single website. Every artist continues to own their own web presence while the player provides listeners with a unified way to discover, organize, and enjoy music from many independent sources.

**The artist's website always remains the canonical home of their work.**

The desktop player does not replace the website. Instead, it enhances it by providing traditional music player functionality while displaying the artist's published Song Page during playback. This allows artists to fully control the presentation of lyrics, artwork, commentary, credits, links, and other content without requiring the player to duplicate that experience.

The platform is intentionally **static-first**. Artists should be able to publish using inexpensive static web hosting without requiring databases or server-side programming. Future versions may support richer deployment targets and additional capabilities, but the core publishing model should remain compatible with simple static websites.

This project began with a small proof of concept and has since grown meaningful presentation capabilities (visualizers, VC Mode, host content) while keeping the same publishing/listening boundaries. Architectural decisions should continue to prioritize simplicity, modularity, and future extensibility over premature optimization.

---

# Song Pages Complements Existing Music Platforms

Song Pages is not intended to replace existing music platforms.

Independent artists already use many excellent services, each serving different purposes. Spotify, Apple Music, SoundCloud, Bandcamp, YouTube, Suno, Producer.ai, and many others all provide valuable ways to publish, distribute, monetize, or promote music.

Song Pages should complement those services rather than compete with them.

Every Song Page should encourage artists to link listeners to the places where they already have an established presence. A listener who discovers an artist through Song Pages should be able to easily continue listening on Spotify, subscribe on YouTube, purchase music on Bandcamp, follow on SoundCloud, or visit any other platform the artist chooses.

At the same time, many independent artists have a problem that traditional streaming services do not solve.

Modern creators often produce music from many different tools and workflows. An artist's catalog may include songs created with traditional DAWs, AI music tools, desktop and mobile recording apps, experiments, demos, instrumentals, public domain arrangements, live recordings, and alternate mixes.

Much of this work may never be formally released through commercial streaming platforms. Some songs are experiments. Some are works in progress. Some simply are not worth the cost or effort of commercial distribution.

As a result, many artists have no single place where their complete creative catalog can exist.

**Song Pages is designed to become that canonical home.**

Artists should be able to publish everything they choose to share, regardless of where or how it was created.

- Some songs may stream directly from Song Pages.
- Some may only offer previews.
- Some may simply point listeners to Spotify or another service.
- Others may exist only as informational pages.

That flexibility is intentional.

The Song Pages desktop player embraces this philosophy. Rather than attempting to replace commercial streaming platforms, it provides listeners with a unified way to browse and enjoy an artist's broader creative catalog while naturally directing listeners toward the artist's preferred destinations for streaming, purchasing, following, or supporting their work.

**Long-term goal:** Song Pages should become one of the most complete and authentic places to discover an independent artist's body of work, while simultaneously helping that artist grow their audience everywhere else.

---

# Song Pages Electron Application — Architecture Overview

Song Pages is a desktop Electron application built around a shared music ecosystem. The primary operating modes are:

| Mode | Purpose |
|------|---------|
| **Listener Mode** | Subscribe, library, playback, song page presentation |
| **Artist Mode** | Catalog editing, compile, static site generation |
| **Developer** | Internal tools and diagnostics |
| **About** | Version and app information |

Although Listener and Artist appear as separate experiences, they are intentionally part of the same application. Every artist is expected to use the player, and every listener can become an artist. The application is designed around one ecosystem rather than separate products.

The renderer uses **React + TypeScript + Vite** with multiple HTML entry points: the main window, a visualizer projection window, and a VC Mode projection window. Cross-process types and geometry live in **`shared/`**. The compile pipeline lives in **`compiler/`** and is bundled for packaged Electron.

The application should remain modular so future releases can expand either experience independently while sharing common services: networking, caching, playback, settings, logging, and local storage.

**Architecture docs (implementation detail):**

- [manifest-schemas.md](./manifest-schemas.md) — PoC manifest contracts
- [guest-rendering-security.md](./guest-rendering-security.md) — Untrusted song page webviews
- [security-model-and-completed-actions.md](./security-model-and-completed-actions.md) — Security checklist
- [audio-pipeline.md](./audio-pipeline.md) — Playback, mirror, Discord capture, debug tooling (canonical)
- [vc-mode-architecture.md](./vc-mode-architecture.md) — VC Mode runtime and audio mirror
- [visualizer-architecture.md](./visualizer-architecture.md) — Web Audio and projection visualizers
- [settings-and-persistence.md](./settings-and-persistence.md) — Settings keys and disk paths

---

# Listener Mode

Listener Mode is the primary music playback experience.

The design goal is a modern desktop music player inspired by library-based applications such as iTunes, Apple Music, Plexamp, and Foobar2000 — but fed by independent artist websites rather than a centralized catalog.

## Subscription and library

Listeners build a personal collection by subscribing to Song Pages artist URLs (for example `https://sawyerhouse-music.b-cdn.net`). The app:

1. Fetches `songpages-catalog.json` (and related manifests)
2. Imports artist and song metadata into a local **SQLite** library
3. Presents artists and songs in a familiar sidebar + song list UI
4. Refreshes subscribed artists on launch and on manual refresh

There is no centralized Song Pages catalog server. Each user's library is their own.

## Playback

Playback should feel like a traditional desktop music application.

**Implemented today:**

- Add / refresh artists by URL
- Artist and song library views
- Queue, shuffle, repeat
- Previous / next, play / pause, seek, volume
- HLS streaming via hls.js (CDN-hosted segments from compiled sites)
- **Liked Songs** — per-song like toggle; virtual "Liked Songs" artist entry in the sidebar
- **Song page in webview** — canonical artist HTML during playback (sandboxed guest)
- **Embedded visualizer** — optional in-player audio-reactive overlay
- **Visualizer projection window** — separate window for OBS / second monitor
- **VC Mode** — configurable shareable surface for Discord, Twitch, listening parties
- Playback position and UI preferences persisted locally
- **HLS cache** — LRU cache of recent song media (entry-count cap, configurable)

**Not yet implemented (future):**

- Full playlists / albums as first-class library objects (beyond liked songs)
- Offline-first library sync across devices
- Discovery / search across the wider Song Pages network
- In-app artist subscription management beyond URL entry

## Song page presentation

A distinctive feature: the currently playing song displays its **canonical Song Page** inside the application (upper portion of Listener Mode). The artist's published HTML remains the primary presentation layer for lyrics, artwork, notes, credits, commentary, external links, and future interactive content.

The player enhances the website; it does not replace it. In Electron, song pages load in a hardened **guest webview** with no preload, no IPC, and strict navigation policy. See [guest-rendering-security.md](./guest-rendering-security.md).

Compiled sites recognize `?songpagesApp=1` and hide browser-only chrome (footer player, redundant controls) via template CSS — no injection into guest documents from Electron.

---

# Artist Mode

Artist Mode transforms the application into a publishing environment.

Its purpose is to help artists organize their catalog, maintain metadata, and compile a complete static Song Pages website.

The editor stores structured information about the artist and songs locally (SQLite settings / project storage). **Audio files remain external assets** and are referenced rather than imported into the database.

When the artist chooses **Compile**, the compiler generates:

- Static HTML pages, CSS, JavaScript
- Images and HLS media (requires ffmpeg on PATH)
- Song Pages manifests (`songpages-artist.json`, `songpages-catalog.json`, per-song `songpages-song.json`)
- Supporting assets

The resulting output is uploaded by the artist to any static web host: Bunny.net, GitHub Pages, Netlify, S3, Cloudflare Pages, traditional hosting, etc.

The generated website remains fully functional **without** the Electron application.

---

# Compiler Philosophy

The Song Pages compiler is responsible for transforming an artist's structured catalog into deployable web assets.

**The compiler is the canonical source of truth.** Generated HTML, JSON manifests, HLS assets, and other files are build artifacts and should not be edited manually on the deployed site.

Future compiler versions may target additional deployment environments without requiring artists to reorganize their catalog. Manifest schemas use `schemaVersion` for forward compatibility. See [manifest-schemas.md](./manifest-schemas.md).

---

# Presentation, Streaming, and Listening Parties

Beyond personal listening, Song Pages supports **shared presentation** for hosts running Discord voice channels, Twitch streams, Zoom listening parties, second monitors, and projectors.

This is not professional broadcast software (OBS, vMix, etc.). The intended user is a music host or artist who wants an attractive shared surface without learning broadcast tools.

## VC Mode

**VC Mode** is a dedicated external window that composes:

- **Surface geometry** — 13 stock division templates, adjustable dividers, draggable floats
- **Song content** — cover, lyrics, about, artist info, genres, video cover, visualizer
- **Host content** — reusable catalog of host graphics, videos, title/area text, graphics groups
- **Mirrored audio** — HLS playback in the VC window so **window-only** screen capture (Discord, OBS) includes music

The **Surface/View Designer** (in the main app) configures layout and assignments. Designs auto-save locally. Live VC renders resolved content from shared resolution logic used in both designer preview and the projection window.

Product spec: [song-pages-vc-mode-surface-view-designer-spec.md](./song-pages-vc-mode-surface-view-designer-spec.md)  
Runtime architecture: [vc-mode-architecture.md](./vc-mode-architecture.md)

Design philosophy: **constrained structure first, then controlled freedom through floats.** VC Mode does not attempt arbitrary canvas editing, node graphs, or unrestricted layering.

## Visualizers

**Visualizers** provide audio-reactive graphics during playback:

- Native canvas experiences (e.g. aurora, spectrum bars, cover pulse)
- **Butterchurn** (Milkdrop-style presets from an approved catalog)

Visualizers can run **embedded** in Listener Mode or in a **separate projection window**. Web Audio analysis runs on the main window; projection surfaces receive FFT data (and Butterchurn canvas mirrors when needed).

Only one visualizer session is active at a time (embedded or projection). Starting VC Mode closes the standalone visualizer projection window.

Architecture: [visualizer-architecture.md](./visualizer-architecture.md)

## Host content

**Host content** is a reusable catalog separate from surface designs. Hosts maintain graphics, short videos, and text snippets once, then assign them to VC surface regions with optional per-assignment overrides (typography, fit, alignment).

Host media is imported into local app storage; metadata persists in SQLite. Surface Designer owns placement; Host Content owns source material and defaults.

Product design: [Host-content-design.md](./Host-content-design.md)

---

# Local Storage

The application maintains a local **SQLite** database for:

| Data | Status |
|------|--------|
| Imported artists and songs | Implemented |
| Liked songs | Implemented |
| User settings (theme, sidebar, visualizer, VC config, host catalog) | Implemented |
| Artist workspace / projects | Implemented |
| Playback history | Partial / evolving |
| Cached manifests | Implemented (via refresh) |
| HLS media cache metadata | Implemented (LRU entry count) |
| Playlists (user-defined) | **Future** |
| Cross-device sync | **Future** |

**SQLite stores metadata.** Large binary assets (audio segments, host media, compiled site output) remain on disk and are referenced by path.

Settings key registry: [settings-and-persistence.md](./settings-and-persistence.md)

---

# Shared Architecture

Listener Mode, Artist Mode, VC Mode, and visualizers share infrastructure:

- SQLite database layer (`electron/database.js`)
- IPC and preload bridge (`electron/ipc.js`, `electron/preload.js`)
- Manifest parsing and HTTP fetch (listener import, lazy song manifests)
- HLS playback and optional local cache (`electron/listener/cache/`)
- Guest webview security (`electron/listener/guestSession.js`, `guestSecurity.js`)
- Logging, settings, theming
- Shared TypeScript types (`shared/`)

The goal is one application with multiple perspectives on the same music ecosystem — not separate apps inside one shell.

**Boundary rules worth preserving:**

| Layer | Trust |
|-------|-------|
| App shell (React, VC, visualizers) | Trusted |
| Remote song pages (guest webview) | Untrusted |
| Artist-published manifests | Trusted for metadata; verified by subscription URL |
| Host-imported media | Trusted local user content |

---

# Proof of Concept — Original Goals and Current Status

The first proof-of-concept release intentionally limited scope: prove the publishing and listening loop, not a feature-complete platform.

## Original workflow (still the core)

1. Artist enters catalog information in the editor
2. Compiler generates a static Song Pages website
3. Artist uploads files to a static host
4. Listener enters the artist URL
5. Player imports manifests and populates the library
6. Songs play with HLS
7. The artist's Song Page appears during playback

**This workflow is validated.**

## Capabilities added beyond the original PoC scope

These extend the desktop player without changing the static publishing model:

- Liked Songs collection
- HLS segment caching
- Visualizers (native + Butterchurn) with projection window
- VC Mode with Surface/View Designer, host content catalog, audio mirror for capture
- App presentation mode (`songpagesApp=1`) and compile-time CSP
- Guest rendering security hardening
- Multi-project Artist workspace
- Packaged desktop builds (macOS / Windows / Linux)

## Still future (not blocking PoC validation)

- Playlists and albums as rich library objects
- Manifest authenticity / signing
- Safer HLS proxy (replacing `webSecurity: false` on app windows)
- Discovery across artists
- Dynamic / non-static deployment targets
- Monetization, Manifest+, multi-user hosting features
- Automated security and migration test suites (in progress)

If the core loop remains stable, future work can focus on discovery, library organization, deployment hardening, and network effects **without** redesigning the static-first publishing boundary.

---

# Design Principles (ongoing)

These should guide the next sprints:

1. **Artist site is canonical** — The player surfaces artist content; it does not fork presentation into duplicate templates unless necessary (VC/host overlays are explicit exceptions for streaming).
2. **Static-first publishing** — Compiler output must remain deployable to dumb static hosts.
3. **Constrained power** — VC Mode and host tools favor guided layouts over infinite flexibility (see surface designer spec).
4. **Clean boundaries** — `shared/` for cross-window logic; migrations for every persisted shape change; guest content never gets app privileges.
5. **Modular growth** — New presentation features (visualizers, VC regions) plug into registry/resolution patterns rather than one-off branches.
6. **Capture-aware playback** — When users share a window, audio must be capturable on that window's process. See [audio-pipeline.md](./audio-pipeline.md).

---

# Document maintenance

This vision document describes **intent and direction**. Implementation detail lives in the linked architecture and spec documents. When adding major features, update this file's capability tables and future-work lists so product vision stays aligned with the codebase.

*Last structured review: July 2026 — reflects VC Mode 1.0 surface designer, host content, visualizers, liked songs, and HLS cache.*
