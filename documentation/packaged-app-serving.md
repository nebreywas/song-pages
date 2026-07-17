# Packaged App Serving (localhost origin)

**Status:** Canonical · **Added:** 2026-07-16
**Audience:** Anyone touching window loading, the navigation policy, or YouTube/SoundCloud embeds.

---

## TL;DR

In **packaged** builds the renderer is served over `http://localhost:<ephemeral-port>` by a
loopback HTTP server in the main process, **not** `file://`. This gives every window a real web
origin, which is what the YouTube IFrame API requires. The socket binds to `127.0.0.1`, but the
origin is presented as `localhost` on purpose (see the gotcha below). Development is unchanged
(Vite on `http://localhost:5173`).

Code: [`electron/appServer.js`](../electron/appServer.js).

---

## Why this exists (the bug it fixes)

- **Symptom:** Packaged app showed **"Error 153 — Video player configuration error"** on YouTube
  videos in every window (main listener, VC/projector, visualizer). Dev worked fine. SoundCloud
  worked in both.
- **Root cause:** The YouTube IFrame API refuses to complete its JS-API handshake against a
  `file://` / `null` origin. In dev the page is `http://localhost:5173` (valid origin → works); in
  packaged builds windows used `loadFile(...)`, giving a `file://` origin (rejected → Error 153).
- **Why not just pass an `origin` option to the player?** YouTube derives the embedding origin from
  the page itself; a `file://` page cannot satisfy it. A custom Electron scheme (`app://`, etc.)
  also does not count as an `http(s)` origin. The only reliable fix is a real `http` origin.

## The fix

### Gotcha: use `localhost`, not `127.0.0.1`

Serving over `http://127.0.0.1:<port>` cleared Error 153 but then produced YouTube's own
**"Video unavailable"** embed error for many videos that play fine in dev. YouTube's embed checks
prioritize **hostnames over IP literals** — an IP origin (`127.0.0.1`, `192.168.x.x`, …) is refused
for a large class of videos, while `localhost` is accepted. So the server binds the socket to
`127.0.0.1` (loopback, not network-exposed) but advertises its origin as `http://localhost:<port>`,
exactly mirroring dev. Chromium resolves `localhost` to the loopback address, so requests still reach
the bound socket.

> If you ever see "Video unavailable" (as opposed to Error 153) on videos that work in dev, the first
> suspect is an IP-literal origin sneaking back in. Keep `ORIGIN_HOST = 'localhost'`.

### Server details

A small loopback static server serves the built `dist/` directory:

- Binds the socket to `127.0.0.1` only, on an OS-assigned **ephemeral port** (`listen(0)`); origin
  is advertised as `localhost`.
- Serves files from `dist/` with correct MIME types; rejects path traversal outside `dist/`.
- Reads through Electron's asar fs shim, so it works whether or not `dist/` is inside `app.asar`.
- Started in `app.whenReady()` **before** any window loads.
- If it fails to start, `appDocUrl(...)` falls back to a `file://` URL so the app still opens
  (YouTube may error in that degraded case, but nothing else breaks).

All four trusted windows load through the shared helper `appDocUrl(pathname, isPackaged)`:

| Window      | Path served                                |
|-------------|--------------------------------------------|
| main        | `/index.html`                              |
| VC/projector| `/vc-window/vc.html`                        |
| visualizer  | `/visualizer-window/visualizer.html`        |
| controller  | `/controller-window/controller.html`        |

- **dev:** `appDocUrl` returns the Vite dev-server URL.
- **packaged:** it returns `http://127.0.0.1:<port><path>`.

Every window now calls `loadURL(...)` uniformly (previously packaged used `loadFile`).

## Why local `file://` media still works

Artwork and audio are still handed to the renderer as `file://` URLs (`artist2:resolveLocalFileUrl`,
`hostContent`, `vcWindow`, all via `pathToFileURL`). They load from the new `http` origin because:

1. Windows run with `webSecurity: false`, so `file://` sub-resources are permitted.
2. The app CSP already allows them: `img-src ... file:` and `media-src ... file:`.

This is the **same combination dev has always used** (dev page is `http`, media is `file://`), so no
separate media scheme (e.g. `songfile://`) was needed. `songpages-cache:` continues to serve cached
remote assets as before.

## Files touched

| File | Change |
|------|--------|
| `electron/appServer.js` | **New.** Loopback static server + `appDocUrl` / `startAppServer` / `appServerOrigin`. |
| `electron/main.js` | Starts the server in `whenReady`; main window `loadURL`s the http index (file:// fallback baked into the target). |
| `electron/vcWindow.js`, `electron/visualizerWindow.js`, `electron/controllerWindow.js` | Load targets go through `appDocUrl`; uniform `loadURL`. |
| `electron/trustedWindowNavigation.js` | `resolveAllowedDocumentUrl` accepts any explicit URL (incl. the packaged http origin), not just dev + file paths. |

## Navigation policy note

`trustedWindowNavigation.documentKey` keys on `origin + pathname`. The packaged doc is
`http://localhost:<port>/index.html`; hash/query navigations keep the same pathname, so they stay
allowed. The app does not do path-based routing (it worked under `file://.../index.html` before), so
the fixed pathname is stable.

## Debugging a packaged build

Packaged builds ship without DevTools open, so two facilities make them diagnosable:

1. **Diagnostics menu** (available in every build, `electron/menu.js`):
   - **Toggle Developer Tools** — `Alt+Cmd+I` / `Ctrl+Shift+I` in packaged builds.
   - **Open Logs Folder** — reveals `userData/logs/`.
   - **Export Logs…** — bundles the last several `.log` files and reveals the export.
   - **Copy Debug Info** — copies app version, `isPackaged`, the **app server origin**
     (confirms the `http://localhost:<port>` YouTube sees), platform, and Electron/Chrome versions.
2. **Renderer console → log file**: `installTrustedNavigationPolicy` attaches a `console-message`
   listener to every trusted window and writes renderer **warnings/errors** to the main log file as
   `[renderer] …`. This captures things like `[youtube] player error { code, videoId, origin }`
   without needing DevTools open.

Log files live at `userData/logs/app-YYYY-MM-DD.log` (on macOS:
`~/Library/Application Support/song-pages/logs/`).

## Testing checklist (requires a packaged build)

```bash
npm run package:mac   # or package:win / package:linux
```

Launch the packaged app and confirm:

1. YouTube plays in the main window, VC/projector, and visualizer — **no Error 153**.
2. Local artwork and audio still load.
3. SoundCloud still works.

Dev (`npm run dev` / launch script) should behave exactly as before.
