# Artist Page Editor — Reference Bundle

Self-contained snapshot of the **artist page editor**, **compile pipeline**, **static site templates**, and **spec** from the Voluminous (Genre-db) repo. Use this as reference when building an Electron desktop app with the same functionality.

**Extracted from:** Voluminous / Genre-db (dev prototype, not deployed to Vercel)

---

## What this bundle contains

| Area | Path | Role |
|------|------|------|
| **Spec** | `docs/artist-page-editor.md` | User flow, persistence, output layout, cache busting |
| **Editor UI** | `src/artistPageEditor/` | React form, draft storage, MP3 ID3, image validation, compile client |
| **Compile API** | `server/artistPageCompileApi.ts` | Multipart upload, link-file, static preview (currently Vite middleware) |
| **Site generator** | `server/artistPageCompileService.ts` | Wipe + rebuild `artistpages/{slug}/` via ffmpeg + templates |
| **HLS + images** | `server/hlsExport.ts` | ffmpeg: AAC HLS segments, image resize, square artist crop |
| **Cache busting** | `server/staticSiteBuild.ts` | `BUILD_VERSION`, `?v=` on assets, `build.json`, meta tag |
| **HTML helpers** | `server/staticSiteUtils.ts`, `server/socialIcons.ts` | Escaping, slugs, social/stream link HTML |
| **Local paths** | `server/localPathResolve.ts` | Dev-only trusted path validation for saved file pointers |
| **Templates** | `artist-page-templates/` | Artist index, song pages, player JS/CSS, robots.txt |
| **Integration** | `integration/` | Snippets showing how the parent app wires routes + Vite plugin |

---

## Architecture (current web prototype)

```
┌─────────────────────────────────────────────────────────────┐
│  Browser — /artist-page-editor                              │
│  src/artistPageEditor/                                      │
│    localStorage (draft text + *LocalPath pointers)          │
│    IndexedDB (MP3/image blobs fallback)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ POST multipart / JSON manifest
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Dev server — server/artistPageCompileApi.ts                │
│    POST /api/dev/artist-page-link-file                      │
│    POST /api/dev/artist-page-compile                        │
│    GET  /artistpages/{slug}/…  (preview)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ compileArtistPage()
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Generator — server/artistPageCompileService.ts             │
│    ffmpeg → HLS segments + resized images                   │
│    templates → HTML with cache-bust pass                    │
│    output → artistpages/{slug}/  (static deploy folder)     │
└─────────────────────────────────────────────────────────────┘
```

---

## Electron porting guide (recommended shape)

### Main process (Node)

Move these modules to run **directly** in Electron main (or a worker), not behind HTTP:

- `compileArtistPage()` from `artistPageCompileService.ts`
- `resolveTrustedLocalPath()` — relax to app userData + chosen output dirs
- `createStaticSiteBuildInfo()`, `finalizeStaticHtml()`, etc. from `staticSiteBuild.ts`

Replace Vite middleware with **IPC handlers**:

| Current HTTP route | Electron IPC (suggested) |
|--------------------|-------------------------|
| `POST /api/dev/artist-page-link-file` | `artist-page:pick-and-link-file` or skip — Electron can store real paths from `dialog.showOpenDialog` |
| `POST /api/dev/artist-page-compile` | `artist-page:compile` — pass manifest JSON + optional file paths |
| `GET /artistpages/...` | `shell.openPath()` or load `file://` preview window |

**ffmpeg** must be on PATH or bundled (e.g. `ffmpeg-static` + `fluent-ffmpeg`). The compile service shells out to `ffmpeg` via `child_process.execFile`.

**hls.js** is copied from `node_modules/hls.js/dist/hls.light.min.js` at compile time — keep that dependency.

### Renderer process (React)

Reuse `src/artistPageEditor/` almost as-is:

- Replace `fetch("/api/dev/...")` in `compileArtistPage.ts` and `linkLocalFile.ts` with `window.electronAPI.compile(...)` / native file dialogs.
- **Local paths:** In Electron you can persist absolute paths from `dialog` without the link-file upload step — this is simpler than the browser workaround.
- **IndexedDB (Dexie):** Still useful for blob fallback; optional if you always use disk paths.

### Output folder

Default output: `artistpages/{slug}/` relative to project root. In Electron, use:

```text
app.getPath('userData')/artistpages/{slug}/
```

or let the user pick an export directory each compile.

### Dependencies (minimal)

See `package-dependencies.json`. You do **not** need the full Voluminous app (genre browser, LLM routes, etc.).

### Types shared between UI and compile

`server/artistPageCompileService.ts` imports `ARTIST_PHOTO_MAX_EDGE` from `../src/artistPageEditor/types`. In a clean Electron repo, move shared constants/types to e.g. `shared/artistPageTypes.ts`.

---

## Compile output (deploy artifact)

After compile, upload the folder as-is to any static host (bunny.net, S3, etc.):

```text
artistpages/your-slug/
  build.json
  index.html
  robots.txt
  css/site.css
  js/hls.light.min.js, site-player.js, site-cover-modal.js
  images/artist.jpg
  songs/
    song-slug.html
    song-slug/manifest.m3u8, seg_*.ts, cover.jpg, extra.jpg
```

See `docs/artist-page-editor.md` for full spec.

---

## Prerequisites (same as prototype)

- **ffmpeg** on PATH
- **Node 18+**
- npm packages listed in `package-dependencies.json`

---

## Tests

```bash
npx tsx --test server/staticSiteBuild.test.ts
```

(Cache-bust unit tests — run from this bundle root if you add a minimal `package.json`.)

---

## Parent repo integration (for context)

In the full Voluminous app:

- Route: `src/main.tsx` mounts `<ArtistPageEditor />` at `/artist-page-editor`
- Vite: `vite.config.ts` registers `devArtistPageCompilePlugin(projectRoot)`

Snippets are in `integration/`.

---

## License / attribution

Extracted from the Voluminous project for internal reference. Templates and player JS are part of the same codebase.
