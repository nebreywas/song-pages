# electron-starter

Canonical Electron application template for SawyerHouse desktop software.

This repository is **infrastructure, not a product**. It establishes a stable, secure, well-documented foundation for future applications including Recordtopia, Voluminous desktop tools, and catalog management tools.

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Desktop | [Electron](https://www.electronjs.org/) | Native shell, IPC, filesystem, SQLite |
| Frontend | [Vite](https://vite.dev/) | Dev server, hot reload, production bundling |
| Language | JavaScript | Intentionally no TypeScript in v1.0 |
| Database | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Local settings, caches, metadata |
| Packaging | [electron-builder](https://www.electron.build/) | macOS DMG, Windows installer, Linux packages |

## Project Structure

```
electron-starter/
├── electron/           # Main process, preload, IPC, SQLite, logging
│   ├── main.js
│   ├── preload.js
│   ├── ipc.js
│   ├── database.js
│   ├── logger.js
│   └── dev-menu.js     # Development only (not loaded in production)
├── src/                # Renderer (standard web application)
│   ├── index.html
│   ├── app.js
│   └── style.css
├── public/             # Static assets copied verbatim to dist/
│   └── example/
├── database/           # Placeholder for schema/migration assets
├── dist/               # Vite production output (gitignored)
├── build/              # electron-builder installers (gitignored)
├── vite.config.mjs
├── electron-builder.yml
└── package.json
```

## Architecture

Electron is split into three layers:

1. **Main process** (`electron/`) — window lifecycle, native dialogs, SQLite, logging, IPC handlers. Keep this small; no business logic.
2. **Preload** (`electron/preload.js`) — exposes a minimal `window.app` API via `contextBridge`. Never expose Node.js to the renderer.
3. **Renderer** (`src/`) — HTML, CSS, and JavaScript. Behaves like a normal web application.

### Security Defaults

- `contextIsolation: true`
- `sandbox: true`
- `nodeIntegration: false`
- All native access through preload only

### Preload API

```javascript
window.app.getVersion()
window.app.openFile()
window.app.getSettings(key)
window.app.saveSettings(key, value)
window.app.exportLogs()
window.app.getExamplePageUrl()
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- macOS, Windows, or Linux

On macOS, Xcode Command Line Tools are required for native module compilation (`better-sqlite3`).

### Install

```bash
npm install
```

`postinstall` runs `electron-rebuild` to compile `better-sqlite3` for your Electron version.

### Development

```bash
npm run dev
```

This starts:

1. Vite dev server on `http://localhost:5173`
2. Electron, loading the dev server with hot reload

Development-only features (debug menu, DevTools shortcut, open user-data folder) are enabled automatically when the app is not packaged.

### Production Build

```bash
npm run build
```

Bundles the renderer into `dist/`.

### Package Installers

```bash
npm run package        # Current platform
npm run package:mac    # macOS DMG
npm run package:win    # Windows NSIS installer
npm run package:linux  # Linux AppImage
```

Output is written to `build/`.

## Hello World Demo

The startup screen shows:

- **Electron Template**
- **Hello World**
- **[ Load Example Web Site ]** — navigates to a locally hosted example page in `public/example/`

This demonstrates Electron startup, renderer operation, navigation, and project structure. No additional functionality is included by design.

## SQLite

SQLite is the canonical local persistence layer. The template initializes a database at:

```
{userData}/database/app.db
```

Suggested uses: settings, cache indexes, metadata, favorites, catalog storage. **Do not store large binary media in SQLite** — keep assets on the filesystem.

Settings are accessed via IPC:

```javascript
await window.app.saveSettings('theme', 'dark');
const theme = await window.app.getSettings('theme');
```

## Logging

| Mode | Behavior |
|------|----------|
| Development | Verbose console output (`debug` level and above) |
| Production | Minimal console; logs persisted to `{userData}/logs/` |

Export logs for debugging:

```javascript
const result = await window.app.exportLogs();
// result.path points to a combined log file
```

## Code Signing & Distribution

Development builds are unsigned. Future public releases should add:

- Apple Developer code signing and notarization
- Windows code signing
- Auto-update via `electron-updater`

These are intentionally deferred until public release.

## Design Philosophy

- Prefer stability over novelty
- Prefer widely-used libraries with large communities
- Avoid unnecessary frameworks
- Keep Electron-specific code extremely small
- Build application functionality in the renderer whenever possible
- Maintain clean separation between native functionality and application logic
- Favor explicit architecture over magic

## Future Extensions

This template is designed to support future additions without architectural changes:

- SQLite catalogs
- Audio playback
- Local media cache
- AI integration
- Embedded web applications
- Protocol readers
- Background synchronization
- Local search
- Auto updates

Applications should evolve by adding functionality **on top of** this foundation rather than modifying the foundation itself.

## License

Private — SawyerHouse internal use.
