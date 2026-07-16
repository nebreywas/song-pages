# Target Module Tree

**Phase 0 · Sprint 0.1**

Incremental layout — files appear phase-by-phase; empty folders are not created until needed.

## Application-level peers

```
Input ──────────► CommandRouter ──► PlaybackSession
                      │                  │
                      ├──► VcShell       ├──► events ──► History
                      ├──► Library       └──► snapshot ──► projections
                      └──► Audio (intent)
```

**Input** (future home; not fully extracted in Phases 1–7):

```
shared/input/                    # future — catalog, focus rules, routing types
src/input/
  InputCoordinator.ts          # focus, active window/mode, route to dispatch
  keyboard/                      # global shortcut → command (today: commandService)
  ipc/                           # controller / VC window → command
  mouse/                         # future gesture routing
```

Phase 4 `src/playback/adapters/*` are **interim bridges** until Input owns routing. They must not grow into a second input system — they call `dispatch` and nothing else.

```
shared/playback/
  commands.ts              # PlaybackCommand union + source
  events.ts                # PlaybackEvent union
  snapshot.ts              # PlaybackSnapshot types
  results.ts               # CommandResult / rejection reasons
  policies/
    playLock.ts            # move from shared/vcMode/playLock.ts
    trackEnd.ts            # wrap resolveTrackEndAdvance
    repeatShuffle.ts       # repeat/shuffle helpers
    submissionPlaylist.ts  # flags only; enforcement stays library
  queue/
    planner.ts             # migrate from shared/listener/playbackQueue.ts
  detours/
    state.ts               # migrate from shared/listener/playbackDetours.ts

src/playback/
  createPlaybackSession.ts # bootstrap — app lifetime singleton
  PlaybackSessionImpl.ts   # dispatch / getSnapshot / subscribe
  reducers/                # pure transition functions (optional split)
  adapters/                  # interim — migrate to src/input/ when Input subsystem ships
    vcTransportAdapter.ts  # vc:transport → PlaybackCommand dispatch
    keyboardAdapter.ts     # listener:playback-command → dispatch
    playerBarAdapter.ts    # thin: onClick → dispatch (no behavior in UI)
  projections/
    buildVcStateFromSnapshot.ts
    buildCommandRuntimeContext.ts
  hooks/
    usePlaybackSession.ts  # React subscribe only — not authority
    usePlaybackSnapshot.ts

src/audio/
  MediaCoordinator.ts      # load, generation, timing, element refs
  AudioEffectsEngine.ts    # DSP + routing to audible element
  AnalyserBus.ts           # single FFT tap per mirror element
  adapters/
    hlsSource.ts
    directSource.ts
    widgetSource.ts        # YT / SC / Flow status bridge

src/vc-mode/
  useVcModeManager.ts      # slim: VC config, surface, kudos, designer
  VcModeModal.tsx
  ...                      # presentation only — no playSong

src/listener/
  ListenerMode.tsx         # composition: library UI + session hook
  playlist/                # mutations (future PlaylistMutation module)
  useSpecialPlayPause.ts   # VC countdown UI only (Phase 5)

shared/listener/           # keep until migrated, then delete duplicates
  playbackQueue.ts         # → shared/playback/queue/
  playbackDetours.ts       # → shared/playback/detours/
```

## Boundary rules

| Module | May call | Must not |
|--------|----------|----------|
| **Input** (future) | read focus/mode, emit commands | execute playback, own detours |
| `PlaybackSessionImpl` | policies, queue, detours | React, IPC, DOM |
| Phase 4 adapters | session.dispatch | contain policy or behavior |
| Projections | getSnapshot, library read-only | change playback |
| `MediaCoordinator` | DOM audio, HLS | VC surface layout |
| VC shell | dispatch (via Input), projections | `playSong` implementation |
| UI components | emit intent / call adapter | execute transport logic inline |
| ListenerMode | session, library IPC | own detour refs (end state) |

## Existing assets to reuse

- `shared/listener/playbackQueue.ts` + tests
- `shared/vcMode/playLock.ts` + tests
- `shared/listener/playbackDetours.ts`
- `shared/commands/runtimeContext.ts` + tests
- `src/listener/directAudioPlayback.ts`

## Files slated for deletion (Phase 7)

- `vcTransportHandlersRef` block in ListenerMode
- `playLockRef` sync in ListenerMode
- Duplicate `pickNextSongId` in useVcModeManager (keep planner in shared)
- Direct `detoursRef` mutation outside session
- Legacy `useListenerPlaybackCommands` switch if fully adapterized
