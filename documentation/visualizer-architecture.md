# Visualizer Architecture

This document describes how **visualizers** work in Song Pages: the Web Audio graph, experience registry, embedded vs projection rendering, Butterchurn mirroring, and settings persistence.

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
Listener <audio> (HLS)
       │
       ▼
audioGraph.ts (one graph per <audio> element)
       │
       ├── playback chain: source → bass → lo-fi → analyser → speakerGain → destination
       └── Butterchurn tap (parallel): sensitivity → bass emphasis → butterchurnTap
                    │
                    ▼
         useAudioAnalyser → useVisualizerManager
                    │
       ┌────────────┴────────────┐
       ▼                         ▼
EmbeddedVisualizerHost    useVisualizerIpcSender
(in Listener UI)          → visualizer window (FFT + canvas JPEG)
```

---

## Key modules

| Area | Path |
|------|------|
| Web Audio graph | `src/visualizers/audioGraph.ts` |
| Analyser hook | `src/visualizers/useAudioAnalyser.ts` |
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

`audioGraph.ts` maintains a **WeakMap** from `<audio>` to graph nodes because `createMediaElementSource` may only be called once per element (React StrictMode remount safety).

**Playback path:**  
`MediaElementSource → bass shelf → lo-fi lowpass → lo-fi drive → AnalyserNode → speakerGain → destination`

**Butterchurn path (parallel, not wired to speakers):**  
`lo-fi drive → sensitivity gain → bass emphasis → butterchurnTap`

- **speakerGain** — mutes local speakers without killing the analyser (used when VC audio mirror is active on main).
- **Playback effects** (bass boost, lo-fi) affect the playback chain only, not a separate VC mirror stream.

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
| `visualizer:sendFrame` → `visualizer:frame` | FFT arrays, timing, optional canvas JPEG |

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

- [vc-mode-architecture.md](./vc-mode-architecture.md) — VC projection and Butterchurn mirror in VC window
- [settings-and-persistence.md](./settings-and-persistence.md) — full settings key registry
