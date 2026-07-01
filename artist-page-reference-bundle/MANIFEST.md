# File manifest

Every file in this bundle and its purpose.

## docs/

| File | Purpose |
|------|---------|
| `artist-page-editor.md` | Full product spec: routes, persistence, output tree, HLS settings, cache busting |

## src/artistPageEditor/

| File | Purpose |
|------|---------|
| `ArtistPageEditor.tsx` | Main editor UI (artist + 12 song slots, compile button) |
| `artistPageEditor.css` | Editor styling |
| `types.ts` | Draft types, limits, storage keys, slugify |
| `artistPageDraftStore.ts` | localStorage load/save, compile manifest builder |
| `artistPageAssetDb.ts` | Dexie IndexedDB for MP3/image blobs |
| `compileArtistPage.ts` | Client: build FormData, POST to compile API |
| `linkLocalFile.ts` | Client: POST file to link-file API (browser path workaround) |
| `readMp3Metadata.ts` | ID3 tags + embedded cover via jsmediatags |
| `validateImage.ts` | PNG/JPG dimension check before accept |

## server/

| File | Purpose |
|------|---------|
| `artistPageCompileService.ts` | **Core generator** — validate manifest, ffmpeg HLS, template merge, cache bust |
| `artistPageCompileApi.ts` | Vite dev middleware: compile, link-file, static serve `/artistpages/` |
| `hlsExport.ts` | ffmpeg HLS segmentation + image resize/square crop |
| `staticSiteBuild.ts` | BUILD_VERSION, HTML asset rewriting, build.json, Cache-Control helper |
| `staticSiteBuild.test.ts` | Unit tests for cache bust logic |
| `staticSiteUtils.ts` | HTML escape, slugify, social/stream link HTML builders |
| `socialIcons.ts` | Inline SVG icons for social buttons |
| `localPathResolve.ts` | Validate absolute paths under project or $HOME |

## artist-page-templates/

| File | Purpose |
|------|---------|
| `artist-index.html` | Artist home page template |
| `song-page.html` | Per-song detail page template |
| `robots.txt` | Disallow .m3u8 / .ts crawling |
| `shared/css/site.css` | Compiled site styles |
| `shared/js/site-player.js` | Footer HLS player, queue, sessionStorage continuity |
| `shared/js/site-cover-modal.js` | Cover art lightbox on song pages |
| `shared/player-footer.html` | Footer player HTML fragment |

## integration/

| File | Purpose |
|------|---------|
| `main-route-snippet.tsx` | Parent app route wiring |
| `vite-plugin-snippet.ts` | Parent Vite dev plugin registration |
| `electron-ipc-sketch.ts` | Suggested Electron main/preload IPC shape |

## Root

| File | Purpose |
|------|---------|
| `README.md` | Bundle overview + Electron porting guide |
| `package-dependencies.json` | Minimal npm deps |
| `MANIFEST.md` | This file |

## Not included (gitignored runtime dirs in parent repo)

- `artistpages/` — compiled output (generated on compile)
- `artist-page-compile/.uploads/` — temp multipart uploads
- `artist-page-compile/linked/` — linked file copies from browser picker
