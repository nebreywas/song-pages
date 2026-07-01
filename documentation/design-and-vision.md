Project Vision

Song Pages is an open, decentralized music publishing platform designed to help independent artists establish a richer, more permanent presence on the web while creating a desktop listening experience that naturally brings those independent websites together.

Instead of uploading music into a centralized streaming platform, artists publish their own Song Pages website. Each website contains human-readable pages alongside machine-readable manifests that describe the artist and their music.

Listeners then use the Song Pages desktop application to subscribe to artists by simply entering the URL of an artist’s website. The player reads the published manifests, imports the artist into the listener’s personal library, and presents music through a familiar desktop music player interface.

In many ways, Song Pages is inspired by the way RSS transformed thousands of independent blogs into a cohesive reading experience without requiring authors to publish everything to a single website. Every artist continues to own their own web presence while the player provides listeners with a unified way to discover, organize, and enjoy music from many independent sources.

The artist’s website always remains the canonical home of their work.

The desktop player does not replace the website. Instead, it enhances it by providing traditional music player functionality while displaying the artist’s published Song Page during playback. This allows artists to fully control the presentation of lyrics, artwork, commentary, credits, links, and other content without requiring the player to duplicate that experience.

The platform is intentionally static-first. Artists should be able to publish using inexpensive static web hosting without requiring databases or server-side programming. Future versions may support richer deployment targets and additional capabilities, but the core publishing model should remain compatible with simple static websites.

This project is intentionally beginning with a very small proof of concept.

The first milestone is not to build a complete music ecosystem. It is simply to prove that an artist can publish a static website, a listener can subscribe to that website, and the desktop player can present the artist’s catalog as a seamless part of a personal music library.

All architectural decisions should prioritize simplicity, modularity, and future extensibility over premature optimization. The proof of concept should establish clean boundaries between publishing, playback, and metadata so the platform can evolve over time without requiring fundamental redesigns.


Song Pages Complements Existing Music Platforms

Song Pages is not intended to replace existing music platforms.

Independent artists already use many excellent services, each serving different purposes. Spotify, Apple Music, SoundCloud, Bandcamp, YouTube, Suno, Producer.ai, and many others all provide valuable ways to publish, distribute, monetize, or promote music.

Song Pages should complement those services rather than compete with them.

Every Song Page should encourage artists to link listeners to the places where they already have an established presence. A listener who discovers an artist through Song Pages should be able to easily continue listening on Spotify, subscribe on YouTube, purchase music on Bandcamp, follow on SoundCloud, or visit any other platform the artist chooses.

At the same time, many independent artists have a problem that traditional streaming services do not solve.

Modern creators often produce music from many different tools and workflows.

An artist’s catalog may include songs created with:

* Traditional DAWs
* AI music tools
* Desktop recording software
* Mobile recording apps
* Experimental projects
* Demos
* Instrumentals
* Public domain arrangements
* Live recordings
* Alternate mixes

Much of this work may never be formally released through commercial streaming platforms.

Some songs are experiments.

Some are works in progress.

Some simply are not worth the cost or effort of commercial distribution.

As a result, many artists have no single place where their complete creative catalog can exist.

Song Pages is designed to become that canonical home.

Artists should be able to publish everything they choose to share, regardless of where or how it was created.

Some songs may stream directly from Song Pages.

Some may only offer previews.

Some may simply point listeners to Spotify or another service.

Others may exist only as informational pages.

That flexibility is intentional.

The Song Pages desktop player embraces this philosophy.

Rather than attempting to replace commercial streaming platforms, it provides listeners with a unified way to browse and enjoy an artist’s broader creative catalog while naturally directing listeners toward the artist’s preferred destinations for streaming, purchasing, following, or supporting their work.

The long-term goal is simple:

Song Pages should become one of the most complete and authentic places to discover an independent artist’s body of work, while simultaneously helping that artist grow their audience everywhere else.

Song Pages Electron Application — Architecture Overview
Song Pages is a desktop Electron application with two primary operating modes:
Listener Mode
Artist Mode
Although these appear as separate experiences, they are intentionally part of the same application. Every artist is expected to use the player, and every listener can become an artist. The application is therefore designed around a shared music ecosystem rather than separate products.
The application should remain modular so future releases can expand either experience independently while sharing common services such as networking, caching, playback, settings, analytics, and local storage.

⸻

Listener Mode
Listener Mode is the primary music playback experience.
The design goal is to create a modern desktop music player inspired by applications such as iTunes, Apple Music, Plexamp, Foobar2000, and similar library-based music players.
Unlike traditional streaming services, Song Pages does not maintain a centralized catalog. Instead, listeners build their own music collection by adding Song Pages artist websites.
For the proof of concept, a user simply enters an artist’s Song Pages URL, for example:
https://sawyerhouse-music.b-cdn.net
The player downloads the required Song Pages manifests, builds the local catalog, and presents the artist’s music as part of the user’s personal library.
The player should maintain a local SQLite database that stores imported artist information, song metadata, playback history, user preferences, and any cached information required for fast startup.
The player should periodically refresh artists by checking for updated manifests without requiring the user to re-import the artist manually.
Playback should feel like a traditional desktop music application.
Expected v0.1 capabilities include:
Add an artist by URL.
Refresh artist information.
Display artists.
Display songs.
Queue songs.
Shuffle.
Repeat.
Previous / Next.
Play / Pause.
Seek.
Volume control.
Remember playback position.
Maintain a local music library.
One unique feature of Song Pages is that the currently playing song should display its canonical Song Page directly within the application.
As each song begins playback, the application loads the artist’s published Song Page into the upper portion of the interface.
This creates a richer listening experience by allowing the artist’s own website to remain the primary presentation layer for:
Lyrics
Artwork
Song notes
Credits
Commentary
External links
Future interactive content
Rather than replacing the website, the player enhances it.

⸻

Artist Mode
Artist Mode transforms the application into a publishing environment.
Its purpose is to help artists organize their catalog, maintain metadata, and compile a complete static Song Pages website.
The editor stores structured information about the artist and songs locally using SQLite.
Audio files remain external assets and are referenced rather than imported into the database.
When the artist chooses Publish, the compiler generates:
Static HTML pages
CSS
JavaScript
Images
HLS media
Song Pages manifests
Supporting assets
The resulting output is uploaded by the artist to any static web host of their choosing.
Examples include:
Bunny.net
GitHub Pages
Netlify
Amazon S3
Cloudflare Pages
Traditional web hosting
The generated website remains fully functional without the Electron application.

⸻

Compiler Philosophy
The Song Pages compiler is responsible for transforming an artist’s structured catalog into deployable web assets.
The compiler is the canonical source of truth.
Generated HTML, JSON manifests, HLS assets, and other files are considered build artifacts and should never be edited manually.
Future versions of the compiler may generate additional deployment targets, including dynamic hosting environments, without requiring artists to reorganize their catalog.

⸻

Local Storage
The application should maintain a local SQLite database for:
Imported artists
Song metadata
User settings
Playback history
Cached manifests
Library organization
Future playlists
Future favorites
Future offline cache metadata
SQLite should store metadata only.
Large binary assets (audio, artwork, generated websites, etc.) remain on disk and are referenced by path.

⸻

Shared Architecture
Listener Mode and Artist Mode should share as much infrastructure as possible.
Examples include:
SQLite database layer
Networking
Manifest parsing
HTTP downloads
HLS playback
Local caching
Logging
Settings
Preferences
Background update services
The goal is to avoid building two separate applications that happen to live inside one Electron shell.
Instead, there should be one application with two perspectives on the same music ecosystem.

⸻

Proof of Concept Goals
The first proof-of-concept release intentionally limits scope.
The objective is to demonstrate a complete publishing and listening workflow rather than a feature-complete music platform.
The workflow should be:
An artist enters information into the editor.
The compiler generates a static Song Pages website.
The artist uploads the generated files to a static host.
A listener enters the artist’s URL into Song Pages.
The player imports the manifests.
The player’s library is populated automatically.
Songs can be played.
The artist’s published Song Page appears during playback.
If this workflow is successful, the core Song Pages publishing model has been validated. Future versions can then focus on richer metadata, discovery, playlists, albums, deployment hardening, Manifest+, monetization, dynamic deployment targets, and other advanced capabilities without fundamentally changing the architecture established by the proof of concept.

