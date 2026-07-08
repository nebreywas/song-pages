# FFmpeg compile prerequisites

Song Pages **does not bundle FFmpeg or FFprobe**. Artist Mode compile invokes them from the system **PATH** via `child_process.execFile` (`compiler/hlsExport.ts`).

Listener Mode, VC Mode, and visualizers do **not** require FFmpeg.

## When FFmpeg is required

| Feature | Needs FFmpeg? |
|---------|----------------|
| Artist Mode — compile catalog to static site + HLS | **Yes** |
| Listener Mode — subscribe, play, cache | No |
| VC Mode / visualizers | No |

Compile uses FFmpeg to:

- Segment audio into HLS (`.m3u8` + `.ts`) per song
- Resize/crop cover and extra images for the static site

Compile uses **FFprobe** to read duration and sample rate when building segments.

## Verify installation

From a terminal:

```bash
ffmpeg -version
ffprobe -version
```

In the app: **Artist Mode** exposes `Check FFmpeg` (IPC `artist:checkFfmpeg`) — same as running `ffmpeg -version` from the main process.

Both commands must succeed. If either is missing, compile fails with an error from the compile service.

## Install (common)

**macOS (Homebrew)**

```bash
brew install ffmpeg
```

**Windows**

Install a build that adds `ffmpeg.exe` and `ffprobe.exe` to PATH (e.g. [gyan.dev ffmpeg builds](https://www.gyan.dev/ffmpeg/builds/) or `winget install Gyan.FFmpeg`), then restart the terminal and Song Pages.

**Linux**

Use your distro package (e.g. `apt install ffmpeg` on Debian/Ubuntu).

## Packaged desktop builds

`npm run package:mac` / `package:win` produce a self-contained **app** bundle, but compile still shells out to **host PATH** at runtime. End users who compile catalogs must install FFmpeg separately — it is not included in the Electron ASAR.

Release checklist:

- [ ] Fresh machine (or VM) without dev tools
- [ ] Install Song Pages from packaged build
- [ ] Install FFmpeg on PATH
- [ ] Artist Mode → compile a small test catalog
- [ ] Confirm output under `{userData}/artistpages/{slug}/` and HLS plays after upload/subscribe

## Output location

Default compile output:

```text
~/Library/Application Support/song-pages/artistpages/{artist-slug}/   (macOS)
```

Windows uses `%APPDATA%\song-pages\artistpages\{artist-slug}\`.

Upload that folder to static hosting manually (PoC workflow).

## Future note

Bundling FFmpeg inside the app would improve release UX but increases package size and platform-specific packaging work. Current design intentionally uses PATH + direct `execFile` (no `fluent-ffmpeg`).

## Trusted local compile paths

Compile input paths are resolved in the **main process**, not from renderer-supplied `fileMap`. Trusted **read** roots:

- Project tree
- User home (`os.homedir()`)
- Application `userData` and managed subfolders (`compile-uploads`, `artistpages`, `host-content`)

**External volumes, NAS mounts, and studio shares are not automatically trusted.** Legitimate workflows on mounted media will need a future explicit authorization mechanism (native picker, remembered project root, or persisted approved media root). Renderer-supplied `fileMap` and `outputRoot` are hard-rejected at the compile IPC boundary.
