# Song Pages

Desktop Electron app for the Song Pages decentralized music publishing platform.

Artists compile static websites with Song Pages manifests. Listeners subscribe by URL and get a unified desktop player with canonical song pages embedded during playback. **VC Mode** provides a shareable presentation surface for Discord, Twitch, and streaming; **visualizers** add audio-reactive graphics in the player or a projection window.

## PoC scope (core loop)

This release validates one closed loop:

1. **Artist Mode** — edit catalog, compile static site + manifests (requires ffmpeg on PATH)
2. **Manual upload** — deploy compiled folder to static host (e.g. Bunny.net)
3. **Listener Mode** — subscribe by artist URL, import catalog to SQLite, play HLS, show song page in webview

Beyond the core loop, the desktop app also includes VC Mode (surface designer + projection window), host content catalog, and visualizers (native + Butterchurn).

## Documentation

| Document | Topic |
|----------|--------|
| [design-and-vision.md](documentation/design-and-vision.md) | Product vision |
| [manifest-schemas.md](documentation/manifest-schemas.md) | PoC manifest contracts |
| [guest-rendering-security.md](documentation/guest-rendering-security.md) | Guest webview trust model |
| [security-model-and-completed-actions.md](documentation/security-model-and-completed-actions.md) | Security checklist |
| [vc-mode-architecture.md](documentation/vc-mode-architecture.md) | VC Mode runtime, IPC, audio mirror, Discord testing |
| [visualizer-architecture.md](documentation/visualizer-architecture.md) | Web Audio graph, experiences, projection |
| [settings-and-persistence.md](documentation/settings-and-persistence.md) | Settings keys and disk paths |
| [song-pages-vc-mode-surface-view-designer-spec.md](documentation/song-pages-vc-mode-surface-view-designer-spec.md) | VC surface designer product spec |
| [Host-content-design.md](documentation/Host-content-design.md) | Host content catalog design |
| [shared-utilities.md](documentation/shared-utilities.md) | Reusable `shared/` helpers (lyrics, time, markdown) |
| [ALARE.md](documentation/ALARE.md) | Approximate lyric allocation & rendering (VC lyric tracking) |

## Technology Stack

| Layer | Technology |
|-------|------------|
| Desktop | Electron |
| UI | React + TypeScript + Vite (multi-page: main, visualizer, VC) |
| Listener storage | SQLite (better-sqlite3) |
| Artist draft storage | SQLite (via settings table) |
| Compile | TypeScript + ffmpeg + HTML templates |
| Playback | hls.js |
| Visualizers | Canvas native + Butterchurn (WebGL) |

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

### Build & package

```bash
npm run build              # compiler bundle + butterchurn catalog + vite
npm run package:mac        # macOS distributable
npm run generate:butterchurn-catalog   # regenerate approved preset catalog
```

### Remote test target

After recompiling with manifest emission, upload to static host and subscribe in Listener Mode:

`https://sawyerhouse-music.b-cdn.net`

## Project Structure

```
song-pages/
├── documentation/          # Architecture, security, product specs
├── electron/               # Main process, IPC, SQLite, windows, host content media
├── compiler/               # Static site + manifest generator (+ Node tests)
├── shared/                 # Cross-process types + reusable helpers (see shared-utilities.md)
├── artist-page-templates/  # HTML/CSS/JS templates for compiled sites
├── src/                    # React renderer
│   ├── listener/           # Listener Mode, HLS player, song page webview
│   ├── artist/             # Artist Mode editor
│   ├── vc-mode/            # VC Surface/View Designer
│   ├── vc-window/          # Live VC projection window (incl. audio mirror)
│   ├── visualizers/        # Visualizer registry, audio graph, settings
│   └── visualizer-window/  # External visualizer projection window
├── scripts/                # Build, release, catalog generation
└── third-party/            # OSS credits and license texts (Butterchurn)
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
