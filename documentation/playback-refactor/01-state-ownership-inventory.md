# State Ownership Inventory

**Phase 0 · Sprint 0.1** — **Historical.** Current ownership: [playback-session-architecture.md](../playback-session-architecture.md).  
Legend: **Freq** = typical update rate · **Persist** = survives app restart

## Summary matrix

| Domain | Current owner(s) | Duplicates / refs | Future owner | Persist |
|--------|------------------|-------------------|--------------|---------|
| Active track | `ListenerMode` useState + refs | `playingSongRowRef`, `playingSongIdRef` | **PlaybackSession** | last-playback key |
| Preview selection | `ListenerMode` | `previewSongId` | **ListenerMode** (UI) | — |
| Queue / playlist rows | `ListenerMode` `songs` | `sortedSongsRef` | **ListenerMode** (library) | SQLite |
| Queue order at play time | `ListenerMode` `sortedSongs` memo | — | **Session** reads snapshot from library at decision time | — |
| Queue cursor / anchor | `detoursRef.primary` | `queueAnchorSongId` derived | **PlaybackSession** | session only |
| Playback role | `detoursRef.activeRole` | — | **PlaybackSession** | session only |
| Position / duration | `ListenerMode` useState | `timingRef` in VC manager | **PlaybackSession** (timing slice) | — |
| Pause / playing | `ListenerMode` `isPlaying` | widget vs HLS divergence | **PlaybackSession** `playbackPhase` | — |
| Repeat / shuffle | `ListenerMode` useState | — | **PlaybackSession** (intent) | TBD settings key |
| Detours (primary) | `detoursRef` | — | **PlaybackSession** | session only |
| Interrupt (play-now) | `detoursRef` + `interruptReturnSongRef` | — | **PlaybackSession** | session only |
| On Deck | `detoursRef` + `onDeckSongRef` + `onDeckInfo` state | — | **PlaybackSession** + thin UI mirror | session only |
| Play Lock | `useVcModeManager` + `playLockRef` in ListenerMode | enforcement scattered | **PlaybackSession** (`vcActive` policy) | session only, clear on VC exit |
| Release on next song | `useVcModeManager` + ref | — | **PlaybackSession** (with play lock) | session only |
| Between-song wait | `useSpecialPlayPause` state | blocks advance in ListenerMode | **Session** `playbackPhase: waiting-for-host`; VC owns countdown | session only |
| VC open | `useVcModeManager` `vcOpen` | — | **VC shell** | — |
| VC config | `useVcModeManager` `activeConfig` | `activeConfigRef` | **VC shell** + settings | `vc.settings` |
| Submission playlist id | `VcModeConfig.defaultSubmissionPlaylistId` | — | **VC config** (persisted) | `vc.settings` |
| Widget capture flags | `ListenerMode` derived | `vcYoutubeCaptureActive` etc. | **Session** source adapter state | session only |
| Effects intent | `ListenerMode` `effectsLab` | `vcPlaybackEffects` memo | **AudioEffectsEngine** + snapshot | settings keys |
| Analyser / FFT | `useVcModeManager` + `useVisualizerManager` | two `useAudioAnalyser` on same element | **AnalyserBus** | — |
| Song history rows | SQLite via IPC | `activeHistoryEntryIdRef` | **History projector** on session events | SQLite |
| VC session skips | `ListenerMode` `vcSessionSkippedIds` | — | **VC shell** or session policy flag | session only |

---

## Durable session state (target snapshot)

| Field | Current | Future | Freq | Persist |
|-------|---------|--------|------|---------|
| `activeTrackId` | `playingSongId` | PlaybackSession | on track change | optional last-playback |
| `activeTrackRow` | `playingSongRowRef` | Session or resolver from library | on track change | no |
| `playbackPhase` | `isPlaying` + special pause | `'playing' \| 'paused' \| 'waiting-for-host'` | on transport | no |
| `repeatMode` | `repeatMode` | Session | rare | settings |
| `shuffle` | `shuffle` | Session | rare | settings |
| `primaryContext` | `detoursRef.primary` | Session | on play/detour | no |
| `activeRole` | `detoursRef.activeRole` | Session | on detour | no |
| `interrupt` | `detoursRef.interrupt` | Session | play-now | no |
| `onDeck` | `detoursRef.onDeck` | Session | on deck queue | no |
| `vcActive` | `vc.vcOpen` | VC shell → session flag | on VC toggle | no |
| `playLockEnabled` | `useVcModeManager` | Session (only when `vcActive`) | on toggle | no |
| `playLockReleaseOnNext` | `useVcModeManager` | Session | on toggle | no |
| `sessionSkippedIds` | `vcSessionSkippedIds` | VC/session policy | during VC | no |
| `mediaGeneration` | `playbackGenerationRef` | Session | per load | no |

## Timing state (target snapshot slice)

| Field | Current | Future | Freq |
|-------|---------|--------|------|
| `currentTime` | `ListenerMode` + widgets | Session / MediaCoordinator | 250ms–1s |
| `duration` | `ListenerMode` | Session / MediaCoordinator | on load |
| `buffered` | not explicit | MediaCoordinator | optional |

## High-frequency (not in session snapshot)

| Field | Current | Future | Freq |
|-------|---------|--------|------|
| FFT bins | `useAudioAnalyser` | AnalyserBus | ~60fps |
| Canvas mirror JPEG | `canvasMirrorFrame` in VC manager | AnalyserBus / visualizer | ~60fps |

---

## ListenerMode — playback-related state today

### useState (transport & queue prefs)

- `playingSongId`, `previewSongId`, `isPlaying`, `currentTime`, `duration`
- `shuffle`, `repeatMode`, `volume`, `activePlaybackUrl`
- `vcSessionSkippedIds`
- `onDeckInfo` (UI mirror of detour on-deck)

### useRef (orchestration)

- `detoursRef`, `interruptReturnSongRef`, `onDeckSongRef`
- `audioRef`, `analyserAudioRef`, `hlsRef`
- `playbackGenerationRef`, `pageAccessGenerationRef`
- `suppressPlaybackEndedRef`, `advancingFromEndedRef`
- `playingSongIdRef`, `playingSongRowRef`
- `playSongRef`, `playNextRef`, `vcTransportHandlersRef`
- `handleTrackNaturalEndRef`, `handleDetourPlaybackFailureRef`
- `playLockRef` (synced from VC manager)

### Library (stays in ListenerMode)

- `artists`, `songs`, `selectedArtistId`, `sortColumn`, `customOrderIds`, etc.

---

## useVcModeManager — state today

| State | Purpose | Future owner |
|-------|---------|--------------|
| `vcOpen`, `modalOpen` | VC lifecycle | VC shell |
| `playLockEnabled`, `playLockReleaseOnNextSong` | Host safety | **PlaybackSession** |
| `activeConfig` | VC settings + surface | VC shell |
| `songManifest`, `artistProfile` | Content resolution | VC projection builder |
| `canvasMirrorFrame` | Butterchurn mirror | AnalyserBus / visualizer |
| `reportedVisualizerId` | VC vs main visualizer sync | VC shell |
| `specialPlayPause` input | from `useSpecialPlayPause` | Session phase + VC presentation |

---

## useSpecialPlayPause

| State | Future |
|-------|--------|
| `specialPlayPause` (active, endsAt, secondsRemaining) | **Remove from playback path** — session sets `waiting-for-host`; VC reads phase and runs countdown UI locally or via VC-only timer that dispatches `PLAY_NEXT` |

---

## Duplication hotspots (delete in Phase 7)

1. **Play Lock** — flag in VC manager, enforcement in ListenerMode, toggle via 3 IPC paths  
2. **Next song preview** — computed in `useVcModeManager` and `ListenerMode` `pickNextSongId`  
3. **Timing** — `ListenerMode` state + VC `timingRef` + widget timing via transport  
4. **Analyser** — dual `useAudioAnalyser` when VC + visualizer both enabled  
5. **Transport handlers** — `vcTransportHandlersRef` duplicates closures updated each render  

---

## Persistence map

| Key / store | Contents | Future owner |
|-------------|----------|--------------|
| `listener:last-playback` | artist + song id | Session bootstrap hint |
| `vc.settings` | VC config incl. submission playlist | VC shell |
| SQLite song history | history entries | Event projector |
| Playlist custom order | per playlist key | Library layer |
| Command mappings | shortcuts | Command service (unchanged) |
| Effects lab settings | effect preset | AudioEffectsEngine / settings |
