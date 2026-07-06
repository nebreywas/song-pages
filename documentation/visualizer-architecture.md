# Visualizer Architecture

This document describes how **visualizers** work in Song Pages: experience registry, embedded vs projection rendering, Butterchurn mirroring, and settings persistence.

For the **full playback / mirror / Discord capture pipeline**, see [audio-pipeline.md](./audio-pipeline.md) (canonical).

For VC Mode's use of visualizers in the projection window, see [vc-mode-architecture.md](./vc-mode-architecture.md).

---

## Purpose

Visualizers render audio-reactive graphics during playback. The app supports:

- **Native canvas experiences** (Aurora, Bars, Cover Pulse) — run in-process
- **Butterchurn** (Milkdrop-style presets) — WebGL via UMD bundles
- **Embedded** — overlay in the main Listener window
- **External projection** — dedicated Electron visualizer window for OBS/second monitor

Only **one active visualizer session** runs at a time: embedded **or** external projection (not both). VC Mode uses its own projection path and closes the standalone visualizer window when started.

---

## High-level diagram

```text
Main <audio> (audible HLS — native path, Discord capture when FX off)
Mirror <audio> (hidden HLS duplicate — Web Audio graph ONLY)
       │
       ▼
audioGraph.ts (one graph per mirror element)
       │
       ├── tap: source → bass → lo-fi → analyser → speakerGain(0) → destination
       ├── playback (FX): same chain, speakerGain(1), main ducked
       └── Butterchurn tap (parallel): sensitivity → bass emphasis → butterchurnTap
                    │
                    ▼
         useAudioAnalyser → useVisualizerManager
                    │
       ┌────────────┴────────────┐
       ▼                         ▼
EmbeddedVisualizerHost    useVisualizerIpcSender
(in Listener UI)          → visualizer window (FFT Uint8Array ~60fps)
```

---

## Key modules

| Area | Path |
|------|------|
| Web Audio graph | `src/visualizers/audioGraph.ts` |
| Analyser hook | `src/visualizers/useAudioAnalyser.ts` |
| Mirror HLS | `src/listener/useAnalyserPlaybackMirror.ts` |
| Audio debug | `src/visualizers/debug/*` |
| Session manager | `src/visualizers/useVisualizerManager.ts` |
| Experience registry | `src/visualizers/registry.ts`, `native/registry.ts`, `butterchurn/*` |
| Core types / context | `src/visualizers/core/*` |
| Settings UI | `src/visualizers/settings/ui/*` |
| Settings persistence | `src/visualizers/settings/persistence/keys.ts`, `store.ts` |
| IPC stream | `src/visualizers/useVisualizerStream.ts` |
| Projection window | `src/visualizer-window/VisualizerWindowApp.tsx` |
| Electron window | `electron/visualizerWindow.js` |
| IPC message types | `shared/visualizerMessages.ts` |
| Main integration | `src/listener/ListenerMode.tsx` |

---

## Web Audio graph

**Full detail:** [audio-pipeline.md](./audio-pipeline.md#web-audio-graph-audiographts).

`audioGraph.ts` maintains a **WeakMap** from the **mirror** `<audio>` to graph nodes. The main audible player never gets Web Audio.

### Tap mode (visualizers — default)

`createMediaElementSource(mirror)` → analyser → **`speakerGain = 0`** → destination. The graph must reach destination (even at zero gain) or the analyser does not pull samples. Mirror element must **`muted=false`, `volume=1`** after attach — Chromium silences `MediaElementSource` when the element is HTML-muted; use speakerGain for silence.

### Playback mode (bass boost / lo-fi)

Same graph; `speakerGain = 1`. Main `<audio>` volume ducked to 0; FX heard via mirror Web Audio path. **Discord main-window capture with FX on is not supported.**

**Butterchurn path (parallel, not wired to speakers):**  
`lo-fi drive → sensitivity gain → bass emphasis → butterchurnTap`

Butterchurn connects via `connectAudio()` to `butterchurnTap`, not the main analyser output.

---

## Experience registry

Experiences are identified by **`experienceId`** in settings, registry, and IPC (`VisualizerStreamConfig.experienceId`).

Registry resolves which experience runs for a **session target**:

- `main-embedded` — in-app overlay
- `external-projection` — visualizer window (some experiences may resolve to a projection-safe variant)

Constants: `DEFAULT_VISUALIZER_ID` in `shared/visualizerMessages.ts`.

Butterchurn experiences use ids prefixed/registered in `src/visualizers/butterchurn/presets/approved/`. Approved preset catalog is generated: `npm run generate:butterchurn-catalog`.

---

## Session manager (`useVisualizerManager`)

Responsibilities:

1. Load/save active experience from SQLite (`visualizer.activeExperienceId`, with legacy fallbacks).
2. Toggle embedded overlay vs open external visualizer window.
3. Enable Web Audio analyser only when a session is active and a song is playing.
4. Send FFT frames (and Butterchurn canvas JPEG when mirroring) to the projection window via IPC.
5. Enforce single session: `resolveActiveSession()` returns `main-embedded`, `external-projection`, or `none`.

**Butterchurn projection:** When external projection is active and the experience is Butterchurn, WebGL renders on the main window; canvas snapshots are sent as JPEG in frame payloads (`canvasMirrorFrame`), same pattern as VC Mode.

---

## IPC (visualizer window)

| Channel | Purpose |
|---------|---------|
| `visualizer:open` / `close` / `setFullScreen` / `status` | Window lifecycle |
| `visualizer:listDisplays` | Display picker (VC window does not have this yet) |
| `visualizer:sendConfig` → `visualizer:config` | Experience id, song info, settings |
| `visualizer:sendFrame` → `visualizer:frame` | FFT `Uint8Array`, timing, optional canvas JPEG |

Projection window entry: `src/visualizer-window/visualizer.html` (Vite multi-page build).

---

## Settings persistence

| Key | Purpose |
|-----|---------|
| `visualizer.activeExperienceId` | Last selected experience |
| `visualizer.activePluginId` | Legacy — read fallback only |
| `visualizer.preference.mainPlayer` | Main player preference mirror |
| `visualizer.settings.{experienceId}` | Per-experience settings blob |

Load/save helpers: `src/visualizers/settings/persistence/store.ts`, `useExperienceSettings.ts`.

Credits for Butterchurn: `third-party/credits.json`, shown in `VisualizerSettingsDialog.tsx`.

---

## Build notes

- Butterchurn UMD packages require Vite `needsInterop` workaround — see `vite.config.mjs`.
- Visualizer window uses `webSecurity: false` for CDN HLS if needed; same tradeoff as main window (see security doc).

---

## Related reading

- [audio-pipeline.md](./audio-pipeline.md) — main/mirror split, Discord incident, debug panel, engineering rules
- [vc-mode-architecture.md](./vc-mode-architecture.md) — VC projection and Butterchurn mirror in VC window
- [settings-and-persistence.md](./settings-and-persistence.md) — full settings key registry
