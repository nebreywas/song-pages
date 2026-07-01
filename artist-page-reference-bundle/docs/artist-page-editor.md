# Artist page editor (dev prototype)

Local tool to build a static artist website with up to **12 songs**, HLS playback, lyrics, images, and social links.

**Not deployed to Vercel** — requires `npm run dev` and **ffmpeg** on PATH.

## Routes

| Route | Purpose |
|-------|---------|
| `/artist-page-editor` | Editor UI (unlinked from main app tabs) |
| `POST /api/dev/artist-page-link-file` | Save picker file once; return persistent path |
| `POST /api/dev/artist-page-compile` | Wipe + rebuild `artistpages/{slug}/` |
| `/artistpages/{slug}/index.html` | Dev preview of compiled site |

## User flow

1. Open `/artist-page-editor`
2. Set artist slug (e.g. `sawyerhousemusic`), name, bio, photo, social handles
3. For each song slot: upload MP3 (ID3 metadata fills title/album/year; embedded cover auto-imported), lyrics, caption, about text, images, stream URLs, **per-song HLS settings** (full vs preview, high vs degraded)
4. **Compile static site** — confirms, then wipes `artistpages/{slug}/` and rebuilds
5. Preview via dev link or upload `artistpages/{slug}/` folder to static host (bunny.net, etc.)

## Persistence

| Data | Storage |
|------|---------|
| Text fields, slugs, settings | `localStorage` (`voluminous-artist-page-draft`) |
| **File path pointers** (`*LocalPath`) | Same draft in `localStorage` — survives refresh |
| MP3 + images (fallback) | IndexedDB (`voluminous-artist-page-assets`) |

Browsers cannot expose real filesystem paths from a file picker. On first select, the dev server **links** the file to `artist-page-compile/linked/` and saves that absolute path in the draft. **Compile reads from disk** using those paths, so you do not re-pick files every session.

You can also **paste an absolute path** (project folder or `$HOME`) for MP3s/images you already have on disk — no re-upload needed.

Gitignored: `artistpages/`, `artist-page-compile/.uploads/`, `artist-page-compile/linked/`

## Output structure

```
artistpages/sawyerhousemusic/
  build.json          # buildVersion + generatedAt (diagnostics)
  index.html          # Artist bio + song list + footer player
  robots.txt          # Discourage .m3u8 / .ts crawling
  css/site.css
  js/hls.light.min.js
  js/site-player.js
  images/artist.jpg
  songs/
    night-almighty.html
    night-almighty/
      manifest.m3u8
      seg_000.ts
      cover.jpg
      extra.jpg
```

## Per-song HLS settings

Each song has its own:

- **Quality:** 192 kbps AAC stereo vs 96 kbps mono
- **Scope:** full track vs 30 / 45 / 60 s preview

## Bot / scrape friction

- `robots.txt` disallows `*.m3u8` and `*.ts`
- HTML meta: `noai, noimageai`
- Dev static serve adds `X-Robots-Tag` on segment responses
- HLS chunked audio (no monolithic MP3 on server)

## Cache busting

Every compile generates a unique `buildVersion` (UTC timestamp + optional git hash). The pipeline automatically:

- Adds `<meta name="build-version" content="…">` to every HTML page
- Appends `?v=BUILD_VERSION` to all local asset URLs (CSS, JS, images, song pages, HLS manifests)
- Writes `build.json` at the site root for deployment diagnostics

Templates stay unchanged — versioning is applied in `server/staticSiteBuild.ts` during generation. HTML is suitable for `Cache-Control: no-cache`; versioned assets can be cached immutably.

## Code map

| Path | Role |
|------|------|
| `src/artistPageEditor/` | Editor UI, draft store, ID3 reader |
| `server/staticSiteBuild.ts` | Build version + cache-bust rewriting |
| `server/artistPageCompileService.ts` | Site generator + ffmpeg |
| `server/artistPageCompileApi.ts` | Dev middleware |
| `server/hlsExport.ts` | Shared HLS ffmpeg pipeline |
| `artist-page-templates/` | HTML/CSS/JS templates |

Gitignored: `artistpages/`, `artist-page-compile/.uploads/`, `artist-page-compile/linked/`

## Related

Single-song HLS research prototype: [song-page-export.md](song-page-export.md)
