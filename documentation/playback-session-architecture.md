# Playback Session Architecture

**Status:** Phases 1–7 complete · **Last updated:** July 2026  
**Canonical decisions:** [playback-refactor/00-locked-decisions.md](./playback-refactor/00-locked-decisions.md)

## Overview

Playback truth lives in a framework-independent **PlaybackSession** (`dispatch`, `getSnapshot`, `subscribe`). React and Electron windows consume snapshots and dispatch commands; they do not own queue, detours, or transport policy.

## Module layout

```
shared/playback/           # policies, queue, detours (pure)
src/playback/
  PlaybackSessionImpl.ts   # authoritative session
  effects.ts               # side-effect vocabulary
  adapters/
    playerBarAdapter.ts
    vcTransportAdapter.ts
    keyboardAdapter.ts
    playLockAdapter.ts
  projections/
    buildVcStateFromSnapshot.ts
    buildVcQueueProjection.ts
    buildCommandRuntimeContextFromSnapshot.ts
    projectSpecialPlayPause.ts
  testing/                 # harness for Tier B tests
src/audio/
  MediaCoordinator.ts      # HLS/direct attach per <audio> element
  AudioEffectsEngine.ts    # FX routing (main mirror vs VC audible)
  AnalyserBus.ts           # single FFT graph per mirror element
src/listener/
  usePlaybackTransportAdapters.ts  # IPC bootstrap (VC, keyboard, play lock)
  ListenerMode.tsx         # composition + library UI (playSong still here — deferred trim)
```

## Command flow

```
VC surface / Controller / Keyboard / PlayerBar
  → transport adapter
  → session.dispatch({ type, source })
  → PlaybackSessionImpl (policy)
  → effects → ListenerMode executes media (MediaCoordinator for HLS)
  → snapshot → buildVcStateFromSnapshot → vc:sendState
```

> Input generates commands. UI does not execute behavior.

## Snapshot

`PlaybackSnapshot` is authoritative for transport timing, phase, queue prefs, play lock, and detours. `useVcModeManager` subscribes via `usePlaybackSnapshot` and projects VC payload slices.

## Completed phases

| Phase | Change |
|-------|--------|
| 1–2 | Contracts + policy centralization in `shared/playback/` |
| 3 | `PlaybackSessionImpl` owns detours, play lock, phase |
| 4 | Transport adapters (`vcTransport`, keyboard, play lock) |
| 5 | VC/command projections from snapshot |
| 6 | `MediaCoordinator`, `AnalyserBus`, `AudioEffectsEngine` |
| 7 | Shim deletion; imports canonicalized |

## Deferred (post-refactor, not blocking)

- `playSong` body extraction from `ListenerMode` (still ~large orchestration site)
- Effects edge cases under multi-HLS — fix when user supplies unit-tested repros
- Full Phase 0 smoke on packaged build

## Related docs

- [Audio pipeline](./audio-pipeline.md) — three-path audio, AnalyserBus, capture
- [VC mode architecture](./vc-mode-architecture.md) — projections, main muted when VC open
- [Command inventory](./playback-refactor/02-command-inventory.md)
- [Sprint guide](./playback-refactor/SPRINT-GUIDE.md)
