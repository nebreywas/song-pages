# VC Mode Architecture

This document describes how **VC Mode** works in the Song Pages desktop app: the Surface/View Designer, the live VC projection window, IPC between main and VC windows, content resolution, and **audio mirroring for Discord/Twitch screen capture**.

For surface geometry and designer UX rules, see [song-pages-vc-mode-surface-view-designer-spec.md](./song-pages-vc-mode-surface-view-designer-spec.md). For host content catalog design, see [Host-content-design.md](./Host-content-design.md). For persistence keys, see [settings-and-persistence.md](./settings-and-persistence.md).

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
| `vc:hotkey` | both | Global hotkeys registered in main (`electron/vcHotkeys.js`) |

Preload exposes these under `window.app.vc`.

---

## Content resolution

Both designer preview and live VC use **`shared/vcMode/contentResolution.ts`** to turn assignments + catalog + song manifest into renderable content (cover URLs, host graphics, text with typography, visualizer slot, etc.).

Song content kinds map to presentation rule sets via `SONG_CONTENT_SETTINGS_RULE` in `shared/vcModeTypes.ts` (graphic, video, title-text, area-text). Host slots reference catalog item ids with optional per-assignment overrides.

---

## Audio architecture

### Main window (timing source)

- HLS plays on the Listener `<audio>` element.
- **Web Audio graph** (`src/visualizers/audioGraph.ts`): source → bass boost → lo-fi → analyser → **speakerGain** → destination.
- Bass boost and lo-fi apply **only on the main graph**. The VC mirror receives **clean HLS** (no processed branch today).
- When VC is open and the mirror reports active playback, `setMainSpeakerMuted()` sets `speakerGain` to 0 so local speakers are not doubled. The analyser and Butterchurn tap **stay live** on the main window.

### VC window (capture source)

- `useVcPlaybackAudio` loads the same HLS URL from `state.audioMirror` (`playbackUrl`, `songId`, `volume`).
- Syncs play/pause and seeks when drift exceeds **0.4s** (`SEEK_DRIFT_SECONDS`).
- Reports `{ active: boolean }` via `vc:sendPlaybackStatus` so main knows when to mute.
- VC BrowserWindow uses `autoplayPolicy: 'no-user-gesture-required'` (`electron/vcWindow.js`) so mirrored playback can start without a click in the VC window.

### Fallback behavior

If the mirror fails to start (autoplay block, HLS error, no URL), main **keeps local speakers audible** — mute only happens after the mirror confirms active playback.

Playback URL resolution: `activePlaybackUrl ?? playingSong?.playback_url` in `useVcModeManager.buildStatePayload()`.

---

## Visualizer in VC

When a region is assigned **visualizer**:

- Main window runs the Web Audio analyser (if a song is playing).
- Native canvas visualizers receive FFT via `vc:sendFrame`.
- **Butterchurn** renders on the main window; canvas is JPEG-encoded and sent as `canvasFrame` on the frame payload (`butterchurnVcMirrorActive` path in `useVcModeManager`).

This keeps Butterchurn's WebGL context on the main process renderer where the audio graph already exists.

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
| Main window audio | Muted locally while VC mirror is active (no double audio on same machine) |
| Close VC | Main window audio returns immediately |
| Skip track | Mirror loads new song; brief gap acceptable; sync within ~0.4s |
| Pause / resume | Both windows follow transport |
| Seek | Mirror seeks when drift exceeds threshold |

### Common failures

| Symptom | Likely cause |
|---------|----------------|
| Video in Discord, no music | Sharing main window instead of VC window; or desktop share not including VC process audio |
| Music on main only | Mirror not starting — check `audioMirror.playbackUrl`, HLS errors in VC DevTools, autoplay policy |
| Double audio locally | `vc:playback-status` not reporting active; main not muting `speakerGain` |
| Music stops when opening VC | Main muted before mirror ready — should not happen with current handoff logic; file a bug |
| Effects differ VC vs main | Expected today — bass boost / lo-fi are main-graph only |

### macOS notes

- Screen Recording permission may be required for capture apps.
- Discord window capture audio behavior varies by Discord client version and OS audio routing — if window capture has no audio option, test OBS with "Application Audio Capture" on the VC window as a control.

### Known limitations

- VC window opens on **primary display** only (visualizer window supports display picker; VC does not yet).
- Mirrored stream is **clean HLS**, not bass-boost/lo-fi processed audio.
- `webSecurity: false` on VC window (same as main) for CDN HLS — see [security-model-and-completed-actions.md](./security-model-and-completed-actions.md).

---

## Related reading

- [song-pages-vc-mode-surface-view-designer-spec.md](./song-pages-vc-mode-surface-view-designer-spec.md) — product spec and designer rules
- [visualizer-architecture.md](./visualizer-architecture.md) — Web Audio graph and projection visualizer
- [settings-and-persistence.md](./settings-and-persistence.md) — `vc.lastConfig`, `vc.hostContent` keys
