# Projection Map — Authoritative vs Derived

**Phase 0 · Sprint 0.1**

Defines what is **truth in PlaybackSession** vs **computed for UI/VC**.

## PlaybackSession snapshot (target)

```ts
// Illustrative — finalized in Phase 1 contracts
type PlaybackSnapshot = {
  activeTrackId: number | null;
  playbackPhase: 'playing' | 'paused' | 'waiting-for-host';
  repeatMode: 'off' | 'one' | 'all';
  shuffle: boolean;
  currentTime: number;
  duration: number;
  primary: PrimaryContext | null;
  activeRole: 'primary' | 'interrupt' | 'on-deck';
  interrupt: InterruptState | null;
  onDeck: OnDeckState | null;
  vcActive: boolean;
  playLockEnabled: boolean;
  playLockReleaseOnNext: boolean;
  mediaSource: 'hls' | 'direct' | 'youtube' | 'soundcloud' | 'flow' | null;
  effectsIntent: EffectsIntent;
};
```

## VcStatePayload field map

| Field | Source today | Authoritative future | Derived how |
|-------|--------------|----------------------|-------------|
| `config` | VC settings + surface | **VC shell** | persisted `vc.settings` |
| `playback.currentTime` | ListenerMode + timingRef | **Session** | MediaCoordinator |
| `playback.duration` | ListenerMode | **Session** | on load |
| `playback.isPlaying` | ListenerMode `isPlaying` | **Session** | `playbackPhase === 'playing'` |
| `audioMirror.songId` | playing song | **Session** `activeTrackId` | |
| `audioMirror.playbackUrl` | resolved URL | **Session** + library resolver | |
| `audioMirror.volume` | ListenerMode volume | **Session** or settings | |
| `audioMirror.playbackEffects` | effectsLab memo | **AudioEffectsEngine** intent | |
| `currentSong` | manifest + library row | **Derived** | `buildVcSongPayload(trackId, manifest)` |
| `nextSong` | `pickNextSongId` in manager | **Derived** | queue planner from snapshot + library order |
| `upcoming` | computed list | **Derived** | same planner, N tracks |
| `hostGraphicUrl` | host assets | **VC shell** | |
| `artistName` / `bio` / `photo` | artist profile | **Derived** | library |
| `effectiveVisualizerId` | VC rotation state | **VC shell** | |
| `kudoPresets` | kudos module | **VC shell** | |
| `specialPlayPause` | `useSpecialPlayPause` | **VC presentation** | when session `playbackPhase === 'waiting-for-host'` |
| `surfaceDesigns` | saved designs | **VC shell** | |
| `playLockEnabled` | VC manager | **Session** | only when `vcActive` |
| `playLockReleaseOnNextSong` | VC manager | **Session** | |
| `lyricsSourceReady` | manifest load flag | **Derived** | manifest fetch state |

## PlayerBar / ListenerMode UI

| UI element | Reads today | Future |
|------------|-------------|--------|
| Play/pause button | `isPlaying` | `usePlaybackSnapshot().playbackPhase` |
| Seek bar | `currentTime`, `duration` | snapshot timing |
| Repeat/shuffle | local state | snapshot |
| On Deck chip | `onDeckInfo` | snapshot `onDeck` + library resolver |
| Now playing row highlight | `playingSongId` | `activeTrackId` |
| Preview row | `previewSongId` | stays local UI |

## CommandRuntimeContext

Built in `deriveCommandRuntimeContextFromVcState` from **VcStatePayload** today.

| Flag | Derived from | Future source |
|------|--------------|---------------|
| `vcModeActive` | `vcOpen` prop | VC shell |
| `hasNextSong` | `payload.nextSong` | snapshot + planner |
| `hasUpcomingSongs` | `payload.upcoming` | same |
| `hasCurrentSong` | `payload.currentSong` | `activeTrackId != null` |
| `specialPlayPauseActive` | `specialPlayPause` | `playbackPhase === 'waiting-for-host'` |
| `playLockActive` | `playLockEnabled` | session |

**Phase 5:** add `buildCommandRuntimeContextFromSnapshot(snapshot, vcShellFlags)`; deprecate VC-payload derivation for playback flags.

## buildStatePayload today (`useVcModeManager`)

Key inputs wired into projection:

- `playingSongId`, `isPlaying`, `currentTime`, `duration` from ListenerMode props
- `pickNextSongId`, `buildUpcomingSongs` callbacks
- `playLockEnabled`, `playLockReleaseOnNextSong` local state
- `specialPlayPause` from hook
- `songManifest`, `artistProfile`, `hostGraphicPopupUrl`
- `activeConfig`, `reportedVisualizerId`

**Target:** `buildVcStateFromSnapshot(session.getSnapshot(), vcContext, libraryResolver)` — VC manager only holds VC-specific fields and calls builder on `session.subscribe`.

## Events vs snapshot for history

| Event | Snapshot change | History action |
|-------|-----------------|----------------|
| `TRACK_STARTED` | activeTrackId | `recordSongHistoryStart` |
| `TRACK_COMPLETED` | advance planned | update entry completed |
| `TRACK_INTERRUPTED` | role change | partial duration |
| `PLAYBACK_FAILED` | phase paused? | interrupted / skip |
| `ON_DECK_QUEUED` | onDeck set | optional metadata |

History projector listens to events; does not read React state.
