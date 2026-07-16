# IPC Inventory — Playback & VC

**Phase 0 · Sprint 0.1**

## Playback-relevant channels

### Main renderer ← command service

| Channel | Direction | Payload | Handler | Future |
|---------|-----------|---------|---------|--------|
| `listener:playback-command` | main ← commandService | `{ type, ... }` from `MAIN_PLAYBACK_BY_COMMAND` | `usePlaybackTransportAdapters` → `keyboardAdapter` | **Migrated Phase 4** |
| `listener:submission-playlist-updated` | main ← ipc | `playlistId` | refresh library | unchanged (library) |

### VC state fan-out (main → VC + controller)

| Channel | Direction | Payload | Notes |
|---------|-----------|---------|-------|
| `vc:sendState` | main → ipc | `VcStatePayload` | Built in `useVcModeManager.buildStatePayload` |
| `vc:state` | ipc → VC window + controller | same | **Replace with snapshot subscription + projection** |

### VC transport (VC window → main)

| Channel | Direction | Payload | Handler |
|---------|-----------|---------|---------|
| `vc:sendTransport` | VC → ipc → main | `VcTransportAction` | `usePlaybackTransportAdapters` → `vcTransportAdapter` |
| `vc:transport` | relay to main | same | **Migrated Phase 4** |

### VC playback status (VC → main)

| Channel | Direction | Payload | Purpose |
|---------|-----------|---------|---------|
| `vc:sendPlaybackStatus` | VC → ipc | timing / widget state | Sync widget players with main orchestration |
| `vc:playback-status` | relay to main | same | |

### Play Lock (controller / shortcuts → main)

| Channel | Direction | Handler |
|---------|-----------|---------|
| `vc:togglePlayLock` | controller → main | `usePlaybackTransportAdapters` → `playLockAdapter` |
| `vc:toggle-play-lock` | ipc relay | **Migrated Phase 4** |
| `vc:togglePlayLockReleaseOnNext` | controller | `playLockAdapter` |
| `vc:toggle-play-lock-release-on-next` | relay | **Migrated Phase 4** |
| `vc:setPlayLockReleaseOnNext` | controller (1 Song button) | `playLockAdapter` |
| `vc:set-play-lock-release-on-next` | relay | **Migrated Phase 4** |

Command service also sends `vc:toggle-play-lock` for `toggle-play-lock` catalog entry.

### VC lifecycle

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `vc:open` / `vc:close` | invoke | Window management |
| `vc:opened` / `vc:closed` | event to main | Sync `vcOpen` |
| `vc:request-sync` | VC opened → main | Push fresh state |

### VC presentation (not PlaybackSession)

| Channel | Purpose | Future owner |
|---------|---------|--------------|
| `vc:sendFrame` / `vc:frame` | Butterchurn mirror JPEG | Visualizer / AnalyserBus |
| `vc:updateSurface` / `vc:surface-patch` | Designer live edit | VC shell |
| `vc:commitSurface` / `vc:surface-commit` | Save surface | VC shell |
| `vc:hotkey` | Overlays, ALARE, kudos | VC shell |
| `vc:requestVisualizerRotate` / `vc:visualizer-rotate-request` | Rotate visualizer | VC shell |
| `vc:reportActiveVisualizer` / `vc:active-visualizer` | VC reports active viz | VC shell |
| `vc:syncActiveVisualizer` / `vc:sync-active-visualizer` | Main → VC viz sync | VC shell |
| `vc:switchSurface` / `vc:switch-surface` | Controller design picker | VC shell |
| `vc:projection-window-changed` | Projection bounds | VC shell |
| `vc:notifySubmissionPlaylistUpdated` | After paste intake | library refresh |

### Song history (persistence)

| Channel | Purpose | Future |
|---------|---------|--------|
| `listener:recordSongHistoryStart` | Start entry on play | **Session event → projector** |
| `listener:updateSongHistoryEntry` | Complete / interrupt | same |
| `listener:listSongHistory` | UI | unchanged |
| `listener:clearSongHistory` | UI | unchanged |

### Visualizer (orthogonal but couples to audio)

| Channel | Notes |
|---------|-------|
| `visualizer:open` / `close` / `sendConfig` / `sendFrame` | Separate window; shares analyser path |

---

## Data flow diagram (today)

```
Controller / Shortcuts
        │
        ▼
 commandService.js ──listener:playback-command──► ListenerMode
        │                                              │
        └──vc:toggle-play-lock────────────────► useVcModeManager
                                                       │
 VC Window ◄──vc:state── ipc ◄──vc:sendState──────────┘
     │
     └──vc:sendTransport──► ipc ──► usePlaybackTransportAdapters (vcTransportAdapter)
```

## Target data flow (Phases 4–5)

```
All surfaces ──► PlaybackCommand ──► PlaybackSession
                        │
                        ├──► events ──► History projector
                        │
                        └──► snapshot ──► buildVcStateFromSnapshot ──► VC IPC (thin)
```

## Deletion candidates (Phase 7)

- ~~`vcTransportHandlersRef` pattern~~ → migrated Phase 4 (`vcTransportAdapter`)
- Duplicate play-lock IPC paths if session exposes policy in snapshot and controller dispatches commands to main via one channel
- `listener:playback-command` shape → align with `PlaybackCommand` union (may keep channel name)

## Risk notes

1. **Ordering:** `vc:sendState` at ~200ms + immediate pushes on play-lock change — projection must coalesce or subscribe to session.
2. **Widget timing:** `vc:playback-status` can arrive faster than state push — session should own authoritative timing.
3. **Dev reload:** Cmd+R clears in-memory play lock and session — document as dev-only (not packaged).
