# Audio Topology — Intended vs Actual

**Phase 0 · Sprint 0.1** — historical; implementation complete through Phase 7.

**Doc drift resolved (Phase 8):** main is muted when VC open; transport via playback adapters; AnalyserBus replaces dual `useAudioAnalyser` wiring.

Song Pages currently runs **up to three parallel audio paths** when VC is open:

1. **Main audible `<audio>`** — HLS/direct in `ListenerMode` (muted when VC open)
2. **Main hidden mirror `<audio>`** — `useAnalyserPlaybackMirror` for FFT / visualizer
3. **VC window `<audio>`** — `useVcPlaybackAudio` — **audible during VC** (screen capture)

Widget sources (YouTube, SoundCloud, Flow) use embedded players in main and/or VC with transport IPC instead of a single `<audio>` element.

**Doc drift:** `documentation/vc-mode-architecture.md` may state main stays audible when VC is open; **code ducks main** (`audio.volume = 0` when `vc.vcOpen`). Treat code as truth; update docs in Phase 8.

---

## Element map

| Element | Location | Audible when | Purpose |
|---------|----------|--------------|---------|
| `audioRef` | ListenerMode | VC closed | Primary HLS/direct playback |
| `analyserAudioRef` | ListenerMode (hidden) | Never (volume 0) | Analyser tap for main visualizer |
| VC `playbackAudioRef` | VcWindowApp | VC open | Capture-friendly audible stream |
| YouTube iframe | Main + VC cells | scope-dependent | Widget transport |
| SoundCloud widget | Main + VC | scope-dependent | Widget transport |

---

## HLS lifecycle (main)

**Owner:** `ListenerMode.tsx`

- `hlsRef` per main `audioRef`
- `playbackGenerationRef` invalidates stale callbacks
- `playSong` attaches source, sets `activePlaybackUrl`
- On VC open: main volume → 0; orchestration still uses main element timing for some paths

**Owner:** `MediaCoordinator` (main, mirror, VC each hold an instance). Session timing still mirrored in ListenerMode React state.

---

## HLS lifecycle (VC mirror)

**Owner:** `useVcPlaybackAudio.ts` → `MediaCoordinator`

- Reloads when `songId` / `playbackUrl` change in `VcStatePayload`
- Effects via `AudioEffectsEngine` / `useVcPlaybackEffects` on VC `<audio>`

---

## Analyser mirror (main)

**Owner:** `useAnalyserPlaybackMirror` + `src/audio/graph/registry.ts`

- WeakMap: one graph per mirror element
- **Non-destructive tap** — does not route main audible output through Web Audio graph
- `useAnalyserBus` in VC manager and visualizer manager (`consumerId` distinct)

**Duplication resolved (Phase 6):** **AnalyserBus** — single subscription per mirror element via `useAnalyserBus` (`visualizer-main`, `vc-visualizer` consumers).

---

## Routing when VC opens/closes

| Phase | Main `audioRef` | VC `<audio>` | Widget players |
|-------|-----------------|--------------|----------------|
| VC closed | Audible | N/A | Main widgets if active scope |
| VC open | Muted (volume 0) | Audible + FX | Often VC surface widgets |

Transport commands dispatch via playback adapters (`vcTransportAdapter`, `keyboardAdapter`); VC players report status via `vc:sendPlaybackStatus`.

---

## Timing authority

| Source | Feeds |
|--------|-------|
| Main `<audio>` timeupdate | ListenerMode `currentTime`, VC state push |
| Widget postMessage / API | `vc:playback-status` |
| VC `<audio>` | Local VC seek bar when HLS in VC |

**Risk:** Multiple clocks during VC widget tracks. **Target:** MediaCoordinator declares **one timing source** per `mediaSource` kind; session stores canonical `currentTime`.

---

## Effects

| Layer | Today | Future |
|-------|-------|--------|
| Effects Lab intent | `ListenerMode` `effectsLab` | Session `effectsIntent` |
| VC audible FX | `useVcPlaybackEffects` | **AudioEffectsEngine** on VC element |
| Main | mostly volume duck | engine bypass when muted |

Session holds intent; engine applies on the **audible element** for current routing mode.

---

## Graceful degradation (Phase 6)

| Failure | Desired behavior |
|---------|------------------|
| HLS load error | `PLAYBACK_FAILED`, skip or pause per policy |
| Stale generation callback | ignore |
| VC audio fails, main muted | fall back to unmute main OR show error (characterize current) |
| Analyser fail | visualizer idle; playback continues |

Capture characterization tests for VC-open HLS failure before changing routing.

---

## Files to read during refactor

| File | Role |
|------|------|
| `src/listener/ListenerMode.tsx` | Main audio, HLS, ducking |
| `src/listener/directAudioPlayback.ts` | Direct vs HLS detection |
| `src/audio/hooks/useAnalyserPlaybackMirror.ts` | Mirror stream |
| `src/audio/AnalyserBus.ts`, `hooks/useAnalyserBus.ts` | FFT wiring |
| `src/audio/graph/registry.ts` | Graph per element |
| `src/vc-window/useVcPlaybackAudio.ts` | VC HLS |
| `src/vc-window/useVcPlaybackEffects.ts` | VC FX |
| `src/vc-mode/useVcModeManager.ts` | Analyser + state push |

---

## Doc updates (Phase 8)

- `documentation/audio-pipeline.md` — three-path diagram, AnalyserBus
- `documentation/vc-mode-architecture.md` — main muted when VC open
- `documentation/playback-session-architecture.md` — MediaCoordinator boundary
