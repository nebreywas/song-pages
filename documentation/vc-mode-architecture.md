# VC Mode Architecture

**Status:** Canonical runtime reference · **Index:** [README.md](./README.md)

This document describes how **VC Mode** works in the Song Pages desktop app: the Surface/View Designer, the live VC projection window, IPC between main and VC windows, content resolution, and **audio mirroring for Discord/Twitch screen capture**.

For surface geometry and designer UX rules, see [archive/specs/song-pages-vc-mode-surface-view-designer-spec.md](./archive/specs/song-pages-vc-mode-surface-view-designer-spec.md). For host content catalog design, see [archive/specs/Host-content-design.md](./archive/specs/Host-content-design.md). For persistence keys, see [settings-and-persistence.md](./settings-and-persistence.md).

**Canonical audio reference (main/mirror split, Discord incident, debug tooling):** [audio-pipeline.md](./audio-pipeline.md).

---

## Purpose

VC Mode is a dedicated **external presentation window** for listening parties — Discord voice channels, Twitch, OBS, second monitors, and similar capture scenarios. The main Listener window remains the control surface; the VC window is what gets shared.

Two problems drove the current architecture:

1. **Visuals** — A flexible surface (templates, dividers, floats) with song and host content assigned per region.
2. **Audio in window-only capture** — Discord/OBS window capture picks up audio from the **shared window's process**. Music that only plays in the main window is silent when sharing the VC window alone. The VC window therefore mirrors HLS playback locally.

---

## High-level diagram

```text
Main window (Listener + VC manager)
│
├── VcModeModal (Surface/View Designer)
│     ├── useAutoSaveVcConfig → SQLite vc.lastConfig
│     └── HostContentManager → SQLite vc.hostContent + disk media
│
├── useVcModeManager
│     ├── Builds VcStatePayload (~200ms) → IPC vc:sendState
│     ├── FFT frames (~16ms) when visualizer assigned → IPC vc:sendFrame
│     ├── Butterchurn canvas JPEG mirror (when Butterchurn experience active)
│     ├── Web Audio analyser (main window only — effects + visualizer tap)
│     └── Mutes main speakers when VC mirror confirms playback
│
└── electron/vcWindow.js → BrowserWindow (VC projection)

VC window (src/vc-window/)
│
├── useVcWindowState — receives vc:state, vc:frame, vc:hotkey
├── VcSurface + VcResolvedContentView — layout + content resolution
├── useVcPlaybackAudio — mirrored HLS <audio> for capture
└── useHostContentCatalog (read-only) — host media paths
```

---

## Key modules

| Area | Path |
|------|------|
| Shared types + IPC payload | `shared/vcModeTypes.ts` |
| Surface geometry + templates | `shared/vcSurface/*` |
| Content resolution (song + host) | `shared/vcMode/contentResolution.ts` |
| Assignment overrides / validation | `shared/vcMode/assignmentSettings.ts`, `assignmentValidation.ts` |
| Grid appearance | `shared/vcMode/gridDesign.ts` |
| Config migration | `shared/vcSurface/migrate.ts` |
| Designer UI | `src/vc-mode/VcModeModal.tsx`, `src/vc-mode/designer/*` |
| Auto-save | `src/vc-mode/useAutoSaveVcConfig.ts` |
| Main ↔ VC bridge | `src/vc-mode/useVcModeManager.ts` |
| Live VC window | `src/vc-window/VcWindowApp.tsx`, `VcSurface.tsx`, `useVcWindowState.ts` |
| Audio mirror | `src/vc-window/useVcPlaybackAudio.ts` |
| Electron window | `electron/vcWindow.js` |
| IPC handlers | `electron/ipc.js` (`vc:*` channels) |
| Preload API | `electron/preload.js` (`app.vc.*`) |

---

## Configuration model

A persisted **VcModeConfig** (`vc.lastConfig`) contains:

- **surface** — `templateId`, normalized divider positions, float geometry (`shared/vcSurface/`)
- **cells** — content assignments for up to 4 base areas (slot A/B, cycle time, host bindings, song slot overrides)
- **floatContent** — assignments keyed by float id
- **visualizerId** — experience used when a region is set to visualizer
- **useFallbacks** — whether host fallback content applies when a slot is empty
- **gridDesign** — background color, default typography, `gridLines` (template dividers), `floatLines` (float outlines)

Migration from the legacy PoC `gridStyle` model runs through `migrateVcConfig()` in `shared/vcSurface/migrate.ts`. **All load paths must pass through migrate** — dropping fields here causes silent data loss (e.g. grid design not restoring after restart).

---

## Designer vs live VC

| Mode | Where | Behavior |
|------|-------|----------|
| **Designer** | `VcModeModal` in main window | Edit template, dividers, floats, assignments, grid design. Preview uses selected or playing song. No live Butterchurn in designer canvas. Auto-saves (500ms debounce). |
| **Live VC** | Separate Electron window | Renders resolved content from `VcStatePayload`. Receives FFT/canvas frames for native and Butterchurn visualizers. Plays mirrored HLS audio. |

Starting VC Mode closes the standalone visualizer projection window — only one projection surface is active at a time.

Starting VC Mode also defaults the listening state to **repeat-playlist** (`repeatMode: 'all'`) so a
listening party loops instead of stopping at the end of the queue. This fires only on the VC start
(rising) edge of `vc.vcOpen` in `ListenerMode` (`vcStartedRepeatRef`); the host can turn repeat off
afterward and it won't be forced back on. There is no `SET_REPEAT` command, so it cycles `CYCLE_REPEAT`
to `'all'` (`off → all → one → off`).

---

## IPC channels

Main process forwards renderer messages to the VC window.

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `vc:open` / `vc:close` / `vc:setFullScreen` / `vc:status` | invoke | Window lifecycle |
| `vc:sendState` → `vc:state` | main → VC | Full `VcStatePayload` (~200ms while open) |
| `vc:sendFrame` → `vc:frame` | main → VC | FFT + optional Butterchurn canvas JPEG (~16ms) |
| `vc:sendPlaybackStatus` → `vc:playback-status` | VC → main | Mirror audio playing — main defers speaker mute |
| `vc:request-sync` | VC → main | VC window loaded; main pushes fresh state |
| `vc:opened` / `vc:closed` | main → renderer | VC window lifecycle events |
| `vc:hotkey` | both | Legacy overlay actions dispatched via `electron/commands/commandService.js` |

Preload exposes these under `window.app.vc`.

---

## Content resolution

Both designer preview and live VC use **`shared/vcMode/contentResolution.ts`** to turn assignments + catalog + song manifest into renderable content (cover URLs, host graphics, text with typography, visualizer slot, etc.).

Song content kinds map to presentation rule sets via `SONG_CONTENT_SETTINGS_RULE` in `shared/vcModeTypes.ts` (graphic, video, title-text, area-text). Host slots reference catalog item ids with optional per-assignment overrides.

**Lyrics display options** (per lyrics assignment, applied in content resolution):

- **Lyric tracking** — `simple-scroll` (default, compatibility) or `alare` (approximate line timeline). See [ALARE.md](./ALARE.md).
- `lyricsEdgeFade` — top/bottom feather while scrolling (Simple Scroll; default on)
- `lyricsRemoveBracketed` — strip `[Chorus]`-style annotations via `stripBracketedLyricsText` from `shared/lyricsText.ts` (Simple Scroll only; default off). ALARE strips brackets automatically.

---

## Meme Surface (host-pushed GIFs / memes)

Lets a host drop a **direct media URL** into the VC controller and project it
onto a designated region during a listening party.

**No provider integration of any kind.** There is no site-specific awareness and
no page/link scraping. The host pastes a URL that points straight at a media
file; if it exists and is small enough, it is displayed. Accepted media:

- **Images** (rendered in `<img>`): `.gif`, `.png`/`.apng`, `.webp`
- **Videos** (rendered in `<video>`): `.mp4`, `.webm`, `.m4v`

Before display, the **main process** HEAD-probes the URL to confirm it exists,
is an `image/*` or `video/*` type, and is under **8 MB** (`MEME_MAX_BYTES`). The
probe runs in main so it can reach hosts the renderer's CSP/CORS can't and give
the controller clean up-front feedback ("not found" / "too large").

### Pieces

| Concern | Location |
| --- | --- |
| Pure parsing / settings sanitize (+ tests) | `shared/memes/` |
| Types: `ResolvedMeme`, `MemeSettings`, `ActiveMeme`, `MEME_MAX_BYTES` | `shared/memes/types.ts` |
| Main-process resolver (validate + HEAD existence/size/type probe) | `electron/memes/resolveMeme.js` |
| URL policy purpose `meme-media` (public-only, user-initiated, SSRF guard) | `electron/net/urlPolicy.js` |
| IPC: `vc:resolveMeme` (invoke), `vc:showMeme` / `vc:clearMeme` (send) | `electron/ipc.js`, `electron/preload.js` |
| Content kind `meme-surface` + `config.memeSettings` + `VcStatePayload.activeMeme` | `shared/vcModeTypes.ts` |
| Transient state owner (auto-clear timer, broadcast) | `src/vc-mode/useVcModeManager.ts` |
| Projector render (`<img>` / `<video>`, click-to-clear, loop counting) | `src/vc-window/VcMemeSurfaceView.tsx` (dispatched from `VcCellContentView.tsx`) |
| Controller Meme Field (URL input, Send, Clear, status) | `src/controller-window/ControllerWindowApp.tsx` |
| Designer: assignable kind + settings panel | `RegionContentPopover.tsx`, `VcModeModal.tsx` |

### Flow

1. Host assigns **Meme Surface** to a float/area in the designer (persists in the
   region's slot). The region renders empty until a meme arrives.
2. Host pastes a direct media URL into the controller **Meme Field** →
   `vc:resolveMeme` (main process validates + probes) returns a `ResolvedMeme` →
   controller sends `vc:showMeme`.
3. `useVcModeManager` owns the transient `activeMeme` (assigns a monotonic
   `token`, snapshots `memeSettings`) and broadcasts it on `VcStatePayload`, so it
   survives projector reload / `vc:request-sync`.
4. The projector renders the meme onto the `meme-surface` region.

### Clear behavior (ownership split)

- **Per-region timer** — a `meme-surface` region can carry a `memeTimer`
  (`VcCellAssignment.memeTimer`), set in its content settings, that overrides the
  global default: `'hold'` = play until cleared, or a fixed number of seconds.
  The main renderer merges it via `applyMemeTimer` when a meme is shown.
- **Duration clear** and **play-indefinitely** are owned by the **main renderer**
  (survives projector reloads).
- **Roundtrip clear** is owned by the **projector** — only the `<video>` element
  knows when a loop completes. When a minimum loop count is set (video only), the
  projector drops native `loop`, replays manually, and clears once **both** the
  loop count **and** the minimum duration are satisfied ("whichever is greater").
- **GIF limitation:** GIFs expose no loop event, so `minRoundtrips` is ignored for
  GIFs — they clear on the duration value alone. Prefer an MP4/WebM URL when you
  want loop-count-based clearing.
- **Click-to-clear** (`clickClears`) is handled in the projector view.

### CSP

Memes load as `http(s):` images/videos, already permitted by the VC window's
`img-src` / `media-src`. No iframes are used, so no `frame-src` changes are
needed.

---

## Audio architecture

**See [audio-pipeline.md](./audio-pipeline.md)** for the full pipeline, Discord incident log, and engineering rules. Summary for VC:

### Main window (timing source + visualizer FFT)

- **Audible HLS** plays on the main `<audio>` element while VC is **closed** — **never** wired to Web Audio (native path; capturable when sharing the main window with FX off).
- **Hidden mirror `<audio>`** duplicates HLS for Web Audio (visualizers, bass boost / lo-fi). See `useAnalyserPlaybackMirror`, `useAnalyserBus`, `AnalyserBus.ts`.
- When VC is open, **main playback is muted** (`audio.volume = 0`). The **VC window `<audio>`** carries audible output (including Effects Lab when enabled) for screen/window capture.

### VC window (alternate capture source)

- `useVcPlaybackAudio` loads the same HLS URL from `state.audioMirror` (`playbackUrl`, `songId`, `volume`).
- Plain `<audio>` — **no** Web Audio graph on the VC element.
- Syncs play/pause and seeks when drift exceeds **0.4s** (`SEEK_DRIFT_SECONDS`).
- Reports `{ active: boolean }` via `vc:sendPlaybackStatus` (status IPC; main is **not** auto-muted on active mirror in current builds).
- VC BrowserWindow uses `autoplayPolicy: 'no-user-gesture-required'` (`electron/vcWindow.js`) so mirrored playback can start without a click in the VC window.

### Which window to share?

| Goal | Share | FX |
|------|-------|-----|
| Main player + visualizers in share | Main **Song Pages** window | Off for reliable capture |
| VC layout / host content | **Song Pages — VC Mode** window | N/A (VC mirror is clean HLS) |

Playback URL resolution: `activePlaybackUrl ?? playingSong?.playback_url` in `useVcModeManager` (audio mirror); timing/queue/play lock from `buildVcStateFromSnapshot(session snapshot)`.

---

## Visualizer in VC

When a region is assigned **visualizer**:

- Main window runs the Web Audio analyser (if a song is playing).
- Native canvas visualizers receive FFT via `vc:sendFrame`.
- **Butterchurn** renders on the main window; canvas is JPEG-encoded and sent as `canvasFrame` on the frame payload (`butterchurnVcMirrorActive` path in `useVcModeManager`).

This keeps Butterchurn's WebGL context on the main process renderer where the audio graph already exists.

### Visualizer is preserved across surface switches

Switching surfaces mid-show (VC controller picker) **does not change the running
visualizer**, even though each surface design stores its own `visualizerId`.

- On switch, `switchVcSurface` (`useVcModeManager`) captures the on-screen
  visualizer (`reportedVisualizerId`, so it's rotation-aware) and pins it via
  `surfaceVisualizerOverrideRef`.
- The pin is applied **only to the outgoing `VcStatePayload`** (`config.visualizerId`
  + `effectiveVisualizerId`). `activeConfig` keeps the new design's stored
  `visualizerId`, so per-design persistence (`vcSurfaceDesignStore`) is never
  corrupted.
- The pin releases automatically when the configured visualizer changes
  intentionally (e.g. the host picks a new one in the designer): a `useEffect`
  compares `activeConfig.visualizerId` against the switch-in baseline.
- The projector's `useVcVisualizerRotation` reseeds `rotatingId` from
  `config.visualizerId` on any session-key change; pinning that field is what
  keeps the reset landing on the same visualizer.

---

## Persistence pitfalls (read before editing)

1. **Migration must preserve all config fields** — `shared/vcSurface/migrate.ts` must pass through `gridDesign`, `floatContent`, etc. Missing a field causes settings to vanish on reload.

2. **Designer hydration effect deps** — `VcModeModal` loads settings in a `useEffect` keyed only on `[open]`. Do **not** add `flushSave`, `config`, or other edit-derived callbacks to that effect. Re-running hydration resets `config`, closes overlays (`setGridDesignOpen(false)`, `setPopover(null)`), and causes the flash/dismiss bugs seen when floats could not be dragged.

3. **Auto-save vs close** — `useAutoSaveVcConfig` debounces saves (500ms). A separate effect flushes on modal close via `flushSaveRef`. Rapid open/close should still persist the last edit.

4. **Overlay dismiss** — Designer modals use `DesignerOverlayLayer` (backdrop pointer-down + rAF guard against open-click-through + Escape). Backdrop `onMouseDown={onClose}` without the guard can dismiss on the same click that opened the overlay.

---

## Screen share and Discord — testing checklist

Use this when verifying window-only capture (not full desktop share).

### Setup

1. Build or run dev: `npm run dev`.
2. Subscribe to an artist, play a song with HLS in Listener Mode.
3. Open VC Mode from the listener toolbar (configure surface if needed).
4. Confirm **local audio** in the main window before sharing.
5. In Discord (or OBS): choose **window capture** → **Song Pages — VC Mode** (not the main Listener window, not entire screen).

### Expected behavior

| Check | Pass criteria |
|-------|---------------|
| VC window visuals | Layout, song content, host content, visualizer render in VC window |
| VC window audio | Music audible in VC window (DevTools → check `<audio>` not paused) |
| Main window audio | Muted while VC open (`volume = 0`); timing still from main element |
| Close VC | VC audio stops; main unchanged |
| Skip track | Mirror loads new song; brief gap acceptable; sync within ~0.4s |
| Pause / resume | Both windows follow transport |
| Seek | Mirror seeks when drift exceeds threshold |

### Common failures

| Symptom | Likely cause |
|---------|----------------|
| Video in Discord, no music | Sharing main window instead of VC window; or desktop share not including VC process audio |
| Video in Discord, no music (main player) | FX on (main ducked) or `AudioServiceOutOfProcess` not disabled; see [audio-pipeline.md](./audio-pipeline.md) |
| Music on main only (VC share) | VC mirror not starting — check `audioMirror.playbackUrl`, HLS errors in VC DevTools |
| Double audio locally | Expected when VC open — main + VC both play; use headphones or share one window |
| Effects differ VC vs main | Expected — bass boost / lo-fi run on main-window mirror graph only |

### macOS notes

- **Electron audio process (critical)** — Chromium plays media in a separate macOS audio utility process by default. Discord window capture only hooks the window owner's process, so share gets silence. Song Pages disables `AudioServiceOutOfProcess` in `electron/main.js` so HTML audio stays in-process and capturable.
- **Dev mode permission** — When running `npm run dev`, also allow **Electron.app** (under `node_modules/electron/dist/Electron.app`) in System Settings → Privacy & Security → **Screen & System Audio Recording**, not only Discord. Discord's picker may list the window as **Electron** or **Song Pages**.
- **Discord needs permission** — System Settings → Privacy & Security → **Screen & System Audio Recording** → enable **Discord**. Fully quit Discord (Cmd+Q) and reopen after changing this.
- **Enable stream audio** — When sharing, check **Share computer audio** (may be hidden if Discord lacks permission). macOS **13+** is required for application audio sharing in Discord.
- **Discord experimental capture** — User Settings → Voice & Video → Screen Share → enable **Use an experimental method to capture audio from applications**, then restart Discord.
- **Share the VC window** — Pick **Song Pages — VC Mode**, not the main Listener window. Entire-screen share routes audio differently and is less reliable on Mac.
- **Verify capture target** — For **main-window share**, confirm main `<audio>` is playing with FX off. For **VC share**, confirm VC `<audio>` is advancing in DevTools.
- **OBS control test** — Application Audio Capture in OBS. If OBS gets music but Discord does not, suspect Discord routing/permissions.
- **BlackHole workaround** — Route system or app audio through [BlackHole](https://existential.audio/blackhole/) and select it as Discord's microphone input if window capture stays silent.

### Diagnose VC mirror (2 minutes)

1. Play a song in Listener Mode, open VC Mode.
2. Open DevTools on the **VC window** (View → Toggle Developer Tools in dev builds).
3. Confirm `<audio class="vc-playback-audio">` is **not paused** and `currentTime` is advancing.
4. If sharing VC in Discord: window capture **Song Pages — VC Mode** with **Share computer audio** enabled.
5. If sharing main player: window capture **Song Pages** (main) with FX **off** — see [audio-pipeline.md](./audio-pipeline.md#discord-main-window-fx-off).

### Code-side issues (fixed / watch for)

| Issue | Symptom | Status |
|-------|---------|--------|
| Web Audio on main audible element | Discord silent when sharing main window | **Fixed** — graph on mirror only |
| Mirror HTML-muted with graph | Visualizers flat (peak bin 0) | **Fixed** — `ensureMirrorElementFeedsGraph` |
| Mirror only loads when playback active | VC silent if nothing playing | By design — start playback before sharing |
| Discord macOS window audio | Video, no remote music | Often platform permissions + OOP audio flag — see audio-pipeline doc |

### Known limitations

- VC window opens on **primary display** only (visualizer window supports display picker; VC does not yet).
- Mirrored stream is **clean HLS**, not bass-boost/lo-fi processed audio.
- `webSecurity: false` on VC window (same as main) for CDN HLS — see [security-model-and-completed-actions.md](./security-model-and-completed-actions.md).

---

## Related reading

- [archive/specs/song-pages-vc-mode-surface-view-designer-spec.md](./archive/specs/song-pages-vc-mode-surface-view-designer-spec.md) — product spec and designer rules
- [audio-pipeline.md](./audio-pipeline.md) — canonical playback/mirror/Discord reference
- [visualizer-architecture.md](./visualizer-architecture.md) — Web Audio graph and projection visualizer
- [settings-and-persistence.md](./settings-and-persistence.md) — `vc.lastConfig`, `vc.hostContent` keys
