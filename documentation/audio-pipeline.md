# Audio Pipeline Architecture

Song Pages is a **desktop audio application**. Playback, visualizers, playback effects, and screen-share capture (Discord, OBS, Twitch) all depend on a deliberately split audio architecture. This document is the canonical reference for that pipeline, the macOS/Discord capture incident we debugged, bugs we hit along the way, and engineering rules for future work.

**Related docs:**

- [visualizer-architecture.md](./visualizer-architecture.md) — experience registry, IPC projection, Butterchurn
- [vc-mode-architecture.md](./vc-mode-architecture.md) — VC window layout, VC-specific mirror, designer
- [design-and-vision.md](./design-and-vision.md) — product context (capture-aware playback)

---

## Core requirement

> **Users must hear music locally, see visualizers react to it, and — when sharing a window — remote participants must hear the same music when the platform supports application/window audio capture.**

That sounds simple. In practice it conflicts with:

1. **Web Audio** — `createMediaElementSource()` hijacks an `<audio>` element; once hijacked, output routing changes for the lifetime of that element.
2. **Chromium on macOS** — HTML media often plays in a separate **Audio Service** process; Discord window capture hooks the **window owner's PID**, not the audio utility process → video with silence.
3. **Chromium quirks** — `muted=true` or `volume=0` on a media element can stop audio reaching `MediaElementSource` even when the graph looks healthy (FFT flat, no errors).
4. **Platform permissions** — macOS Screen & System Audio Recording, Discord experimental capture, Electron vs packaged app in permission lists.
5. **Dual use** — the same playback must feed native speakers (for Discord on the main window), FFT (for visualizers), and optional FX (bass boost / lo-fi) without breaking each other.

We treat audio as **tier‑0 infrastructure**, not a feature bolt-on. Regressions here block streaming, VC Mode, and the core listening experience.

---

## High-level architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        Listener window (main)                          │
│                                                                          │
│  ┌──────────────────────┐         ┌──────────────────────┐              │
│  │  main <audio>        │         │  mirror <audio>       │              │
│  │  (audible player)    │         │  (hidden, HLS dup)    │              │
│  │                      │         │                       │              │
│  │  Native output path  │         │  Web Audio graph ONLY │              │
│  │  — Discord capture   │         │  — FFT / visualizers  │              │
│  │    when FX off       │         │  — FX when bass/lo-fi │              │
│  └──────────▲───────────┘         └──────────▲───────────┘              │
│             │                                │                           │
│             │ HLS (primary)                  │ HLS (mirror)              │
│             │                                │                           │
│  usePlaybackEffects ──ducks main when FX──► speakerGain on graph        │
│  useAudioAnalyser ─────────────────────────► AnalyserNode                 │
│  useVisualizerFrameLoop / IPC sender ─────► projection window FFT       │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  VC window (separate BrowserWindow)                                      │
│  Plain <audio> + HLS — no Web Audio graph on VC element                 │
│  Used when sharing the VC window specifically                            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  Electron main process                                                   │
│  macOS: disable AudioServiceOutOfProcess (keep audio in browser PID)     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Design invariant (2026 refactor)

| Element | Role | Web Audio? | Audible when |
|---------|------|------------|--------------|
| **Main `<audio>`** | Primary HLS player; timing source | **Never** | Always (except FX-on ducking) |
| **Mirror `<audio>`** | Duplicate HLS for analysis/FX | **Yes** (`createMediaElementSource`) | FX on only (`speakerGain=1`); silent in tap mode (`speakerGain=0`) |
| **VC `<audio>`** | Capture target for VC window share | **No** | VC window open; main stays audible for main-window share |

**Why two elements in the main window?**  
A single element cannot both stay on Chromium's native capturable path *and* feed a permanent Web Audio graph. Splitting playback (main) from analysis/FX (mirror) preserves Discord capture on the main window when effects are off.

---

## Module layout (`src/audio/`)

Audio is a **first-class module**, not scattered one-offs. Visualizer-specific IPC stays in `src/visualizers/`; VC window playback stays in `src/vc-window/`.

```text
src/audio/
  index.ts                 — public barrel exports
  constants.ts             — FFT_SIZE, effect tuning, smoke thresholds
  types.ts                 — AudioGraph, ButterchurnAudioSettings, etc.
  graph/
    buildGraph.ts          — buildAudioGraphFromSource, applyPlaybackEffects (pure + Web Audio)
    registry.ts            — WeakMap, getOrCreate* (mirror element lifecycle)
    mirrorElement.ts       — ensureMirrorElementFeedsGraph (Chromium mute fix)
    analyserSmoke.ts       — runOscillatorAnalyserSmoke (CI)
    *.test.ts
  analysis/
    frequencyBins.ts       — measureFrequencyBins (FFT stats)
    snapshotElement.ts     — snapshotAudioElement (debug panel)
    frequencyBins.test.ts
  hooks/
    useAudioAnalyser.ts    — attach graph to mirror ref
    useAnalyserPlaybackMirror.ts — duplicate HLS on mirror
    usePlaybackEffects.ts  — bass boost / lo-fi
  debug/
    types.ts, audioDebug.ts, AudioDebugPanel.tsx, useAudioDebugReporter.ts

Legacy re-export shims (deprecated — import from `src/audio`):
  src/visualizers/audioGraph.ts
  src/listener/usePlaybackEffects.ts
  src/visualizers/debug/*
```

**Not in `src/audio/` (by design):**

| Path | Why separate |
|------|----------------|
| `src/visualizers/useVisualizerStream.ts` | Visualizer projection IPC, not core playback |
| `src/vc-window/useVcPlaybackAudio.ts` | VC BrowserWindow capture mirror |
| `electron/main.js` | Process-level Chromium flags |

---

## Module map (file reference)

| Concern | Path |
|---------|------|
| Public API | `src/audio/index.ts` |
| Web Audio graph | `src/audio/graph/registry.ts`, `buildGraph.ts` |
| Analyser hook | `src/audio/hooks/useAudioAnalyser.ts` |
| Mirror HLS sync | `src/audio/hooks/useAnalyserPlaybackMirror.ts` |
| Bass boost / lo-fi | `src/audio/hooks/usePlaybackEffects.ts` |
| Visualizer session | `src/visualizers/useVisualizerManager.ts` |
| Projection IPC | `src/visualizers/useVisualizerStream.ts` |
| Audio debug | `src/audio/debug/*` |
| Listener wiring | `src/listener/ListenerMode.tsx` |
| VC mirror audio | `src/vc-window/useVcPlaybackAudio.ts` |
| Electron audio flag | `electron/main.js` |
| Background throttling off | `electron/main.js`, `electron/visualizerWindow.js` |

---

## Electron: process-level audio

### `AudioServiceOutOfProcess` (macOS)

```javascript
// electron/main.js — darwin only
app.commandLine.appendSwitch('disable-features', 'AudioServiceOutOfProcess');
```

**Problem:** Chromium's out-of-process audio service plays media outside the renderer/BrowserWindow PID. Discord's **window capture** on macOS attaches to the window owner → **video yes, audio no**.

**Fix:** Force media audio into the browser process so window capture includes it.

**Reference:** [Chromium issue 40273019](https://issues.chromium.org/issues/40273019) (application audio + OOP audio).

### `backgroundThrottling: false`

Main and visualizer windows set `backgroundThrottling: false` so `setInterval`-based FFT polling and IPC frame send continue when another window (projection, VC) has focus.

### `userData` path pin

Unrelated to audio routing but caused false "data loss" scares during testing: `app.setPath('userData', …/song-pages)` keeps SQLite/subscriptions stable when display name changes.

---

## Main playback

- **Element:** `<audio ref={audioRef}>` in `ListenerMode.tsx` — no `crossOrigin`, no Web Audio.
- **Source:** HLS via `hls.js` (or native HLS on Safari/WebKit builds).
- **Volume:** User volume slider applies to `main.volume` when FX are off.
- **Capture:** This is the path Discord should capture when sharing the **main Song Pages window** with FX **off**.

---

## Mirror playback (hidden analyser element)

- **Element:** `<audio ref={analyserAudioRef} class="listener-analyser-audio">` — hidden, not in UI.
- **Source:** Duplicate HLS load of the same `activePlaybackUrl` via `useAnalyserPlaybackMirror`.
- **Sync:** Polls + `play`/`pause`/`seeking` listeners; re-seeks if drift &gt; 0.4s from main.
- **Enabled when** (`analyserMirrorEnabled` in `ListenerMode.tsx`):

  ```text
  (canVisualize && activeSession !== 'none')
  OR (windowOpen && projectionMode === 'visualizer' && canVisualize)
  OR vc.analyserEnabled
  OR bassBoost OR lofi
  ```

- **Pre-graph silence:** HTML `muted=true` only until Web Audio attaches (avoid double audible HLS).
- **Post-graph:** `ensureMirrorElementFeedsGraph()` sets `muted=false`, `volume=1`. Audible silence in tap mode comes from **`speakerGain.gain = 0`**, not HTML mute.

### Chromium warning: muted mirror = flat FFT

If the mirror stays `muted=true` or `volume=0` while `MediaElementSource` is connected, the debug panel shows:

- Graph attached ✓  
- Context running ✓  
- Mirror playing ✓  
- **peak bin = 0** (silent analyser)

This matches [Web Audio / HTMLMediaElement interaction](https://github.com/WebAudio/web-audio-api-v2/issues/104): recent Chromium builds stop feeding the element when muted. **Never use HTML mute to silence a Web Audio–tapped element.**

---

## Web Audio graph (`audioGraph.ts`)

One graph per mirror `<audio>` element (WeakMap). `createMediaElementSource` may only be called **once per element** for the app lifetime.

### Signal chain

```text
MediaElementSource
  → bassFilter (lowshelf)
  → lofiLowpass
  → lofiDrive (waveshaper)
  → AnalyserNode (FFT_SIZE 2048)
  → speakerGain → AudioContext.destination

Parallel (Butterchurn only):
  lofiDrive → sensitivity → bassEmphasis → butterchurnTap
```

### Tap mode (default — visualizers, FFT only)

- `speakerGain.gain = 0` — graph pulls samples (analyser works) but mirror is inaudible.
- Main element remains the only audible native path → **best for Discord main-window share**.

### Playback mode (bass boost / lo-fi)

- `getOrCreatePlaybackGraph()` raises `speakerGain.gain = 1`.
- `usePlaybackEffects` sets `main.volume = 0` — you hear FX via mirror Web Audio only.
- **Discord main-window capture likely silent while FX on** (main ducked). Turn FX off before streaming.

### `tryCreateAnalyserTap` (captureStream)

Legacy/alternate path using `captureStream()` + `MediaStreamSource` without hijacking the element. **Not used for the mirror** after the 2026 refactor — mirror uses `getOrCreateAnalyserGraph` exclusively for stable FFT.

---

## Visualizers

See [visualizer-architecture.md](./visualizer-architecture.md) for experiences and IPC.

**Embedded:** `useAudioAnalyser` → `useVisualizerFrameLoop` → canvas components (e.g. Spectrum bars).

**Projection window:** Main window sends FFT via IPC (`useVisualizerIpcSender`); projection window has **no** local analyser. Frames sent as `Uint8Array` copies (~60 Hz). Receiver stall &gt; 500ms triggers debug warning.

**Session gating:** Analyser enabled when `playingSong != null` and active session is `main-embedded` or `external-projection`.

---

## Playback effects

| FX off | FX on (bass boost or lo-fi) |
|--------|----------------------------|
| Main audible at user volume | Main `volume = 0` (ducked) |
| Mirror graph in tap mode | Mirror graph in playback mode |
| Mirror inaudible (`speakerGain=0`) | Mirror audible through Web Audio |
| Visualizers work | Visualizers work (mirror must stay unmuted for FFT) |
| **Preferred for Discord main-window share** | Local FX preview only; capture unreliable |

Bass boost and lo-fi are mutually exclusive in the UI.

---

## VC Mode audio (separate window)

VC uses a **third** playback path: plain `<audio>` in the VC BrowserWindow (`useVcPlaybackAudio`), driven by `state.audioMirror` over IPC. No Web Audio on that element.

**When to share which window:**

| Share target | Audio source | FX heard? |
|--------------|--------------|-----------|
| Main Listener window, FX off | Main native `<audio>` | No |
| Main Listener window, FX on | Mirror Web Audio (main ducked) | Yes locally; capture uncertain |
| VC window | VC `<audio>` HLS mirror | No (clean HLS) |

Current VC architecture keeps **main audible** when VC is open (no main mute) so hosts can share the main window for Discord without silencing themselves locally. See [vc-mode-architecture.md](./vc-mode-architecture.md) for VC-specific checklist.

---

## Incident: Discord window capture silent (macOS)

### Symptoms

- Music audible locally in Song Pages.
- Discord **window share** of Song Pages: video fine, **no music** for remote participants.
- Browser tabs and other apps worked in Discord — app-specific.

### What we changed in Song Pages (code)

| Change | Intent | Confidence it helped |
|--------|--------|----------------------|
| **`AudioServiceOutOfProcess` disabled** on macOS | Keep HTML audio in capturable process | **High** — root cause for Electron+Discord on Mac |
| **Split main vs mirror `<audio>`** | Stop `createMediaElementSource` on the audible player | **High** — Web Audio hijack was breaking native capture |
| **Removed VC main-window mute** | Main stays audible when VC closed / main-window share | Medium — fixed local silence, not Discord-specific |
| **`userData` path pin** | Stable DB during testing | None for audio — avoided false regression scares |
| **Mirror `crossOrigin` removed** | Match main HLS load behavior | Medium for mirror load; not Discord-specific |
| **Mirror unmute after graph attach** | Fix flat FFT / silent analyser | **High** for visualizers; indirect for Discord |
| **IPC `Uint8Array` instead of `Array.from`** | Projection visualizer performance | None for Discord |

### What we changed outside the app (environment)

These were documented during debugging and **may have contributed** independently of code:

- macOS **Screen & System Audio Recording** — enable for Discord **and** Electron (dev) / Song Pages (packaged).
- Discord **Voice & Video → Screen Share → experimental application audio capture**.
- Fully quit Discord (Cmd+Q) after permission changes.
- Share **window**, not entire screen; enable **Share computer audio** in Discord.
- macOS 13+ for application audio in Discord.

### Honest attribution

**It was likely both.** The Electron OOP-audio flag and main/mirror split address real architectural bugs. macOS/Discord permissions and experimental capture address platform gaps we cannot fix in code alone.

**We cannot prove** which change fixed a given user's session without A/B testing (old build + new permissions vs new build + old permissions). Treat Discord capture as **environment-sensitive** until we have automated capture smoke tests.

### Warning for the team

> Do not declare Discord/audio "fixed" based on one successful share. Re-test after Electron upgrades, macOS updates, and any change touching `<audio>`, Web Audio, volume, mute, or process flags.

---

## Bug log (2026 audio/visualizer sprint)

| Bug | Symptom | Root cause | Fix |
|-----|---------|------------|-----|
| Analyser prop mismatch | Crash opening embedded visualizer | `useVisualizerManager` passed `analyserAudioRef` key instead of `audioRef` | Correct prop name |
| Stale graph retry | Blank visualizer after toggle | Retry stopped when graph existed in WeakMap but React never got `setAnalyser` | Publish existing graph regardless of `readyState`; keep polling |
| Mirror `crossOrigin` | Mirror HLS failed to load while main played | CORS requirement on mirror only | Remove `crossOrigin`; load like main |
| Mirror muted + graph | Graph healthy, FFT all zeros | Chromium stops MediaElementSource when element muted | `ensureMirrorElementFeedsGraph()`; silence via `speakerGain` |
| IPC `Array.from` | Projection bars start then stop | Main thread / IPC choke at 60fps × 1024 ints | Send `new Uint8Array(scratch)` |
| False "rollback" | Empty library | New `userData` folder from `app.setName` | Pin `userData` to `song-pages` |

---

## Debug tooling

Built-in **Audio debug panel** (dev default on):

- **Toggle:** `Ctrl/Cmd+Alt+A` or Debug menu → Toggle Audio Debug Panel
- **Console:** `[audio:…]` prefixed logs when logging enabled
- **Disable logs:** `localStorage.setItem('songpages:audio-debug', '0')`
- **Hide panel:** `localStorage.setItem('songpages:audio-debug-panel', '0')`

Panel surfaces: main/mirror state, graph mode, FFT peak/avg, IPC send/receive rates, stall alerts, recent event log.

**Use this first** for any "silent analyser", "visualizer blank", or "projection frozen" report.

---

## Engineering rules (A++ audio)

1. **Never call `createMediaElementSource` on the main audible `<audio>`.** Only the mirror element.
2. **Never set `muted=true` or `volume=0` on an element with an active Web Audio graph.** Use `speakerGain`.
3. **One graph per mirror element per session.** Do not call `releaseAudioGraph` casually — `createMediaElementSource` is one-shot.
4. **Keep `AudioServiceOutOfProcess` disabled on macOS** unless Chromium/Electron docs explicitly say otherwise and Discord capture is re-verified.
5. **Document capture impact** in PR description for any PR touching audio, mute, volume, Web Audio, or Electron webPreferences.
6. **Test matrix minimum** before merging audio changes:
   - Play/pause/seek/skip
   - Embedded visualizer + projection visualizer
   - FX on/off (local listen)
   - Discord main-window share, FX off (manual until automated)
7. **Prefer observable diagnostics** over silent failures — log graph attach, mirror sync, IPC stall.

---

## Testing checklists

### Local playback

- [ ] Song plays; volume slider works (FX off)
- [ ] Skip/previous/seek stay in sync
- [ ] Embedded Spectrum shows moving bars
- [ ] Projection window Spectrum shows moving bars
- [ ] Bass boost / lo-fi audible when enabled; main ducked
- [ ] FX off restores main volume; visualizers still work
- [ ] Audio debug: peak bin &gt; 0 while playing with visualizer open

### Discord (main window, FX off)

- [ ] macOS permissions + Discord experimental capture configured
- [ ] Share **Song Pages** main window (not entire screen)
- [ ] **Share computer audio** enabled in Discord
- [ ] Remote participants hear music
- [ ] Visualizer open does not silence capture (mirror uses `speakerGain=0`)

### VC window (if sharing VC)

- [ ] VC window `<audio>` advancing (DevTools)
- [ ] Share **Song Pages — VC Mode** window
- [ ] Remote participants hear music

---

## Known limitations

- **FX + Discord main-window share** — not a supported combination; main is ducked.
- **No automated capture tests** — Discord/OBS behavior is manual.
- **Chromium version coupling** — Electron upgrades may change mute/MediaElementSource behavior; re-run debug panel checks.
- **Butterchurn** — WebGL on main; projection uses canvas JPEG mirror (see visualizer doc).
- **`webSecurity: false`** — required for CDN HLS; separate security tradeoff (see security doc).

---

## Future work

- [x] Unit tests: FFT stats, mirror unmute, FX params, tap wiring (`src/audio/**/*.test.ts`)
- [x] Oscillator smoke helper (`runOscillatorAnalyserSmoke`) — skips in plain Node; run in browser/Electron devtools or future Electron test harness
- [ ] CI Web Audio smoke on every PR (needs Electron test runner or native AudioContext in CI)
- [ ] Capture verification doc with recorded OBS/Discord version matrix
- [ ] Consider lazy mirror load vs always-on mirror when playing (latency vs complexity)
- [ ] Packaged app icon in macOS privacy list (not just Electron.app in dev)

---

## Changelog (doc)

| Date | Notes |
|------|-------|
| 2026-07 | Initial doc after main/mirror split, Discord debugging, audio debug panel, Chromium mute fix |
