# Playback Refactor — Final Report

**Completed:** July 2026 · **Phases:** 0–8  
**Parent plan:** [../ImprovedSongPages-sprint](../ImprovedSongPages-sprint)

---

## Executive summary

The Playback Session refactor is **complete**. Song Pages now has:

- A **framework-independent** `PlaybackSession` (commands, snapshots, events)
- **Transport adapters** (VC, keyboard, play lock, player bar) that only call `dispatch`
- **Snapshot projections** for VC state and command availability
- **Audio rationalization** (`MediaCoordinator`, `AnalyserBus`, `AudioEffectsEngine`)
- **Legacy shim deletion** — canonical imports only

Behavior was preserved throughout; user signed off casual testing. Effects edge cases under multi-HLS remain a **separate bug-fix backlog** pending unit-tested repros.

---

## Architecture (as shipped)

```text
Input (VC / keyboard / player bar)
  → transport adapters
  → PlaybackSessionImpl.dispatch
  → effects → ListenerMode (media execution)
  → snapshot → projections → vc:sendState

Audio:
  Main <audio>     — MediaCoordinator (timing + HLS)
  Mirror <audio>   — MediaCoordinator + AnalyserBus (FFT)
  VC <audio>       — MediaCoordinator + AudioEffectsEngine (capture + FX)
```

**Canonical docs (read these first):**

| Doc | Purpose |
|-----|---------|
| [playback-session-architecture.md](../playback-session-architecture.md) | Session, adapters, projections |
| [audio-pipeline.md](../audio-pipeline.md) | Three-path audio, capture, AnalyserBus |
| [vc-mode-architecture.md](../vc-mode-architecture.md) | VC window, main muted when VC open |

**Historical map (Phase 0):** [README.md](./README.md) — inventory reports; some rows describe pre-refactor state.

---

## Codebase metrics

### Largest source files (post-refactor)

| File | Lines | Role |
|------|------:|------|
| `src/listener/ListenerMode.tsx` | **3,625** | Still the main composition site — library UI + `playSong` orchestration |
| `src/vc-mode/useVcModeManager.ts` | 846 | VC shell; snapshot-driven (down from duplicate queue/timing props) |
| `src/playback/PlaybackSessionImpl.ts` | 387 | Authoritative session |
| `src/listener/usePlaybackTransportAdapters.ts` | 197 | IPC bootstrap |
| `src/audio/AnalyserBus.ts` | 204 | Shared FFT tap |
| `src/audio/adapters/attachPlaybackSource.ts` | 140 | Shared HLS loader |
| `src/audio/MediaCoordinator.ts` | 113 | Per-element media lifecycle |
| `src/listener/playbackSessionEffects.ts` | 111 | Effect executor |
| `src/audio/AudioEffectsEngine.ts` | 79 | FX routing |

### What spread out

| Area | ~Lines | Files | Notes |
|------|-------:|------:|-------|
| `shared/playback/` | 3,329 | 33 | Pure policies, queue, detours, types |
| `src/playback/` (incl. adapters, projections, harness) | ~1,100+ | 20+ | Session impl, adapters, tests |
| New audio core (coordinator, bus, FX engine, attach) | ~583 | 5 | Phase 6 extraction |
| Transport + effects wiring | ~308 | 2 | `usePlaybackTransportAdapters`, `playbackSessionEffects` |

### ListenerMode size

`ListenerMode.tsx` remains **~3,600 lines** — the refactor **extracted policy and wiring** rather than shrinking this file materially. `playSong`, widget transport, and library UI still live here. That was intentional (infrastructure-only scope).

**Grep checkpoints (Phase 7):**

| Pattern | `src/` status |
|---------|---------------|
| `vcTransportHandlersRef` | Removed |
| `playLockRef` | Removed |
| `useListenerPlaybackCommands` | Removed |
| `detoursRef` | Read-only alias to session (deferred trim) |
| `playSongRef` | Still used for circular orchestration callbacks |

---

## Phase completion

| Phase | Outcome |
|-------|---------|
| 0 | Inventory reports in `playback-refactor/` |
| 1–2 | `shared/playback/` contracts + policies |
| 3 | `PlaybackSessionImpl` + harness (B1–B6) |
| 4 | Transport adapters; play-lock IPC moved |
| 5 | VC projections from snapshot |
| 6 | MediaCoordinator, AnalyserBus, AudioEffectsEngine |
| 7 | Shim deletion; import canonicalization |
| 8 | Architecture doc alignment (this report) |

---

## TODOs (your backlog)

### High — when you have repros

- [ ] **Effects / multi-HLS bugs** — supply unit-tested repros; likely interaction between main, mirror, and VC `MediaCoordinator` instances + `AudioEffectsEngine` routing
- [ ] Add harness or integration tests for FX routing paths (VC open vs closed, Effects Lab on/off)

### Medium — structural follow-up (optional)

- [ ] **Extract `playSong`** from `ListenerMode` into a dedicated module (e.g. `src/listener/playbackOrchestrator.ts`) — target: ListenerMode as composition only
- [ ] Remove `playSongRef` / `detoursRef` indirection once orchestrator is stable
- [ ] **Session-owned timing** — MediaCoordinator events → session `currentTime` (today main element still feeds React state in ListenerMode)
- [ ] Move `playbackQueue.test.ts` import path note into `shared/playback/queue/` when convenient

### Low — polish

- [ ] Full **Phase 0 smoke on packaged build** (not only dev)
- [ ] OBS/screen capture with Effects Lab (Phase 6 item 4 — deferred)
- [ ] Deprecate `useAudioAnalyser` entirely once all callers use `useAnalyserBus` with explicit `consumerId`
- [ ] Consider single shared `MediaCoordinator` registry if effects desync proves to be duplicate-load related

---

## Suggested refinements & optimizations

1. **Effects debugging** — Add `audioDebug` events when `AudioEffectsEngine` switches routing mode (main-mirror vs VC audible) to trace multi-HLS issues faster.

2. **Load deduplication** — Main and mirror coordinators load the same URL independently. A shared `PlaybackSourceCache` (generation + URL keyed) could reduce duplicate HLS instances if bandwidth/sync issues appear.

3. **ListenerMode decomposition** — Split into `useListenerLibrary`, `useListenerPlaybackOrchestration`, `ListenerPlaybackChrome` — incremental, one PR per slice.

4. **Input subsystem** — Phase 0 planned `src/input/` to own focus + routing; adapters in `src/playback/adapters/` are interim bridges. Migrate when command surface stabilizes.

5. **Tier B harness** — Extend with media mock for B7–B8 in full CI; wire `PLAYBACK_FAILED` effect path.

6. **Projection tests** — Expand `buildVcStateFromSnapshot.test.ts` for `audioMirror.playbackEffects` slices when fixing FX bugs.

---

## Documentation map (post–Phase 8)

| Read for current behavior | Historical / planning |
|---------------------------|------------------------|
| `playback-session-architecture.md` | `playback-refactor/01-state-ownership-inventory.md` |
| `audio-pipeline.md` | `playback-refactor/05-audio-topology.md` |
| `vc-mode-architecture.md` | `playback-refactor/04-projection-map.md` |
| `playback-refactor/FINAL-REPORT.md` (this file) | `playback-refactor/08-extraction-plan.md` |
| `playback-refactor/SPRINT-GUIDE.md` | Phase checklists for future regressions |

Phase 0 reports in `playback-refactor/` are marked **historical** where drift was resolved; they remain useful for “why we chose X” context.

---

## Automated tests

```bash
npm test -- --run src/playback/ src/audio/MediaCoordinator.test.ts shared/playback/
```

Tier B harness: `src/playback/PlaybackSession.harness.test.ts`  
Projection: `src/playback/projections/buildVcStateFromSnapshot.test.ts`

Full `npm test` may include pre-existing unrelated failures (VC content resolution, YouTube parse).

---

## Sign-off summary

| Area | Status |
|------|--------|
| Playback session + adapters | Signed off |
| VC projections | Signed off |
| Audio rationalization | Signed off (OBS capture deferred) |
| Shim deletion | Signed off |
| Casual manual testing | No unexpected behaviors |
| Effects edge cases | Deferred — awaiting repros |

**The refactor infrastructure track is done.** Remaining work is product bugs (effects), optional ListenerMode slimming, and release smoke.
