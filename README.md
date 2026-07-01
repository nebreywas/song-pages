# Song Pages

Desktop Electron app for the Song Pages decentralized music publishing platform (Proof of Concept).

Artists compile static websites with Song Pages manifests. Listeners subscribe by URL and get a unified desktop player with canonical song pages embedded during playback.

## PoC Scope

This release validates one closed loop:

1. **Artist Mode** — edit catalog, compile static site + manifests (requires ffmpeg on PATH)
2. **Manual upload** — deploy compiled folder to static host (e.g. Bunny.net)
3. **Listener Mode** — subscribe by artist URL, import catalog to SQLite, play HLS, show song page in webview

See `documentation/design-and-vision.md` and `documentation/manifest-schemas.md`.

## Technology Stack

| Layer | Technology |
|-------|------------|
| Desktop | Electron |
| UI | React + TypeScript + Vite |
| Listener storage | SQLite (better-sqlite3) |
| Artist draft storage | SQLite (via settings table) |
| Compile | TypeScript + ffmpeg + HTML templates |
| Playback | hls.js |

## Getting Started

### Prerequisites

- Node.js 20+
- ffmpeg on PATH (Artist Mode compile)
- macOS, Windows, or Linux

### Install & run

```bash
npm install
npm run dev
```

Use the **Song Pages** menu (Listener, Artist, Developer, About) or shortcuts **⌘1–3**.

### Remote test target

After recompiling with manifest emission, upload to static host and subscribe in Listener Mode:

`https://sawyerhouse-music.b-cdn.net`

## Project Structure

```
song-pages/
├── documentation/          # Vision + manifest schemas
├── electron/               # Main process, IPC, SQLite, listener import
├── compiler/               # Static site + manifest generator
├── artist-page-templates/  # HTML/CSS/JS templates for compiled sites
├── shared/                 # Shared manifest types
└── src/                    # React renderer (Listener, Artist, etc.)
```

## Compile Output

Each compile writes:

- `songpages-artist.json`
- `songpages-catalog.json`
- `songs/{slug}/songpages-song.json` (per song)
- HTML, HLS segments, images, CSS, JS

Default output: `{userData}/artistpages/{slug}/`

## License

Personal and confidential. © Ben Sawyer.
